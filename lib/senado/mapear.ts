import type { Prisma } from "../generated/prisma/client";
import { SituacaoPresenca, TipoVoto, Uf } from "../generated/prisma/enums";
import { normalizarNome } from "../sync/run";
import type {
  DespesaCeaps,
  MateriaVotada,
  ProcessoAutoria,
  ReuniaoComissao,
  Senador,
  SessaoPlenario,
  VotacaoPlenario,
  VotoSenador,
} from "./types";

// Funções puras: resposta (normalizada) da API do Senado -> dados prontos para o Prisma.

/** Horários da API vêm sem fuso, em Brasília (UTC-3, sem horário de verão desde 2019). */
export function paraDataHora(texto: string) {
  // A agenda do plenário às vezes manda a hora sem zero à esquerda ("2025-06-18T9:00").
  const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(texto.trim());
  if (!m) throw new Error(`Data/hora do Senado em formato inesperado: "${texto}"`);

  const [, dia, hora, minuto, segundo = "00"] = m;
  return new Date(`${dia}T${hora.padStart(2, "0")}:${minuto}:${segundo}-03:00`);
}

/** Datas "puras" (AAAA-MM-DD) ficam em meia-noite UTC para não escorregar de dia. */
export function paraDia(texto: string) {
  return new Date(`${texto.slice(0, 10)}T00:00:00Z`);
}

const UFS = new Set<string>(Object.values(Uf));

function paraUf(sigla: string | null): Uf | null {
  return sigla && UFS.has(sigla) ? (sigla as Uf) : null;
}

/** "SESSÃO DELIBERATIVA ORDINÁRIA" -> "Sessão deliberativa ordinária". */
function capitalizar(texto: string) {
  const minusculo = texto.toLocaleLowerCase("pt-BR");
  return minusculo.charAt(0).toLocaleUpperCase("pt-BR") + minusculo.slice(1);
}

export function mapearSenador(s: Senador, emExercicio: boolean) {
  return {
    casa: "SENADO",
    idExterno: s.codigo,
    nome: s.nome,
    nomeCivil: s.nomeCompleto,
    nomeBusca: normalizarNome(s.nome),
    partido: s.partido,
    uf: paraUf(s.uf),
    fotoUrl: s.fotoUrl,
    email: s.email,
    emExercicio,
  } satisfies Prisma.ParlamentarCreateManyInput;
}

/** Senador que só aparece num voto (ex.: suplente que já saiu): cadastro mínimo, fora de exercício. */
export function mapearSenadorDoVoto(v: VotoSenador) {
  return {
    casa: "SENADO",
    idExterno: v.codigoParlamentar,
    nome: v.nome,
    nomeBusca: normalizarNome(v.nome),
    partido: v.partido,
    uf: paraUf(v.uf),
    emExercicio: false,
  } satisfies Prisma.ParlamentarCreateManyInput;
}

// ------------------------------------------------------------------------------------------
// Siglas de voto/comparecimento do Senado -> TipoVoto / SituacaoPresenca
//
// Isso vira "faltas" no portal, então só AUSENTE conta como falta sem justificativa.
// Fontes:
//  [TC]  /dadosabertos/plenario/lista/tiposComparecimento (tabela oficial sigla -> descrição)
//  [VOT] /dadosabertos/votacao?dataInicio=2025-01-01&dataFim=2025-12-31: siglas que de fato
//        aparecem nos votos (Sim, Não, Abstenção, Votou, P-NRV, AP, MIS, LS, LP, NCom, NA,
//        "Presidente (art. 51 RISF)"), com a contagem conferida no --dry-run
//  [LIC] /dadosabertos/senador/{codigo}/licencas: conferido que "NA" coincide com licença
//        registrada (Zenaide Maia, Licença Nojo 18-25/05/2025; Leila Barros, licença por doença
//        em pessoa da família 12-18/08/2025) e que "NCom" não tem licença no dia (Giordano,
//        09-10/12/2025)
//
// sigla                        TipoVoto               Presença              fonte
// Sim / Não / Abstenção        SIM / NAO / ABSTENCAO  PRESENTE              [VOT]
// Votou, VO (votação secreta)  VOTO_SECRETO           PRESENTE              [VOT][TC]
// P-NRV (presente, não votou)  PRESENTE_SEM_VOTO      PRESENTE              [VOT][TC]
// PSF, SF (presente no SF)     OUTRO                  PRESENTE              [TC]
// P-OD, OB (obstrução)         OBSTRUCAO              PRESENTE              [TC]
// Presidente (art. 51 RISF),   PRESIDENTE             PRESENTE              [VOT][TC]
//   PR, PS (presidiu)
// AP (atividade parlamentar)   AUSENCIA_JUSTIFICADA   AUSENCIA_JUSTIFICADA  [VOT][TC]
// MIS, L1, L4, L6, REP, MER    AUSENCIA_JUSTIFICADA   AUSENCIA_JUSTIFICADA  [VOT][TC]
//   (missão/representação)
// LS, LP, LAP e demais L*      AUSENCIA_JUSTIFICADA   AUSENCIA_JUSTIFICADA  [VOT][TC]
//   (licenças), GR, EP/EPR
// NA, L7 (licença sem          AUSENCIA_JUSTIFICADA   AUSENCIA_JUSTIFICADA  [VOT][TC][LIC]
//   dispositivo citado)
// AUS (comunicação ausência)   AUSENCIA_JUSTIFICADA   AUSENCIA_JUSTIFICADA  [TC]
// NCom (não compareceu)        AUSENTE                AUSENTE               [VOT][TC][LIC]
// NR (não registrou voto)      OUTRO                  (não conta)           [TC] ambíguo: não diz
//                                                                          se estava presente
// Fora de exercício: AFO, CAS, OUTRO                  (não conta)           [TC] não era senador
//   DIS, DJ, FAL, IMP, LL,                                                  em exercício no dia
//   PER, REN, RET, TER, IL
// Sem voto individual: NH, SI, OUTRO                  (não conta)           [TC]
//   VS, RR
// Sigla desconhecida           OUTRO                  (não conta)           listada no dry-run
// ------------------------------------------------------------------------------------------

export interface Comparecimento {
  tipo: TipoVoto;
  /** null = não entra na conta de presença (fora de exercício, sigla ambígua ou desconhecida). */
  presenca: SituacaoPresenca | null;
}

const PRESENTE = (tipo: TipoVoto): Comparecimento => ({ tipo, presenca: SituacaoPresenca.PRESENTE });
const JUSTIFICADA: Comparecimento = {
  tipo: TipoVoto.AUSENCIA_JUSTIFICADA,
  presenca: SituacaoPresenca.AUSENCIA_JUSTIFICADA,
};
const NAO_CONTA: Comparecimento = { tipo: TipoVoto.OUTRO, presenca: null };

const POR_SIGLA: Record<string, Comparecimento> = {
  VOTOU: PRESENTE(TipoVoto.VOTO_SECRETO),
  VO: PRESENTE(TipoVoto.VOTO_SECRETO),
  "P-NRV": PRESENTE(TipoVoto.PRESENTE_SEM_VOTO),
  PSF: PRESENTE(TipoVoto.OUTRO),
  SF: PRESENTE(TipoVoto.OUTRO),
  "P-OD": PRESENTE(TipoVoto.OBSTRUCAO),
  OB: PRESENTE(TipoVoto.OBSTRUCAO),
  PR: PRESENTE(TipoVoto.PRESIDENTE),
  PS: PRESENTE(TipoVoto.PRESIDENTE),

  // Atividade parlamentar, missão e representação da Casa (RISF, art. 13: não contam como ausência).
  AP: JUSTIFICADA,
  MIS: JUSTIFICADA,
  L1: JUSTIFICADA,
  L4: JUSTIFICADA,
  L6: JUSTIFICADA,
  REP: JUSTIFICADA,
  MER: JUSTIFICADA,
  EP: JUSTIFICADA,
  EPR: JUSTIFICADA,
  // Licenças (RISF, art. 43) e afins.
  LS: JUSTIFICADA,
  LP: JUSTIFICADA,
  LPA: JUSTIFICADA,
  LSP: JUSTIFICADA,
  LAP: JUSTIFICADA,
  LA: JUSTIFICADA,
  LAF: JUSTIFICADA,
  LG: JUSTIFICADA,
  LGA: JUSTIFICADA,
  LN: JUSTIFICADA,
  LC: JUSTIFICADA,
  LCS: JUSTIFICADA,
  LEG: JUSTIFICADA,
  L2: JUSTIFICADA,
  L3: JUSTIFICADA,
  L5: JUSTIFICADA,
  L7: JUSTIFICADA,
  NA: JUSTIFICADA,
  GR: JUSTIFICADA,
  AUS: JUSTIFICADA,

  NCOM: { tipo: TipoVoto.AUSENTE, presenca: SituacaoPresenca.AUSENTE },

  NR: NAO_CONTA,
  AFO: NAO_CONTA,
  CAS: NAO_CONTA,
  DIS: NAO_CONTA,
  DJ: NAO_CONTA,
  FAL: NAO_CONTA,
  IMP: NAO_CONTA,
  LL: NAO_CONTA,
  PER: NAO_CONTA,
  REN: NAO_CONTA,
  RET: NAO_CONTA,
  TER: NAO_CONTA,
  IL: NAO_CONTA,
  NH: NAO_CONTA,
  SI: NAO_CONTA,
  VS: NAO_CONTA,
  RR: NAO_CONTA,
};

const semAcento = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toUpperCase();

/** Sigla do Senado -> tipo de voto e situação de presença (ver tabela acima). */
export function mapearComparecimento(sigla: string): Comparecimento {
  const chave = semAcento(sigla);

  if (chave === "SIM") return PRESENTE(TipoVoto.SIM);
  if (chave === "NAO") return PRESENTE(TipoVoto.NAO);
  if (chave === "ABSTENCAO") return PRESENTE(TipoVoto.ABSTENCAO);
  // "Presidente (art. 51 RISF)": quem preside só vota em escrutínio secreto ou para desempatar.
  if (chave.startsWith("PRESIDENTE")) return PRESENTE(TipoVoto.PRESIDENTE);

  return POR_SIGLA[chave] ?? NAO_CONTA;
}

/** Sigla está na tabela? Usado no dry-run para apontar siglas novas. */
export function siglaConhecida(sigla: string) {
  const chave = semAcento(sigla);
  return (
    ["SIM", "NAO", "ABSTENCAO"].includes(chave) || chave.startsWith("PRESIDENTE") || chave in POR_SIGLA
  );
}

/** Voto sem ids internos: `codigoParlamentar` é resolvido para Parlamentar na gravação. */
export function mapearVoto(v: VotoSenador) {
  return {
    codigoParlamentar: v.codigoParlamentar,
    tipo: mapearComparecimento(v.sigla).tipo,
    votoOriginal: v.descricao ? `${v.sigla} - ${v.descricao}` : v.sigla,
    partido: v.partido,
  };
}

export function mapearVotacao(v: VotacaoPlenario) {
  const { sim, nao, abstencao } = v.totais;
  const placar =
    sim !== null || nao !== null
      ? ` (Sim ${sim ?? 0}, Não ${nao ?? 0}, Abst. ${abstencao ?? 0})`
      : "";
  const situacao = v.aprovada === null ? null : v.aprovada ? "Aprovada" : "Rejeitada";

  return {
    casa: "SENADO",
    idExterno: v.codigo,
    data: paraDia(v.data),
    descricao: v.descricao,
    orgaoSigla: "PLEN",
    aprovada: v.aprovada,
    resultado: situacao ? `${situacao}${placar}${v.secreta ? " - votação secreta" : ""}` : null,
  } satisfies Prisma.VotacaoCreateManyInput;
}

const urlMateria = (codigoMateria: number | null) =>
  codigoMateria ? `https://www25.senado.leg.br/web/atividade/materias/-/materia/${codigoMateria}` : null;

/** `idExterno` da Proposição é o id do processo (novo), comum a /votacao e /processo. */
export function mapearMateriaVotada(m: MateriaVotada) {
  return {
    casa: "SENADO",
    idExterno: String(m.idProcesso),
    siglaTipo: m.sigla,
    numero: m.numero,
    ano: m.ano,
    ementa: m.ementa ?? "(sem ementa)",
    dataApresentacao: m.dataApresentacao ? paraDia(m.dataApresentacao) : null,
    situacao: null,
    url: urlMateria(m.codigoMateria),
  } satisfies Prisma.ProposicaoCreateManyInput;
}

/** "PL 196/2025", "REQ 49/2025 - CI", "R.S 1/2025" -> sigla, número e ano. */
export function lerIdentificacao(identificacao: string) {
  const m = identificacao.match(/^(.+?)\s+(\d+)\/(\d{4})/);
  return m ? { sigla: m[1], numero: Number(m[2]), ano: Number(m[3]) } : null;
}

export function mapearProcesso(p: ProcessoAutoria) {
  const id = lerIdentificacao(p.identificacao);
  if (!id) return null;

  return {
    casa: "SENADO",
    idExterno: String(p.id),
    siglaTipo: id.sigla,
    numero: id.numero,
    ano: id.ano,
    ementa: p.ementa?.trim() || "(sem ementa)",
    dataApresentacao: p.dataApresentacao ? paraDia(p.dataApresentacao) : null,
    situacao: p.situacaoAtual?.trim() || null,
    url: urlMateria(p.codigoMateria) ?? p.urlDocumento ?? null,
  } satisfies Prisma.ProposicaoCreateManyInput;
}

/**
 * O primeiro nome do texto de `autoria` é o proponente; os demais são coautores.
 * Ex.: "Senador Fulano (PT/RS), Senadora Beltrana (PL/DF)".
 */
export function ehProponente(autoria: string | null, nomeSenador: string) {
  const primeiro = autoria?.split(/\),\s*/)[0] ?? "";
  return ` ${normalizarNome(primeiro)} `.includes(` ${normalizarNome(nomeSenador)} `);
}

export const idEventoPlenario = (codigoSessao: string) => `plenario:${codigoSessao}`;
export const idEventoComissao = (codigoReuniao: string) => `comissao:${codigoReuniao}`;

/** Placeholders "NÃO HAVERÁ SESSÃO" e sessões do Congresso (CN) ficam de fora. */
export function sessaoConta(s: SessaoPlenario) {
  return s.casa === "SF" && !/N[ÃA]O HAVER[ÁA]/i.test(s.tipo);
}

export function mapearSessao(s: SessaoPlenario) {
  return {
    casa: "SENADO",
    idExterno: idEventoPlenario(s.codigo),
    inicio: paraDataHora(`${s.data}T${s.hora ?? "00:00"}`),
    fim: null,
    tipo: capitalizar(s.tipo),
    situacao: s.situacao,
    descricao: [s.numero ? capitalizar(s.numero) : null, s.descricao].filter(Boolean).join(" - ") || null,
    orgaoSigla: "PLEN",
    orgaoNome: "Plenário do Senado Federal",
    local: s.local,
    url: `https://www25.senado.leg.br/web/atividade/sessao-plenaria/-/pauta/${s.codigo}`,
  } satisfies Prisma.EventoCreateManyInput;
}

const TIPOS_SESSAO: Record<string, string> = {
  DOR: "Sessão deliberativa ordinária",
  DEX: "Sessão deliberativa extraordinária",
  NDE: "Sessão não deliberativa",
};

/** Sessão que tem votação mas não veio na agenda (para não perder as presenças). */
export function mapearSessaoDaVotacao(v: VotacaoPlenario) {
  return {
    casa: "SENADO",
    idExterno: idEventoPlenario(v.codigoSessao),
    inicio: paraDataHora(`${v.data}T00:00`),
    fim: null,
    tipo: TIPOS_SESSAO[v.siglaTipoSessao] ?? `Sessão ${v.siglaTipoSessao}`,
    situacao: "Encerrada",
    descricao: null,
    orgaoSigla: "PLEN",
    orgaoNome: "Plenário do Senado Federal",
    local: null,
    url: `https://www25.senado.leg.br/web/atividade/sessao-plenaria/-/pauta/${v.codigoSessao}`,
  } satisfies Prisma.EventoCreateManyInput;
}

/** Só reuniões de comissões do Senado; as mistas (CN) também aparecem na Câmara. */
export function reuniaoConta(r: ReuniaoComissao) {
  return r.colegiadoCasa === "SF";
}

export function mapearReuniao(r: ReuniaoComissao) {
  const situacao =
    r.situacao && r.status && r.status !== r.situacao ? `${r.situacao} (${r.status})` : r.situacao ?? r.status;
  const descricao = r.partes
    .map((p) => {
      const conteudo = p.finalidade ?? (p.itens.length ? p.itens.join(", ") : null);
      return [p.tipo, conteudo].filter(Boolean).join(": ");
    })
    .filter(Boolean)
    .join(" | ");

  return {
    casa: "SENADO",
    idExterno: idEventoComissao(r.codigo),
    inicio: paraDataHora(r.dataInicio),
    fim: null,
    tipo: r.titulo,
    situacao,
    descricao: descricao.slice(0, 1000) || null,
    orgaoSigla: r.colegiadoSigla,
    orgaoNome: r.colegiadoNome,
    local: r.local,
    url: r.colegiadoCodigo
      ? `https://legis.senado.leg.br/atividade/comissoes/comissao/${r.colegiadoCodigo}/reuniao/${r.codigo}`
      : null,
  } satisfies Prisma.EventoCreateManyInput;
}

export interface PresencaMapeada {
  codigoParlamentar: string;
  situacao: SituacaoPresenca;
  justificativa: string | null;
}

const PRIORIDADE: Record<SituacaoPresenca, number> = {
  PRESENTE: 3,
  AUSENCIA_JUSTIFICADA: 2,
  AUSENTE: 1,
};

/**
 * Presença por sessão a partir dos votos nominais: a API não publica lista de presença das sessões
 * nem das reuniões de comissão. Quem esteve presente em qualquer votação da sessão conta como
 * presente; senão, justificada vence "não compareceu" (o senador pode ter chegado depois).
 */
export function presencasPorSessao(votacoes: VotacaoPlenario[]) {
  const porSessao = new Map<string, Map<string, PresencaMapeada>>();

  for (const v of votacoes) {
    const sessao = porSessao.get(v.codigoSessao) ?? new Map<string, PresencaMapeada>();
    porSessao.set(v.codigoSessao, sessao);

    for (const voto of v.votos) {
      const { presenca } = mapearComparecimento(voto.sigla);
      if (!presenca) continue;

      const atual = sessao.get(voto.codigoParlamentar);
      if (atual && PRIORIDADE[atual.situacao] >= PRIORIDADE[presenca]) continue;

      sessao.set(voto.codigoParlamentar, {
        codigoParlamentar: voto.codigoParlamentar,
        situacao: presenca,
        justificativa:
          presenca === SituacaoPresenca.AUSENCIA_JUSTIFICADA ? (voto.descricao ?? voto.sigla) : null,
      });
    }
  }

  return porSessao;
}

/** `parlamentarId` é preenchido na gravação. `id` da API = COD_DOCUMENTO do CSV anual. */
export function mapearDespesa(d: DespesaCeaps) {
  return {
    idExterno: String(d.id),
    ano: d.ano,
    mes: d.mes,
    tipoDespesa: d.tipoDespesa?.trim() || "Não informado",
    fornecedor: d.fornecedor?.trim() || null,
    cpfCnpjFornecedor: d.cpfCnpj?.trim() || null,
    valorLiquido: d.valorReembolsado.toFixed(2),
    dataDocumento: d.data ? paraDia(d.data) : null,
    // O Senado não publica o comprovante digitalizado na CEAPS.
    urlDocumento: null,
  } satisfies Omit<Prisma.DespesaCotaCreateManyInput, "parlamentarId">;
}
