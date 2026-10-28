// Tipos das respostas da API de Dados Abertos da Câmara (v2), conferidos contra o JSON real.
// Só os campos que o portal usa; a API devolve mais coisas.

export interface Link {
  rel: "self" | "next" | "first" | "last" | "prev";
  href: string;
}

export interface Pagina<T> {
  dados: T[];
  links: Link[];
}

export interface Detalhe<T> {
  dados: T;
  links: Link[];
}

export interface Legislatura {
  id: number;
  dataInicio: string; // AAAA-MM-DD
  dataFim: string;
}

/** Item de /deputados e também o objeto `deputado_` de /votacoes/{id}/votos e itens de /eventos/{id}/deputados. */
export interface DeputadoResumo {
  id: number;
  nome: string;
  siglaPartido: string | null;
  siglaUf: string | null;
  idLegislatura: number;
  urlFoto: string | null;
  email: string | null;
}

export interface Votacao {
  /** Ex.: "2455564-65" (id da proposição/evento + sequência). */
  id: string;
  /** AAAA-MM-DD */
  data: string;
  /** AAAA-MM-DDTHH:mm:ss, horário de Brasília sem fuso. */
  dataHoraRegistro: string;
  siglaOrgao: string | null;
  uriEvento: string | null;
  /** Ex.: "REQ 191/2025 CSPCCO"; só vem quando a votação tem um objeto único. */
  proposicaoObjeto: string | null;
  uriProposicaoObjeto: string | null;
  descricao: string | null;
  /** 1 aprovada, 0 rejeitada, null quando não se aplica. */
  aprovacao: 0 | 1 | null;
}

export interface ProposicaoResumo {
  id: number;
  siglaTipo: string;
  numero: number;
  /** Alguns tipos (RPD, EMP...) vêm com ano 0. */
  ano: number;
  ementa: string;
  /** AAAA-MM-DDTHH:mm sem fuso. */
  dataApresentacao: string | null;
}

export interface VotacaoDetalhe extends Omit<Votacao, "proposicaoObjeto" | "uriProposicaoObjeto" | "uriEvento"> {
  idEvento: number | null;
  objetosPossiveis: ProposicaoResumo[];
  proposicoesAfetadas: ProposicaoResumo[];
}

export interface VotoApi {
  /** "Sim" | "Não" | "Abstenção" | "Obstrução" | "Artigo 17" (e outros possíveis). */
  tipoVoto: string;
  dataRegistroVoto: string;
  deputado_: DeputadoResumo;
}

export interface ProposicaoDetalhe extends ProposicaoResumo {
  uri: string;
  statusProposicao: { descricaoSituacao: string | null } | null;
  urlInteiroTeor: string | null;
}

export interface Evento {
  id: number;
  dataHoraInicio: string;
  dataHoraFim: string | null;
  situacao: string | null;
  descricaoTipo: string;
  descricao: string | null;
  localExterno: string | null;
  localCamara: { nome: string | null } | null;
  orgaos: { id: number; sigla: string; nome: string; tipoOrgao: string | null }[];
  urlRegistro: string | null;
}

export interface Despesa {
  ano: number;
  mes: number;
  tipoDespesa: string;
  /** Vem como string; "0" ou vazio em alguns lançamentos antigos. */
  codDocumento: string | null;
  tipoDocumento: string | null;
  dataDocumento: string | null; // AAAA-MM-DDT00:00:00
  numDocumento: string | null;
  urlDocumento: string | null;
  nomeFornecedor: string | null;
  cnpjCpfFornecedor: string | null;
  valorLiquido: number;
}
