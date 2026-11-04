/**
 * Sincroniza os deputados federais e senadores eleitos numa eleição geral (TSE, consulta_cand_<ano>_BRASIL.csv),
 * inclusive quem ainda não é parlamentar, e liga cada um ao parlamentar já sincronizado (CPF ou nome + UF).
 * Uso: bun scripts/sync-eleitos.ts [--ano 2026] [--dry-run]
 * Rode depois de sync-camara e sync-senado. Quem deixar de constar como eleito no ano é apagado (o TSE corrige).
 * --dry-run lê os parlamentares do banco, mas não grava: imprime contagens e exemplos (sem CPF).
 */
import { parseArgs } from "node:util";

import { Uf } from "@/lib/generated/prisma/enums";
import { createPrisma } from "@/lib/prisma";
import { registrarSync } from "@/lib/sync/run";
import { createTseClient } from "@/lib/tse/client";
import { casarEleitos, filtrarEleitos, gravarEleitos, type EleitoCasado } from "@/lib/tse/eleitos";
import { carregarAlvos } from "@/lib/tse/sync";

const { values } = parseArgs({
  options: {
    ano: { type: "string", default: "2026" },
    "dry-run": { type: "boolean", default: false },
  },
});

const ano = Number(values.ano);
if (!Number.isInteger(ano) || ano < 1994 || ano % 4 !== 2) {
  console.error(`Ano inválido (eleição geral, ex.: 2022, 2026): ${values.ano}`);
  process.exit(1);
}
const dryRun = values["dry-run"];

function resumir(eleitos: EleitoCasado[], casaDe: Map<string, string>) {
  for (const casa of ["CAMARA", "SENADO"] as const) {
    const daCasa = eleitos.filter((e) => e.casa === casa);
    const porCpf = daCasa.filter((e) => e.casouPor === "cpf").length;
    const porNome = daCasa.filter((e) => e.casouPor === "nome").length;
    const porResultado = Map.groupBy(daCasa, (e) => e.resultado);
    console.log(
      `  ${casa}: ${daCasa.length} eleitos (${[...porResultado].map(([r, l]) => `${r} ${l.length}`).join(", ")}); ` +
        `casaram com parlamentar ${porCpf + porNome} (${porCpf} por CPF, ${porNome} por nome), novos ${daCasa.length - porCpf - porNome}`,
    );
    // Só campos públicos: o CPF nunca vai para o log.
    for (const e of daCasa.slice(0, 3)) {
      console.log(`    ${e.nomeUrna} (${e.partido}-${e.uf}, nº ${e.numero}, ${e.resultado}) → ${e.parlamentarId ?? "novo"}`);
    }
  }
  const trocaram = eleitos.filter((e) => e.parlamentarId && casaDe.get(e.parlamentarId) !== e.casa);
  if (trocaram.length > 0) console.log(`  eleitos para a outra Casa: ${trocaram.map((e) => `${e.nomeUrna}-${e.uf} → ${e.casa}`).join(", ")}`);
}

console.log(`Eleitos ${ano}${dryRun ? " (dry-run, sem gravar)" : ""}`);

const prisma = createPrisma({ dono: true });
const client = createTseClient();
try {
  const job = async () => {
    const eleitos = await filtrarEleitos(await client.linhas("candidatos", ano, "BRASIL"), ano);
    // Todos os parlamentares já sincronizados, em exercício ou não, das duas Casas.
    const alvos = await carregarAlvos(prisma, Object.values(Uf), { todos: true });
    // A Câmara às vezes falha no /deputados/{id}: esse deputado fica sem CPF e só casa por nome + UF.
    const semCpf = alvos.filter((a) => a.casa === "CAMARA" && !a.cpf).length;
    console.log(
      `${eleitos.length} eleitos no TSE; ${alvos.length} parlamentares no banco para casar` +
        (semCpf ? ` (${semCpf} deputado(s) sem CPF da Câmara: casam por nome)` : ""),
    );
    const casados = casarEleitos(eleitos, alvos);
    resumir(casados, new Map(alvos.map((a) => [a.id, a.casa])));
    if (dryRun) return 0;
    const { gravados, apagados } = await gravarEleitos(prisma, ano, casados);
    if (apagados > 0) console.log(`  ${apagados} eleito(s) que deixaram de constar foram apagados`);
    return gravados;
  };
  if (dryRun) await job();
  else console.log(`${await registrarSync(prisma, "TSE", `eleitos:${ano}`, job)} eleitos gravados`);
} finally {
  await prisma.$disconnect();
}
