// Tipos da API de Dados Abertos do Senado (https://legis.senado.leg.br/dadosabertos) e da API
// administrativa (https://adm.senado.gov.br/adm-dadosabertos), conferidos com respostas reais (out/2026).
//
// Há duas gerações de serviço:
// - antigos (senador/lista, plenario/agenda, comissao/agenda): envelope XML convertido em JSON,
//   chaves em PascalCase, tudo string e objeto único no lugar de array quando há só 1 item;
// - novos (/votacao, /processo, CEAPS): array JSON direto, com números de verdade.
// Os tipos `*Api` refletem o formato cru; o cliente devolve os tipos normalizados do fim do arquivo.

/** Objeto único quando há 1 item, array quando há vários (e às vezes a chave nem existe). */
export type UmOuVarios<T> = T | T[];

// ---------- senador/lista/atual, senador/lista/legislatura/{n}, senador/{codigo} ----------

export interface IdentificacaoParlamentarApi {
  CodigoParlamentar: string;
  CodigoPublicoNaLegAtual?: string;
  NomeParlamentar: string;
  NomeCompletoParlamentar?: string;
  SexoParlamentar?: string;
  FormaTratamento?: string;
  UrlFotoParlamentar?: string;
  UrlPaginaParlamentar?: string;
  EmailParlamentar?: string;
  SiglaPartidoParlamentar?: string;
  UfParlamentar?: string;
  MembroMesa?: string;
  MembroLideranca?: string;
}

export interface MandatoApi {
  CodigoMandato: string;
  UfParlamentar?: string;
  /** "Titular", "1º Suplente", "2º Suplente". */
  DescricaoParticipacao?: string;
  PrimeiraLegislaturaDoMandato?: { NumeroLegislatura: string; DataInicio: string; DataFim: string };
  SegundaLegislaturaDoMandato?: { NumeroLegislatura: string; DataInicio: string; DataFim: string };
  Exercicios?: { Exercicio: UmOuVarios<{ CodigoExercicio: string; DataInicio: string; DataFim?: string }> };
}

export interface ParlamentarListaApi {
  IdentificacaoParlamentar: IdentificacaoParlamentarApi;
  /** Lista atual traz um único `Mandato`; a lista por legislatura traz `Mandatos.Mandato`. */
  Mandato?: MandatoApi;
  Mandatos?: { Mandato: UmOuVarios<MandatoApi> };
}

export interface ListaAtualApi {
  ListaParlamentarEmExercicio: {
    Parlamentares?: { Parlamentar: UmOuVarios<ParlamentarListaApi> };
  };
}

export interface ListaLegislaturaSenadoresApi {
  ListaParlamentarLegislatura: {
    Parlamentares?: { Parlamentar: UmOuVarios<ParlamentarListaApi> };
  };
}

export interface DetalheSenadorApi {
  DetalheParlamentar: {
    Parlamentar?: { IdentificacaoParlamentar: IdentificacaoParlamentarApi };
  };
}

// ---------- plenario/legislatura/{data} ----------

export interface LegislaturaApi {
  ListaLegislatura: {
    Legislaturas?: {
      Legislatura: UmOuVarios<{ NumeroLegislatura: string; DataInicio: string; DataFim: string }>;
    };
  };
}

// ---------- /votacao (serviço novo; substitui plenario/lista/votacao, depreciado) ----------

export interface VotoParlamentarApi {
  codigoParlamentar: number;
  nomeParlamentar: string;
  sexoParlamentar: string;
  siglaPartidoParlamentar: string;
  siglaUFParlamentar: string;
  /** Sim, Não, Abstenção, Votou (secreta), P-NRV, AP, MIS, LS, NCom, "Presidente (art. 51 RISF)"... */
  siglaVotoParlamentar: string;
  descricaoVotoParlamentar: string | null;
}

export interface VotacaoApi {
  codigoSessaoVotacao: number;
  codigoSessao: number;
  codigoSessaoLegislativa: number;
  casaSessao: string;
  numeroSessao: number;
  siglaTipoSessao: string;
  sequencialSessao: number;
  sequencialVotacao: number | null;
  /** AAAA-MM-DD, sem horário. */
  dataSessao: string;
  descricaoVotacao: string;
  /** "S" | "N". */
  votacaoSecreta: string;
  /** "A" (aprovada) | "R" (rejeitada). */
  resultadoVotacao: string | null;
  totalVotosSim: number | null;
  totalVotosNao: number | null;
  totalVotosAbstencao: number | null;
  idProcesso: number | null;
  codigoMateria: number | null;
  /** Ex.: "PLP 177/2023", "PEC 66/2023 (fase 2)". */
  identificacao: string | null;
  sigla: string | null;
  /** Número como string ("6"). */
  numero: string | null;
  ano: number | null;
  ementa: string | null;
  dataApresentacao: string | null;
  informeLegislativo: { texto?: string; siglaColegiado?: string } | null;
  votos?: VotoParlamentarApi[];
}

// ---------- plenario/agenda/mes/{AAAAMMDD} ----------

export interface SessaoAgendaApi {
  CodigoSessao: string;
  Data: string;
  Hora?: string;
  NumeroSessao?: string;
  /** Ex.: "SESSÃO DELIBERATIVA ORDINÁRIA ", "NÃO HAVERÁ SESSÃO " (com espaço no fim). */
  TipoSessao: string;
  LocalSessao?: string;
  /** "SF" ou "CN" (sessões do Congresso aparecem na mesma agenda). */
  Casa: string;
  SituacaoSessao?: string;
  Realizada?: { Status: string };
  Evento?: { DescricaoEvento?: string };
}

export interface AgendaPlenarioApi {
  AgendaPlenario: {
    /** Ausente quando não há sessão no mês. */
    Sessoes?: { Sessao: UmOuVarios<SessaoAgendaApi> };
  };
}

// ---------- comissao/agenda/{ini}/{fim} (máx. 30 dias) ----------

export interface ParteReuniaoApi {
  descricaoTipo?: string;
  evento?: { finalidade?: string };
  itens?: UmOuVarios<{ nome?: string }>;
}

export interface ReuniaoApi {
  codigo: string;
  titulo?: string;
  descricao?: string;
  colegiadoCriador?: { codigo: string; sigla: string; nome: string; siglaCasa: string };
  /** AAAA-MM-DDTHH:mm:ss.SSS, horário de Brasília sem fuso. */
  dataInicio: string;
  /** "true" | "false". */
  realizada?: string;
  situacao?: string;
  status?: string;
  local?: string;
  tipo?: { descricao?: string; sigla?: string };
  partes?: UmOuVarios<ParteReuniaoApi>;
}

export interface AgendaComissaoApi {
  AgendaReuniao: {
    reunioes?: { reuniao?: UmOuVarios<ReuniaoApi> };
  };
}

// ---------- /processo (serviço novo; substitui senador/{codigo}/autorias, depreciado) ----------

export interface ProcessoApi {
  id: number;
  codigoMateria: number | null;
  /** Ex.: "PL 196/2025", "REQ 49/2025 - CI". */
  identificacao: string;
  ementa: string | null;
  /** Texto livre: "Senador Fulano (PT/RS), Senadora Beltrana (PL/DF)". O primeiro é o proponente. */
  autoria: string | null;
  dataApresentacao: string | null;
  situacaoAtual?: string | null;
  tramitando?: string | null;
  tipoDocumento?: string | null;
  urlDocumento?: string | null;
}

// ---------- adm-dadosabertos/api/v1/senadores/despesas_ceaps/{ano} ----------

export interface DespesaCeapsApi {
  /** Mesmo valor do COD_DOCUMENTO do CSV anual. */
  id: number;
  tipoDocumento: string | null;
  ano: number;
  mes: number;
  codSenador: number;
  nomeSenador: string;
  tipoDespesa: string | null;
  cpfCnpj: string | null;
  fornecedor: string | null;
  documento: string | null;
  /** AAAA-MM-DD. */
  data: string | null;
  detalhamento: string | null;
  /** Pode ser negativo (estorno/devolução). */
  valorReembolsado: number;
}

// ======================= tipos normalizados devolvidos pelo cliente =======================

export interface Senador {
  codigo: string;
  nome: string;
  nomeCompleto: string | null;
  partido: string | null;
  uf: string | null;
  fotoUrl: string | null;
  email: string | null;
}

export interface VotoSenador {
  codigoParlamentar: string;
  nome: string;
  partido: string | null;
  uf: string | null;
  sigla: string;
  descricao: string | null;
}

export interface MateriaVotada {
  idProcesso: number;
  codigoMateria: number | null;
  sigla: string;
  numero: number;
  ano: number;
  ementa: string | null;
  dataApresentacao: string | null;
}

export interface VotacaoPlenario {
  codigo: string;
  codigoSessao: string;
  siglaTipoSessao: string;
  data: string;
  descricao: string;
  identificacao: string | null;
  secreta: boolean;
  aprovada: boolean | null;
  totais: { sim: number | null; nao: number | null; abstencao: number | null };
  materia: MateriaVotada | null;
  votos: VotoSenador[];
}

export interface SessaoPlenario {
  codigo: string;
  data: string;
  hora: string | null;
  numero: string | null;
  tipo: string;
  local: string | null;
  casa: string;
  situacao: string | null;
  realizada: boolean;
  descricao: string | null;
}

export interface ReuniaoComissao {
  codigo: string;
  titulo: string;
  dataInicio: string;
  realizada: boolean;
  situacao: string | null;
  status: string | null;
  local: string | null;
  colegiadoCodigo: string | null;
  colegiadoSigla: string | null;
  colegiadoNome: string | null;
  colegiadoCasa: string | null;
  partes: { tipo: string | null; finalidade: string | null; itens: string[] }[];
}

export type ProcessoAutoria = ProcessoApi;
export type DespesaCeaps = DespesaCeapsApi;
