// Recursos da API de Transferências Especiais ("emendas Pix") do Transferegov (PostgREST).
// Só os campos que o portal usa; os nomes seguem a API.

export type PlanoAcao = {
  id_plano_acao: number;
  codigo_plano_acao: string;
  ano_plano_acao: number;
  situacao_plano_acao: string;
  cnpj_beneficiario_plano_acao: string;
  nome_beneficiario_plano_acao: string;
  uf_beneficiario_plano_acao: string;
  nome_parlamentar_emenda_plano_acao: string;
  /** Mesmo valor de `codigoEmenda` no Portal da Transparência (ano + código do autor + sequencial). */
  numero_emenda_parlamentar_plano_acao: string;
  codigo_descricao_areas_politicas_publicas_plano_acao: string | null;
  motivo_impedimento_plano_acao: string | null;
  valor_custeio_plano_acao: number;
  valor_investimento_plano_acao: number;
};

/** Quem executa o dinheiro no ente beneficiário e com qual objeto. */
export type Executor = {
  id_executor: number;
  id_plano_acao: number;
  cnpj_executor: string;
  nome_executor: string;
  objeto_executor: string | null;
  vl_custeio_executor: number;
  vl_investimento_executor: number;
};

export type Meta = {
  id_meta: number;
  id_executor: number;
  nome_meta: string;
  desc_meta: string | null;
  un_medida_meta: string | null;
  qt_uniade_meta: number | null;
};

export type PlanoTrabalho = {
  id_plano_trabalho: number;
  id_plano_acao: number;
  situacao_plano_trabalho: string;
  data_inicio_execucao_plano_trabalho: string | null;
  data_fim_execucao_plano_trabalho: string | null;
  prazo_execucao_meses_plano_trabalho: number | null;
};

/** Relatório de gestão que o ente envia dizendo quanto já executou. */
export type RelatorioGestao = {
  id_relatorio_gestao_novo: number;
  id_plano_acao: number;
  data_e_hora_relatorio_gestao_novo: string;
  situacao_relatorio_gestao_novo: string;
  valor_executado_relatorio_gestao_novo: number | null;
  valor_pendente_relatorio_gestao_novo: number | null;
};

export type Empenho = {
  id_empenho: number;
  id_plano_acao: number;
  numero_empenho: string;
  descricao_situacao_empenho: string | null;
  data_emissao_empenho: string | null;
  valor_empenho: number;
};
