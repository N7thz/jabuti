import type { Prisma } from "../generated/prisma/client";
import { TipoVoto, Uf } from "../generated/prisma/enums";
import { normalizarNome } from "../sync/run";
import type {
  DeputadoResumo,
  Despesa,
  Evento,
  ProposicaoDetalhe,
  ProposicaoResumo,
  Votacao,
  VotacaoDetalhe,
  VotoApi,
} from "./types";

// Funções puras: resposta da API da Câmara -> dados prontos para o Prisma (sem ids internos).

/** Horários da API vêm sem fuso, em Brasília (UTC-3, sem horário de verão desde 2019). */
export function paraDataHora(texto: string) {
  const completo = texto.length === 16 ? `${texto}:00` : texto;
  return new Date(`${completo}-03:00`);
}

/** Datas "puras" (AAAA-MM-DD ou T00:00:00) ficam em meia-noite UTC para não escorregar de dia. */
export function paraDia(texto: string) {
  return new Date(`${texto.slice(0, 10)}T00:00:00Z`);
}

const UFS = new Set<string>(Object.values(Uf));

function paraUf(sigla: string | null): Uf | null {
  return sigla && UFS.has(sigla) ? (sigla as Uf) : null;
}

export function mapearDeputado(d: DeputadoResumo, emExercicio: boolean) {
  return {
    casa: "CAMARA",
    idExterno: String(d.id),
    nome: d.nome,
    nomeBusca: normalizarNome(d.nome),
    partido: d.siglaPartido,
    uf: paraUf(d.siglaUf),
    fotoUrl: d.urlFoto,
    email: d.email,
    emExercicio,
  } satisfies Prisma.ParlamentarCreateManyInput;
}

export function mapearTipoVoto(texto: string): TipoVoto {
  const chave = texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();

  switch (chave) {
    case "sim":
      return TipoVoto.SIM;
    case "nao":
      return TipoVoto.NAO;
    case "abstencao":
      return TipoVoto.ABSTENCAO;
    case "obstrucao":
      return TipoVoto.OBSTRUCAO;
    case "artigo 17":
      return TipoVoto.PRESIDENTE;
    default:
      return TipoVoto.OUTRO;
  }
}

/** Voto sem os ids internos: `idDeputado` é o id da Câmara, resolvido para Parlamentar na gravação. */
export function mapearVoto(v: VotoApi) {
  return {
    idDeputado: String(v.deputado_.id),
    tipo: mapearTipoVoto(v.tipoVoto),
    votoOriginal: v.tipoVoto,
    // Partido do deputado na data da votação, como a API informa nesse registro.
    partido: v.deputado_.siglaPartido,
  };
}

export function mapearVotacao(v: Votacao) {
  return {
    casa: "CAMARA",
    idExterno: v.id,
    data: paraDataHora(v.dataHoraRegistro),
    descricao: v.descricao?.trim() || "(sem descrição)",
    orgaoSigla: v.siglaOrgao,
    aprovada: v.aprovacao === null ? null : v.aprovacao === 1,
    resultado: v.aprovacao === null ? null : v.aprovacao === 1 ? "Aprovada" : "Rejeitada",
  } satisfies Prisma.VotacaoCreateManyInput;
}

/**
 * Id da proposição ligada à votação. A lista já traz `uriProposicaoObjeto` quando há objeto único;
 * senão usa a primeira `proposicoesAfetadas`, e `objetosPossiveis` só se for um único item.
 */
export function escolherProposicao(v: Votacao, detalhe: VotacaoDetalhe | null): number | null {
  const doObjeto = v.uriProposicaoObjeto?.match(/\/proposicoes\/(\d+)$/)?.[1];
  if (doObjeto) return Number(doObjeto);
  if (!detalhe) return null;
  if (detalhe.proposicoesAfetadas.length > 0) return detalhe.proposicoesAfetadas[0].id;
  if (detalhe.objetosPossiveis.length === 1) return detalhe.objetosPossiveis[0].id;
  return null;
}

export function mapearProposicao(p: ProposicaoResumo | ProposicaoDetalhe) {
  const detalhe = "statusProposicao" in p ? p : null;

  return {
    casa: "CAMARA",
    idExterno: String(p.id),
    siglaTipo: p.siglaTipo,
    numero: p.numero,
    ano: p.ano,
    ementa: p.ementa?.trim() || "(sem ementa)",
    dataApresentacao: p.dataApresentacao ? paraDataHora(p.dataApresentacao) : null,
    // Situação e url só existem no detalhe; a lista de autoria não traz.
    situacao: detalhe?.statusProposicao?.descricaoSituacao ?? null,
    url: detalhe?.urlInteiroTeor ?? `https://www.camara.leg.br/propostas-legislativas/${p.id}`,
  } satisfies Prisma.ProposicaoCreateManyInput;
}

export function mapearEvento(e: Evento) {
  const orgao = e.orgaos[0];

  return {
    casa: "CAMARA",
    idExterno: String(e.id),
    inicio: paraDataHora(e.dataHoraInicio),
    fim: e.dataHoraFim ? paraDataHora(e.dataHoraFim) : null,
    tipo: e.descricaoTipo,
    situacao: e.situacao,
    descricao: e.descricao?.replace(/\s+/g, " ").trim().slice(0, 1000) || null,
    orgaoSigla: orgao?.sigla ?? null,
    orgaoNome: orgao?.nome ?? null,
    local: e.localCamara?.nome ?? e.localExterno,
    url: e.urlRegistro,
  } satisfies Prisma.EventoCreateManyInput;
}

/**
 * Só sessões e reuniões de comissão contam para presença (seminários, visitas e "outros eventos"
 * não têm registro de presença confiável) e só as já encerradas.
 */
export function eventoContaPresenca(e: Evento) {
  const tipoOk = /^(Sessão|Reunião|Audiência)/.test(e.descricaoTipo);
  return tipoOk && (e.situacao?.startsWith("Encerrada") ?? false);
}

/** Chave estável do documento; `codDocumento` vem "0" ou vazio em alguns lançamentos. */
export function idExternoDespesa(d: Despesa) {
  if (d.codDocumento && d.codDocumento !== "0") return d.codDocumento;

  return [
    "sem-doc",
    d.dataDocumento?.slice(0, 10) ?? "",
    d.cnpjCpfFornecedor ?? d.nomeFornecedor ?? "",
    d.valorLiquido.toFixed(2),
    d.numDocumento ?? "",
    d.tipoDespesa,
  ].join("|");
}

/** `parlamentarId` é preenchido na gravação. */
export function mapearDespesa(d: Despesa) {
  return {
    idExterno: idExternoDespesa(d),
    ano: d.ano,
    mes: d.mes,
    tipoDespesa: d.tipoDespesa,
    fornecedor: d.nomeFornecedor,
    cpfCnpjFornecedor: d.cnpjCpfFornecedor,
    valorLiquido: d.valorLiquido.toFixed(2),
    dataDocumento: d.dataDocumento ? paraDia(d.dataDocumento) : null,
    urlDocumento: d.urlDocumento,
  } satisfies Omit<Prisma.DespesaCotaCreateManyInput, "parlamentarId">;
}
