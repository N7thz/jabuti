/**
 * Sincroniza as emendas parlamentares do Portal da Transparência.
 * Uso: bun scripts/sync-emendas.ts [--ano 2025] [--anos 2020-2025] [--max-paginas N] [--dry-run]
 * Pré-requisito (fora do dry-run): bun scripts/sync-municipios.ts
 */
import { parseArgs } from "node:util";

import { criarIndiceMunicipios, interpretarLocalidade, pareceMunicipioOuUf } from "@/lib/emendas/localidade";
import { buscarMunicipiosIbge } from "@/lib/emendas/municipios";
import {
  buscarEmendasAno,
  converterEmendas,
  carregarIndiceMunicipios,
  sincronizarEmendasAno,
  vincularAutores,
  type EmendaRegistro,
} from "@/lib/emendas/sync";
import { createPrisma } from "@/lib/prisma";
import { registrarSync } from "@/lib/sync/run";

const { values } = parseArgs({
  options: {
    ano: { type: "string" },
    anos: { type: "string" },
    "max-paginas": { type: "string" },
    "dry-run": { type: "boolean", default: false },
  },
});

function lerAnos(): number[] {
  if (values.anos) {
    const [inicio, fim = inicio] = values.anos.split("-").map(Number);
    if (!Number.isInteger(inicio) || !Number.isInteger(fim) || fim < inicio) {
      throw new Error(`--anos inválido: "${values.anos}" (use ex.: 2020-2025)`);
    }
    return Array.from({ length: fim - inicio + 1 }, (_, i) => inicio + i);
  }
  const ano = values.ano ? Number(values.ano) : new Date().getFullYear();
  if (!Number.isInteger(ano)) throw new Error(`--ano inválido: "${values.ano}"`);
  return [ano];
}

const anos = lerAnos();
const maxPaginas = values["max-paginas"] ? Number(values["max-paginas"]) : Infinity;
const progresso = (ano: number) => (pagina: number, total: number) => {
  if (pagina % 25 === 0) console.log(`  ${ano}: página ${pagina}, ${total} linhas`);
};

const pct = (n: number, total: number) => (total ? `${((100 * n) / total).toFixed(1)}%` : "-");

function relatorio(registros: EmendaRegistro[], linhasApi: number) {
  const porAbrangencia = new Map<string, number>();
  const naoReconhecidos = new Map<string, number>();
  let formatoMunUf = 0;
  let reconhecidosMunUf = 0;

  for (const r of registros) {
    porAbrangencia.set(r.abrangencia, (porAbrangencia.get(r.abrangencia) ?? 0) + 1);
    if (pareceMunicipioOuUf(r.localidadeOriginal)) {
      formatoMunUf++;
      if (r.abrangencia === "MUNICIPIO" || r.abrangencia === "ESTADO") reconhecidosMunUf++;
    }
    if (r.abrangencia === "NAO_INFORMADA") {
      const texto = r.localidadeOriginal ?? "<vazio>";
      naoReconhecidos.set(texto, (naoReconhecidos.get(texto) ?? 0) + 1);
    }
  }

  const reconhecidos = registros.length - (porAbrangencia.get("NAO_INFORMADA") ?? 0);
  console.log(`Linhas da API: ${linhasApi} → emendas (após deduplicar): ${registros.length}`);
  console.log("Por abrangência:");
  for (const [abrangencia, n] of [...porAbrangencia].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${abrangencia.padEnd(14)} ${String(n).padStart(6)}  ${pct(n, registros.length)}`);
  }
  console.log(`Localidade reconhecida (qualquer abrangência): ${pct(reconhecidos, registros.length)}`);
  console.log(
    `Formato município/UF reconhecido: ${reconhecidosMunUf}/${formatoMunUf} (${pct(reconhecidosMunUf, formatoMunUf)})`,
  );
  console.log("Top 10 textos não reconhecidos (NAO_INFORMADA):");
  for (const [texto, n] of [...naoReconhecidos].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`  ${String(n).padStart(5)}  ${texto}`);
  }
  console.log("Exemplos mapeados:");
  const exemplos = ["MUNICIPIO", "ESTADO", "NACIONAL"]
    .map((a) => registros.find((r) => r.abrangencia === a))
    .filter((r) => r !== undefined);
  for (const r of exemplos) {
    console.log(
      `  "${r.localidadeOriginal}" → ${r.abrangencia} uf=${r.uf ?? "-"} ibge=${r.municipioIbge ?? "-"}` +
        ` | ${r.autorNome} | pago R$ ${r.valorPago}`,
    );
  }
}

if (values["dry-run"]) {
  // Dry-run: não conecta ao banco; o índice de municípios vem direto do IBGE.
  const indice = criarIndiceMunicipios(await buscarMunicipiosIbge());
  for (const ano of anos) {
    console.log(`\n== ${ano} (dry-run${Number.isFinite(maxPaginas) ? `, até ${maxPaginas} páginas` : ""}) ==`);
    const { emendas, completo } = await buscarEmendasAno(ano, { maxPaginas, onPagina: progresso(ano) });
    console.log(`Busca ${completo ? "completa" : "parcial"}.`);
    relatorio(converterEmendas(emendas, ano, indice), emendas.length);
  }
  // Sanidade do interpretador com um caso conhecido.
  console.assert(interpretarLocalidade("CAMPINAS - SP", indice).municipioIbge === 3509502);
} else {
  const prisma = createPrisma();
  try {
    const indice = await carregarIndiceMunicipios(prisma);
    for (const ano of anos) {
      console.log(`\n== ${ano} ==`);
      const registros = await registrarSync(prisma, "EMENDAS", String(ano), () =>
        sincronizarEmendasAno(prisma, ano, { maxPaginas, indice, onPagina: progresso(ano) }),
      );
      console.log(`${ano}: ${registros} emendas gravadas.`);
    }
    console.log(`Autores vinculados a parlamentares: ${await vincularAutores(prisma)} emendas atualizadas.`);
  } finally {
    await prisma.$disconnect();
  }
}
