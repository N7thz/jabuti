import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { createCamaraClient } from "@/lib/camara/client";
import { mapearTipoVoto } from "@/lib/camara/mapear";
import type { ProposicaoResumo } from "@/lib/camara/types";
import { db } from "@/lib/db";
import { calcularFidelidade, contrariouPartido, orientacaoDoPartido } from "@/lib/fidelidade";
import { NA_PAGINA, naoEncontrado } from "@/lib/sync/run";
import type { Casa, TipoVoto } from "@/lib/generated/prisma/enums";

// Votações nominais. A API da Câmara não tem "votos de um deputado": o histórico por deputado sai do
// banco (sync-camara). A votação em si (placar nominal) vem da API, que é a fonte oficial e está sempre
// completa. No Senado é o contrário: a API filtra por senador, mas não busca uma votação pelo código,
// então o perfil usa a API e a página da votação usa o banco (sync-senado).

const camara = createCamaraClient(NA_PAGINA);

export type CasaUrl = "camara" | "senado";
export const casaDaUrl = (casa: CasaUrl): Casa => (casa === "camara" ? "CAMARA" : "SENADO");

export const linkVotacao = (casa: CasaUrl, id: string) => `/votacoes/${casa}/${encodeURIComponent(id)}`;
export const linkParlamentar = (casa: Casa, idExterno: string) =>
  casa === "CAMARA" ? `/parlamentares/deputado/${idExterno}` : `/parlamentares/senador/${idExterno}`;

/** Um voto no histórico do perfil, no mesmo formato para as duas casas. */
export interface VotoNoPerfil {
  votacaoId: string;
  /** AAAA-MM-DD */
  data: string;
  descricao: string;
  resultado: string | null;
  proposicao: { rotulo: string; ementa: string | null; url: string | null } | null;
  tipo: TipoVoto;
  votoOriginal: string;
  /** Há página da votação no portal (no Senado, só as que já estão no banco). */
  temPagina: boolean;
}

const rotuloProposicao = (p: { siglaTipo: string; numero: number; ano: number }) =>
  p.ano ? `${p.siglaTipo} ${p.numero}/${p.ano}` : `${p.siglaTipo} ${p.numero}`;

/** Quando a última carga da fonte terminou bem, para o aviso "dados do banco atualizados em". */
export async function ultimaCarga(fonte: "CAMARA" | "SENADO") {
  "use cache";
  cacheLife("hours");
  cacheTag("sync");

  const run = await db.syncRun.findFirst({
    where: { fonte, status: "SUCESSO" },
    orderBy: { finalizadoEm: "desc" },
    select: { finalizadoEm: true },
  });
  return run?.finalizadoEm?.toISOString() ?? null;
}

/** Votos nominais do deputado guardados no banco, mais recentes primeiro. */
export async function getVotosDeputado(id: string, limite = 300): Promise<VotoNoPerfil[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("votacoes", `deputado:${id}`);

  const votos = await db.voto.findMany({
    where: { parlamentar: { casa: "CAMARA", idExterno: id } },
    select: {
      tipo: true,
      votoOriginal: true,
      votacao: {
        select: {
          idExterno: true,
          data: true,
          descricao: true,
          resultado: true,
          proposicao: { select: { siglaTipo: true, numero: true, ano: true, ementa: true, url: true } },
        },
      },
    },
    orderBy: { votacao: { data: "desc" } },
    take: limite,
  });

  return votos.map(({ tipo, votoOriginal, votacao: v }) => ({
    votacaoId: v.idExterno,
    data: v.data.toISOString().slice(0, 10),
    descricao: v.descricao,
    resultado: v.resultado,
    proposicao: v.proposicao
      ? { rotulo: rotuloProposicao(v.proposicao), ementa: v.proposicao.ementa, url: v.proposicao.url }
      : null,
    tipo,
    votoOriginal,
    temPagina: true,
  }));
}

/** Quais destas votações do Senado já estão no banco (e por isso têm página no portal). */
export async function votacoesSenadoNoBanco(codigos: string[]) {
  "use cache";
  cacheLife("hours");
  cacheTag("votacoes");

  if (codigos.length === 0) return new Set<string>();
  const existentes = await db.votacao.findMany({
    where: { casa: "SENADO", idExterno: { in: codigos } },
    select: { idExterno: true },
  });
  return new Set(existentes.map((v) => v.idExterno));
}

/** Um voto na página da votação. */
export interface VotoNominal {
  nome: string;
  partido: string | null;
  uf: string | null;
  tipo: TipoVoto;
  votoOriginal: string;
  perfil: string | null;
}

export interface VotacaoCompleta {
  casa: CasaUrl;
  id: string;
  data: string;
  descricao: string;
  orgao: string | null;
  aprovada: boolean | null;
  resultado: string | null;
  proposicao: { rotulo: string; ementa: string | null; url: string | null; idExterno: string } | null;
  votos: VotoNominal[];
  /** Link da votação no site oficial da casa. */
  fonte: string;
  outras: { id: string; data: string; descricao: string; resultado: string | null }[];
}

function proposicaoDaVotacao(afetadas: ProposicaoResumo[], possiveis: ProposicaoResumo[]) {
  const p = afetadas[0] ?? (possiveis.length === 1 ? possiveis[0] : null);
  if (!p) return null;
  return {
    rotulo: rotuloProposicao(p),
    ementa: p.ementa || null,
    url: `https://www.camara.leg.br/propostas-legislativas/${p.id}`,
    idExterno: String(p.id),
  };
}

/** Outras votações da mesma proposição já guardadas no banco. */
async function outrasVotacoes(casa: Casa, proposicaoIdExterno: string | undefined, atual: string) {
  if (!proposicaoIdExterno) return [];
  const votacoes = await db.votacao.findMany({
    where: { casa, proposicao: { casa, idExterno: proposicaoIdExterno }, idExterno: { not: atual } },
    select: { idExterno: true, data: true, descricao: true, resultado: true },
    orderBy: { data: "desc" },
    take: 20,
  });
  return votacoes.map((v) => ({
    id: v.idExterno,
    data: v.data.toISOString().slice(0, 10),
    descricao: v.descricao,
    resultado: v.resultado,
  }));
}

/** Votação da Câmara direto da API, ou `null` se o id não existir. */
export async function getVotacaoCamara(id: string): Promise<VotacaoCompleta | null> {
  "use cache";
  cacheLife("days");
  cacheTag("votacoes", `votacao:camara:${id}`);

  // Só o 404 vira "não encontrada"; com a Câmara fora do ar o erro sobe e não fica guardado no cache.
  const detalhe = await camara.votacao(id).catch((error) => {
    if (naoEncontrado(error)) return null;
    throw error;
  });
  if (!detalhe) return null;
  const votos = await camara.votos(id);
  const proposicao = proposicaoDaVotacao(detalhe.proposicoesAfetadas ?? [], detalhe.objetosPossiveis ?? []);

  return {
    casa: "camara",
    id,
    data: detalhe.data,
    descricao: detalhe.descricao?.trim() || "(sem descrição)",
    orgao: detalhe.siglaOrgao,
    aprovada: detalhe.aprovacao === null ? null : detalhe.aprovacao === 1,
    resultado: detalhe.aprovacao === null ? null : detalhe.aprovacao === 1 ? "Aprovada" : "Rejeitada",
    proposicao,
    votos: votos
      .map((v) => ({
        nome: v.deputado_.nome,
        partido: v.deputado_.siglaPartido,
        uf: v.deputado_.siglaUf,
        tipo: mapearTipoVoto(v.tipoVoto),
        votoOriginal: v.tipoVoto,
        perfil: linkParlamentar("CAMARA", String(v.deputado_.id)),
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    fonte: detalhe.idEvento
      ? `https://www.camara.leg.br/evento-legislativo/${detalhe.idEvento}`
      : `https://dadosabertos.camara.leg.br/api/v2/votacoes/${encodeURIComponent(id)}`,
    outras: await outrasVotacoes("CAMARA", proposicao?.idExterno, id),
  };
}

/** Votação do Senado guardada no banco (sync-senado), ou `null`. */
export async function getVotacaoSenado(id: string): Promise<VotacaoCompleta | null> {
  "use cache";
  cacheLife("days");
  cacheTag("votacoes", `votacao:senado:${id}`);

  const v = await db.votacao.findUnique({
    where: { casa_idExterno: { casa: "SENADO", idExterno: id } },
    select: {
      data: true,
      descricao: true,
      orgaoSigla: true,
      aprovada: true,
      resultado: true,
      proposicao: { select: { idExterno: true, siglaTipo: true, numero: true, ano: true, ementa: true, url: true } },
      votos: {
        select: {
          tipo: true,
          votoOriginal: true,
          partido: true,
          parlamentar: { select: { nome: true, uf: true, idExterno: true, partido: true } },
        },
      },
    },
  });
  if (!v) return null;

  return {
    casa: "senado",
    id,
    data: v.data.toISOString().slice(0, 10),
    descricao: v.descricao,
    orgao: v.orgaoSigla,
    aprovada: v.aprovada,
    resultado: v.resultado,
    proposicao: v.proposicao
      ? {
          rotulo: rotuloProposicao(v.proposicao),
          ementa: v.proposicao.ementa,
          url: v.proposicao.url,
          idExterno: v.proposicao.idExterno,
        }
      : null,
    votos: v.votos
      .map((voto) => ({
        nome: voto.parlamentar.nome,
        partido: voto.partido ?? voto.parlamentar.partido,
        uf: voto.parlamentar.uf,
        tipo: voto.tipo,
        votoOriginal: voto.votoOriginal,
        perfil: linkParlamentar("SENADO", voto.parlamentar.idExterno),
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    fonte: v.proposicao?.url ?? "https://www25.senado.leg.br/web/atividade/votacoes-nominais",
    outras: await outrasVotacoes("SENADO", v.proposicao?.idExterno, id),
  };
}

/**
 * Fidelidade ao partido e ao governo nas votações guardadas no banco que têm orientação de bancada,
 * e as votações mais recentes em que o parlamentar votou contra a orientação do partido.
 */
export async function getFidelidade(casa: Casa, idExterno: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("votacoes", `${casa === "CAMARA" ? "deputado" : "senador"}:${idExterno}`);

  const votos = await db.voto.findMany({
    where: { parlamentar: { casa, idExterno }, votacao: { orientacoes: { some: {} } } },
    select: {
      tipo: true,
      votoOriginal: true,
      partido: true,
      votacao: {
        select: {
          idExterno: true,
          data: true,
          descricao: true,
          proposicao: { select: { siglaTipo: true, numero: true, ano: true } },
          orientacoes: { select: { sigla: true, tipo: true, orientacao: true } },
        },
      },
    },
    orderBy: { votacao: { data: "desc" } },
  });

  const comOrientacoes = votos.map((v) => ({ ...v, orientacoes: v.votacao.orientacoes }));
  const datas = votos.map((v) => v.votacao.data.toISOString().slice(0, 10));
  return {
    ...calcularFidelidade(comOrientacoes),
    periodo: datas.length ? { desde: datas.at(-1)!, ate: datas[0] } : null,
    contrariou: comOrientacoes
      .filter(contrariouPartido)
      .slice(0, 10)
      .map((v) => {
        const orientacao = orientacaoDoPartido(v.orientacoes, v.partido);
        return {
          votacaoId: v.votacao.idExterno,
          data: v.votacao.data.toISOString().slice(0, 10),
          descricao: v.votacao.descricao,
          proposicao: v.votacao.proposicao ? rotuloProposicao(v.votacao.proposicao) : null,
          voto: v.votoOriginal,
          orientacao: orientacao ? `${orientacao.sigla}: ${orientacao.orientacao}` : null,
        };
      }),
  };
}
