import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { anoCorrente, inicioDaLegislaturaDoAno } from "@/lib/anos";
import { db } from "@/lib/db";
import { linkParlamentar, linkVotacao, type CasaUrl } from "@/lib/votacoes/queries";

import { letraDoVoto, type MatrizVotos, type ParlamentarNaMatriz, type VotacaoEscolhida } from "./calculo";

// Quais votações entram no "Como eu votaria" e como cada parlamentar votou nelas. O critério é objetivo
// e está explicado na página (ver CRITERIO): ninguém escolhe à mão quais votações "importam".

export const MAXIMO_DE_VOTACOES = 15;

/** Tipos de proposição que mudam a lei: emenda à Constituição, projetos de lei, medida provisória e decreto legislativo. */
export const TIPOS_DE_PROPOSICAO = ["PEC", "PL", "PLP", "MPV", "PLV", "PDL"] as const;

/** Votações de procedimento (urgência, adiamento, retirada de pauta) não dizem o que se pensa do projeto. */
const PROCEDIMENTO = /requerimento|urg[eê]ncia|adiamento|retirada de pauta|encerramento da discuss/i;

/** Destaques e emendas soltas: na mesma proposição, preferimos a votação do texto principal. */
const PARTE_DO_TEXTO = /\b(da|a) emenda\b|destacad|\bdvs\b/i;

const rotulo = (p: { siglaTipo: string; numero: number; ano: number }) => `${p.siglaTipo} ${p.numero}/${p.ano}`;

/**
 * Até 15 votações nominais do plenário da legislatura atual, uma por proposição, das que tiveram mais
 * votos registrados, e a posição de cada parlamentar em cada uma. Vem da nossa cópia do banco,
 * atualizada uma vez por dia (a API da Câmara não tem "votos de um deputado").
 */
export async function getMatriz(casa: CasaUrl): Promise<MatrizVotos> {
  "use cache";
  cacheLife("hours");
  cacheTag("votacoes");

  const casaDb = casa === "camara" ? "CAMARA" : "SENADO";
  const desde = new Date(`${inicioDaLegislaturaDoAno(anoCorrente())}-02-01T00:00:00Z`);

  const candidatas = await db.votacao.findMany({
    where: {
      casa: casaDb,
      orgaoSigla: "PLEN",
      data: { gte: desde },
      votos: { some: { tipo: { in: ["SIM", "NAO", "ABSTENCAO"] } } },
      proposicao: { siglaTipo: { in: [...TIPOS_DE_PROPOSICAO] } },
    },
    select: {
      id: true,
      idExterno: true,
      data: true,
      descricao: true,
      resultado: true,
      proposicaoId: true,
      proposicao: { select: { siglaTipo: true, numero: true, ano: true, ementa: true } },
      _count: { select: { votos: true } },
    },
    orderBy: [{ votos: { _count: "desc" } }, { data: "desc" }],
    take: 200,
  });

  // Uma por proposição: a do texto principal, com mais votos; no empate, a mais recente (o 2º turno da PEC).
  const porProposicao = new Map<string, (typeof candidatas)[number]>();
  const peso = (v: (typeof candidatas)[number]) => [PARTE_DO_TEXTO.test(v.descricao) ? 0 : 1, v._count.votos, v.data.getTime()];
  for (const v of candidatas) {
    if (!v.proposicao || !v.proposicaoId || PROCEDIMENTO.test(v.descricao)) continue;
    const atual = porProposicao.get(v.proposicaoId);
    if (!atual) {
      porProposicao.set(v.proposicaoId, v);
      continue;
    }
    const [a, b] = [peso(v), peso(atual)];
    const melhor = a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
    if (melhor > 0) porProposicao.set(v.proposicaoId, v);
  }

  const escolhidas = [...porProposicao.values()]
    .sort((a, b) => b._count.votos - a._count.votos || b.data.getTime() - a.data.getTime())
    .slice(0, MAXIMO_DE_VOTACOES)
    // Na tela, da mais recente para a mais antiga.
    .sort((a, b) => b.data.getTime() - a.data.getTime());

  const votacoes: VotacaoEscolhida[] = escolhidas.map((v) => ({
    id: v.idExterno,
    data: v.data.toISOString().slice(0, 10),
    proposicao: rotulo(v.proposicao!),
    ementa: v.proposicao!.ementa,
    descricao: v.descricao,
    resultado: v.resultado,
    href: linkVotacao(casa, v.idExterno),
  }));

  const votos = await db.voto.findMany({
    where: { votacaoId: { in: escolhidas.map((v) => v.id) } },
    select: {
      votacaoId: true,
      tipo: true,
      parlamentar: { select: { idExterno: true, nome: true, partido: true, uf: true } },
    },
  });

  const posicao = new Map(escolhidas.map((v, i) => [v.id, i]));
  const parlamentares = new Map<string, ParlamentarNaMatriz & { letras: string[] }>();
  for (const voto of votos) {
    const p = voto.parlamentar;
    const linha = parlamentares.get(p.idExterno) ?? {
      chave: `${casa}-${p.idExterno}`,
      nome: p.nome,
      partido: p.partido,
      uf: p.uf,
      perfil: linkParlamentar(casaDb, p.idExterno),
      posicoes: "",
      letras: Array.from({ length: escolhidas.length }, () => "-"),
    };
    linha.letras[posicao.get(voto.votacaoId)!] = letraDoVoto(voto.tipo);
    parlamentares.set(p.idExterno, linha);
  }

  return {
    casa,
    votacoes,
    parlamentares: [...parlamentares.values()]
      .map(({ letras, ...p }) => ({ ...p, posicoes: letras.join("") }))
      .filter((p) => /[SNA]/.test(p.posicoes))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
  };
}
