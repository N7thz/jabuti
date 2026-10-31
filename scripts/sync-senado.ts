/**
 * Sincroniza dados do Senado (API de Dados Abertos + CEAPS) para o banco.
 * Uso: bun scripts/sync-senado.ts [--desde AAAA-MM-DD] [--ate AAAA-MM-DD]
 *        [--so senadores,votacoes,orientacoes,eventos,despesas,materias] [--dry-run]
 * Padrão: últimos 30 dias, todas as etapas. Despesas sincronizam os anos inteiros do intervalo.
 * --dry-run não conecta ao banco: busca e mapeia de verdade e imprime contagens e exemplos.
 */
import { parseArgs } from "node:util";

import { formatarReais, reais, somar } from "@/lib/format/dinheiro";
import type { PrismaClient } from "@/lib/prisma";
import { createSenadoClient } from "@/lib/senado/client";
import { mapearComparecimento, siglaConhecida } from "@/lib/senado/mapear";
import {
  buscarDespesas,
  buscarMaterias,
  buscarSenadores,
  gravarDespesas,
  gravarEventos,
  gravarMaterias,
  gravarOrientacoes,
  gravarSenadores,
  gravarVotacoes,
  mapearEventos,
  mapearOrientacoes,
  mapearVotacoes,
} from "@/lib/senado/sync";
import type { VotacaoPlenario } from "@/lib/senado/types";
import { registrarSync } from "@/lib/sync/run";

const ETAPAS = ["senadores", "votacoes", "orientacoes", "eventos", "despesas", "materias"] as const;
type Etapa = (typeof ETAPAS)[number];

const { values } = parseArgs({
  options: {
    desde: { type: "string" },
    ate: { type: "string" },
    so: { type: "string" },
    "dry-run": { type: "boolean", default: false },
  },
});

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const hoje = iso(new Date());
const ate = values.ate ?? hoje;
const desde = values.desde ?? iso(new Date(Date.parse(`${ate}T00:00:00Z`) - 30 * 86_400_000));

if (!DATA.test(desde) || !DATA.test(ate) || desde > ate) {
  console.error(`Intervalo inválido: --desde ${desde} --ate ${ate} (formato AAAA-MM-DD)`);
  process.exit(1);
}

const pedidas = values.so ? values.so.split(",").map((s) => s.trim()) : [...ETAPAS];
const invalidas = pedidas.filter((e) => !ETAPAS.includes(e as Etapa));
if (invalidas.length > 0) {
  console.error(`Etapa(s) desconhecida(s): ${invalidas.join(", ")}. Use: ${ETAPAS.join(",")}`);
  process.exit(1);
}
const etapas = new Set(pedidas as Etapa[]);
const dryRun = values["dry-run"];
const intervalo = `${desde}..${ate}`;
const anos = Array.from(
  { length: Number(ate.slice(0, 4)) - Number(desde.slice(0, 4)) + 1 },
  (_, i) => Number(desde.slice(0, 4)) + i,
);

const client = createSenadoClient({ minIntervalMs: 250 });

// Votações e senadores servem a mais de uma etapa: busca uma vez só.
let votacoesCache: Promise<VotacaoPlenario[]> | undefined;
const votacoes = () => (votacoesCache ??= client.votacoes(desde, ate));
let senadoresCache: ReturnType<typeof buscarSenadores> | undefined;
const senadores = () => (senadoresCache ??= buscarSenadores(client, hoje));

function exemplos(titulo: string, itens: unknown[]) {
  console.log(`  ${titulo}: ${itens.length}`);
  for (const item of itens.slice(0, 2)) console.log(JSON.stringify(item, null, 2).replace(/^/gm, "    "));
}

function contarSiglas(lista: VotacaoPlenario[]) {
  const contagem = new Map<string, number>();
  for (const v of lista) {
    for (const voto of v.votos) {
      const chave = voto.descricao ? `${voto.sigla} (${voto.descricao})` : voto.sigla;
      contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
    }
  }
  console.log("  Siglas de voto encontradas -> TipoVoto / presença:");
  for (const [chave, n] of [...contagem].sort((a, b) => b[1] - a[1])) {
    const sigla = chave.replace(/ \(.*\)$/, "");
    const { tipo, presenca } = mapearComparecimento(sigla);
    const aviso = siglaConhecida(sigla) ? "" : "  <- SIGLA DESCONHECIDA, revisar mapear.ts";
    console.log(`    ${String(n).padStart(5)}  ${chave} -> ${tipo} / ${presenca ?? "não conta"}${aviso}`);
  }
}

interface Passo<D> {
  etapa: Etapa;
  escopo: string;
  buscar: () => Promise<D>;
  resumir: (dados: D) => void;
  gravar: (prisma: PrismaClient, dados: D) => Promise<number>;
}

function passo<D>(p: Passo<D>) {
  return p;
}

const passos = [
  passo({
    etapa: "senadores",
    escopo: "senadores",
    buscar: senadores,
    resumir: (d) => {
      console.log(`  legislatura ${d.legislatura}; em exercício: ${d.atuais.length}`);
      exemplos("senadores (atuais + legislatura)", d.senadores);
    },
    gravar: gravarSenadores,
  }),
  passo({
    etapa: "votacoes",
    escopo: `votacoes:${intervalo}`,
    buscar: async () => ({ bruto: await votacoes(), mapeado: mapearVotacoes(await votacoes()) }),
    resumir: ({ bruto, mapeado }) => {
      exemplos(
        "votações (exemplo sem a lista de votos)",
        mapeado.votacoes.map((v) => ({ ...v, votos: `${v.votos.length} votos`, exemplosVotos: v.votos.slice(0, 2) })),
      );
      console.log(`  votos: ${mapeado.votacoes.reduce((n, v) => n + v.votos.length, 0)}`);
      console.log(`  proposições ligadas: ${new Set(mapeado.votacoes.map((v) => v.proposicao?.idExterno).filter(Boolean)).size}`);
      contarSiglas(bruto);
    },
    gravar: (prisma, d) => gravarVotacoes(prisma, d.mapeado),
  }),
  passo({
    etapa: "orientacoes",
    escopo: `orientacoes:${intervalo}`,
    buscar: async () => mapearOrientacoes(await votacoes(), await client.orientacoesBancada(desde, ate)),
    resumir: (d) => {
      console.log(`  votações com orientação: ${d.length}; orientações: ${d.reduce((n, v) => n + v.orientacoes.length, 0)}`);
      exemplos("orientações", d.map((v) => ({ ...v, orientacoes: v.orientacoes.slice(0, 4) })));
    },
    gravar: gravarOrientacoes,
  }),
  passo({
    etapa: "eventos",
    escopo: `eventos:${intervalo}`,
    buscar: async () =>
      mapearEventos(await client.sessoesPlenario(desde, ate), await client.reunioesComissoes(desde, ate), await votacoes()),
    resumir: (d) => {
      const plenario = d.eventos.filter((e) => e.evento.orgaoSigla === "PLEN");
      console.log(`  sessões do plenário: ${plenario.length}; reuniões de comissão: ${d.eventos.length - plenario.length}`);
      exemplos(
        "eventos (presenças resumidas)",
        [...d.eventos.filter((e) => e.presencas), ...d.eventos.filter((e) => !e.presencas)].map((e) => ({
          ...e,
          presencas: e.presencas ? `${e.presencas.length} registros` : null,
          exemplosPresencas: e.presencas?.filter((p) => p.situacao !== "PRESENTE").slice(0, 2),
        })),
      );
      const porSituacao = new Map<string, number>();
      for (const p of d.eventos.flatMap((e) => e.presencas ?? [])) {
        porSituacao.set(p.situacao, (porSituacao.get(p.situacao) ?? 0) + 1);
      }
      console.log(`  presenças por situação: ${JSON.stringify(Object.fromEntries(porSituacao))}`);
    },
    gravar: gravarEventos,
  }),
  passo({
    etapa: "despesas",
    escopo: `despesas:${anos.join(",")}`,
    buscar: () => buscarDespesas(client, anos),
    resumir: (porAno) => {
      for (const { ano, itens } of porAno) {
        const total = somar(itens.map((i) => reais(i.despesa.valorLiquido)));
        console.log(
          `  ${ano}: ${itens.length} lançamentos, ${new Set(itens.map((i) => i.codSenador)).size} senadores, ` +
            formatarReais(total),
        );
      }
      exemplos("despesas", porAno.flatMap((a) => a.itens));
    },
    gravar: (prisma, d) => gravarDespesas(prisma, client, d),
  }),
  passo({
    etapa: "materias",
    escopo: `materias:${intervalo}`,
    buscar: async () => buscarMaterias(client, (await senadores()).atuais, desde, ate),
    resumir: (materias) => {
      const autorias = materias.flatMap((m) => m.autores);
      console.log(`  autorias: ${autorias.length} (proponente: ${autorias.filter((a) => a.proponente).length})`);
      exemplos("matérias", materias);
    },
    gravar: gravarMaterias,
  }),
].filter((p) => etapas.has(p.etapa));

console.log(`Senado ${intervalo}${dryRun ? " (dry-run, sem banco)" : ""}: ${[...etapas].join(", ")}`);

if (dryRun) {
  for (const p of passos) {
    console.log(`\n[${p.etapa}]`);
    const inicio = Date.now();
    // Cada passo tem seu próprio tipo de dados; o cast só une buscar e resumir do mesmo passo.
    const { buscar, resumir } = p as Passo<unknown>;
    resumir(await buscar());
    console.log(`  (${((Date.now() - inicio) / 1000).toFixed(1)}s)`);
  }
} else {
  const { createPrisma } = await import("@/lib/prisma");
  const prisma = createPrisma();
  try {
    for (const p of passos) {
      const { buscar, gravar } = p as Passo<unknown>;
      const registros = await registrarSync(prisma, "SENADO", p.escopo, async () => gravar(prisma, await buscar()));
      console.log(`[${p.etapa}] ${registros} registros gravados`);
    }
  } finally {
    await prisma.$disconnect();
  }
}
