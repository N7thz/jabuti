/**
 * Sincroniza dados da Câmara dos Deputados com o Postgres.
 *
 *   bun scripts/sync-camara.ts [--desde AAAA-MM-DD] [--ate AAAA-MM-DD]
 *     [--so deputados,votacoes,orientacoes,eventos,despesas,proposicoes] [--limite-deputados N] [--dry-run]
 *
 * Padrão: últimos 30 dias, todas as etapas. Com --dry-run não abre conexão com o banco:
 * busca e mapeia de verdade e imprime contagens e 2 exemplos por etapa.
 */
import { createCamaraClient } from "../lib/camara/client";
import {
  sincronizarDeputados,
  sincronizarDespesas,
  sincronizarEventos,
  sincronizarOrientacoes,
  sincronizarProposicoes,
  sincronizarVotacoes,
  type Contexto,
  type Resultado,
} from "../lib/camara/sync";
import { createPrisma } from "../lib/prisma";
import { registrarSync } from "../lib/sync/run";

const ETAPAS = ["deputados", "votacoes", "orientacoes", "eventos", "despesas", "proposicoes"] as const;
type Etapa = (typeof ETAPAS)[number];

const DIA = 24 * 60 * 60 * 1000;
const hoje = () => new Date().toISOString().slice(0, 10);

function lerArgumentos(argv: string[]) {
  const valores = new Map<string, string>();
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg.startsWith("--")) {
      const valor = argv[++i];
      if (valor === undefined || valor.startsWith("--")) throw new Error(`Faltou o valor de ${arg}.`);
      valores.set(arg.slice(2), valor);
    } else {
      throw new Error(`Argumento desconhecido: ${arg}`);
    }
  }

  const conhecidos = new Set(["desde", "ate", "so", "limite-deputados"]);
  for (const chave of valores.keys()) {
    if (!conhecidos.has(chave)) throw new Error(`Opção desconhecida: --${chave}`);
  }

  const ate = valores.get("ate") ?? hoje();
  const desde = valores.get("desde") ?? new Date(Date.parse(`${ate}T00:00:00Z`) - 30 * DIA).toISOString().slice(0, 10);
  for (const data of [desde, ate]) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(Date.parse(data))) {
      throw new Error(`Data inválida: ${data} (use AAAA-MM-DD).`);
    }
  }
  if (desde > ate) throw new Error("--desde não pode ser depois de --ate.");

  const so = valores.get("so")?.split(",").map((e) => e.trim()).filter(Boolean);
  const invalidas = so?.filter((e) => !ETAPAS.includes(e as Etapa));
  if (invalidas?.length) throw new Error(`Etapas inválidas: ${invalidas.join(", ")}. Use: ${ETAPAS.join(", ")}.`);

  const limite = valores.get("limite-deputados");
  const limiteDeputados = limite ? Number(limite) : undefined;
  if (limite && !(Number.isInteger(limiteDeputados) && limiteDeputados! > 0)) {
    throw new Error("--limite-deputados deve ser um inteiro positivo.");
  }

  return { desde, ate, dryRun, limiteDeputados, etapas: (so as Etapa[] | undefined) ?? [...ETAPAS] };
}

async function main() {
  const { desde, ate, dryRun, limiteDeputados, etapas } = lerArgumentos(process.argv.slice(2));
  const prisma = dryRun ? null : createPrisma();
  const inicio = Date.now();

  const execucoes: Record<Etapa, { escopo: string; rodar: (c: Contexto) => Promise<Resultado> }> = {
    deputados: { escopo: "deputados", rodar: (c) => sincronizarDeputados(c) },
    votacoes: { escopo: `votacoes:${desde}..${ate}`, rodar: (c) => sincronizarVotacoes(c, desde, ate) },
    orientacoes: { escopo: `orientacoes:${desde}..${ate}`, rodar: (c) => sincronizarOrientacoes(c, desde, ate) },
    eventos: { escopo: `eventos:${desde}..${ate}`, rodar: (c) => sincronizarEventos(c, desde, ate) },
    despesas: { escopo: `despesas:${desde}..${ate}`, rodar: (c) => sincronizarDespesas(c, desde, ate) },
    proposicoes: { escopo: `proposicoes:${desde}..${ate}`, rodar: (c) => sincronizarProposicoes(c, desde, ate) },
  };

  console.log(`Câmara: ${desde} a ${ate}, etapas ${etapas.join(", ")}${dryRun ? " (dry-run, sem banco)" : ""}`);

  const erros: string[] = [];

  try {
    for (const etapa of etapas) {
      const { escopo, rodar } = execucoes[etapa];
      const contexto: Contexto = {
        api: createCamaraClient({ minIntervalMs: 150 }),
        prisma,
        limiteDeputados,
        log: (mensagem) => console.log(`[${etapa}] ${mensagem}`),
      };

      console.log(`\n== ${etapa} ==`);
      try {
        let resultado: Resultado | undefined;
        if (prisma) {
          await registrarSync(prisma, "CAMARA", escopo, async () => {
            resultado = await rodar(contexto);
            return resultado.registros;
          });
        } else {
          resultado = await rodar(contexto);
        }

        console.log(`${etapa}: ${resultado?.registros ?? 0} registros${dryRun ? " (não gravados)" : ""}`);
        if (dryRun && resultado) {
          console.log(`Exemplos mapeados (${etapa}):`);
          console.log(JSON.stringify(resultado.exemplos, null, 2));
        }
      } catch (error) {
        // Uma etapa com erro não impede as seguintes; o erro já ficou em SyncRun.
        erros.push(`${etapa}: ${String(error)}`);
        console.error(`${etapa}: ERRO ${String(error)}`);
      }
    }
  } finally {
    await prisma?.$disconnect();
  }

  console.log(`\nConcluído em ${Math.round((Date.now() - inicio) / 1000)}s.`);
  if (erros.length > 0) {
    console.error(`Etapas com erro:\n${erros.join("\n")}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
