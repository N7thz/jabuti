import type { IdTermo } from "../glossario";

// Funções puras sobre projetos de lei do Senado (/processo) e da Câmara (/proposicoes), usadas em /leis.

/** Tipos que podem virar lei ou mudar a Constituição. Requerimentos, vetos e decretos ficam de fora. */
export const TIPOS_DE_LEI: Record<string, { nome: string; termo: IdTermo }> = {
  PL: { nome: "Projeto de lei", termo: "projeto-de-lei" },
  PLS: { nome: "Projeto de lei do Senado", termo: "projeto-de-lei" },
  PLC: { nome: "Projeto de lei da Câmara", termo: "projeto-de-lei" },
  PLN: { nome: "Projeto de lei do Congresso (orçamento)", termo: "orcamento" },
  PLV: { nome: "Projeto de lei de conversão", termo: "medida-provisoria" },
  PLP: { nome: "Projeto de lei complementar", termo: "lei-complementar" },
  PEC: { nome: "Proposta de emenda à Constituição", termo: "pec" },
  MPV: { nome: "Medida provisória", termo: "medida-provisoria" },
};

/** Tipos pedidos à Câmara na lista de recém-apresentados (lá a sigla é sempre a atual). */
export const TIPOS_CAMARA = ["PL", "PLP", "PEC", "MPV"];

/** "PL 5649/2026" → "PL"; "REQ 49/2025 - CI" → "REQ". */
export const siglaDe = (identificacao: string) => identificacao.trim().split(/\s+/)[0]?.toUpperCase() ?? "";

export const ehTipoDeLei = (identificacao: string) => siglaDe(identificacao) in TIPOS_DE_LEI;

export interface Norma {
  /** "Lei nº 15.404, de 08/05/2026". */
  texto: string;
  /** AAAA-MM-DD, para ordenar. */
  data: string;
}

/**
 * Lê o `normaGerada` do Senado ("Lei nº 15.404 de 08/05/2026"). Só leis, leis complementares e emendas
 * constitucionais: decretos legislativos e resoluções não mudam as regras para o cidadão do mesmo jeito.
 */
export function lerNorma(texto: string | null | undefined): Norma | null {
  const m = texto?.trim().match(/^(Lei Complementar|Lei|Emenda Constitucional) nº ([\d.]+),? de (\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const [, tipo, numero, dia, mes, ano] = m;
  return { texto: `${tipo} nº ${numero}, de ${dia}/${mes}/${ano}`, data: `${ano}-${mes}-${dia}` };
}

// Nomes próprios que o Senado escreve em maiúsculas junto com o resto da situação.
const NOMES_PROPRIOS: [RegExp, string][] = [
  [/câmara dos deputados/g, "Câmara dos Deputados"],
  [/senado federal/g, "Senado Federal"],
  [/congresso nacional/g, "Congresso Nacional"],
  [/presidência da república/g, "Presidência da República"],
  [/ordem do dia/g, "Ordem do Dia"],
  [/\bccj\b/g, "CCJ"],
  [/\bcmo\b/g, "CMO"],
];

/** "REMETIDA À CÂMARA DOS DEPUTADOS" → "Remetida à Câmara dos Deputados". Texto já misto fica como veio. */
export function situacaoLegivel(texto: string | null | undefined) {
  const t = texto?.trim();
  if (!t) return null;
  if (t !== t.toUpperCase()) return t;
  let s = t.toLocaleLowerCase("pt-BR");
  for (const [padrao, nome] of NOMES_PROPRIOS) s = s.replace(padrao, nome);
  return s.charAt(0).toLocaleUpperCase("pt-BR") + s.slice(1);
}

// Decisões que aparecem em projetos de lei; o resto cai no texto genérico de `decisaoLegivel`.
const DECISOES: Record<string, string> = {
  APROVADA_NO_PLENARIO: "Aprovado pelo Plenário do Senado",
  APROVADA_PARCIALMENTE: "Aprovado em parte pelo Plenário do Senado",
  APROVADO_NA_INTEGRA: "Aprovado na íntegra",
  APROVADA_EM_COMISSAO_TERMINATIVA: "Aprovado em comissão, sem passar pelo Plenário",
  APROVADO_PLV: "Aprovado com mudanças, como projeto de lei de conversão",
  REJEITADO_PLENARIO: "Rejeitado pelo Plenário do Senado",
  REJEITADO_PLENARIO_CD: "Rejeitado pelo Plenário da Câmara",
  REJEITADO_COMISSAO_TERM: "Rejeitado em comissão, sem passar pelo Plenário",
  REJEITADO_COMISSAO_NAO_TERM: "Rejeitado em comissão (o Plenário ainda decide)",
  REJEITADO_INCONSTICIONALIDADE_CCJ: "Rejeitado pela CCJ por ser inconstitucional",
  PREJUDICADO: "Prejudicado (perdeu o objeto)",
  RETIRADO_PELO_AUTOR: "Retirado pelo autor",
  PERDA_EFICACIA: "Perdeu a validade: o Congresso não votou a tempo",
  SEM_EFICACIA: "Sem efeito",
  ARQUIVADO_FIM_LEGISLATURA: "Arquivado no fim da legislatura",
};

/** Resultado da decisão em português corrente, e se foi aprovação, rejeição ou outra coisa. */
export function decisaoLegivel(sigla: string | null | undefined) {
  if (!sigla) return null;
  const texto = DECISOES[sigla] ?? situacaoLegivel(sigla.replace(/_/g, " "))!;
  const tom: "aprovado" | "rejeitado" | "neutro" = sigla.startsWith("APROVAD")
    ? "aprovado"
    : sigla.startsWith("REJEITAD")
      ? "rejeitado"
      : "neutro";
  return { texto, tom };
}

/** De onde veio o projeto, do ponto de vista do Senado: "Iniciadora" começou lá, "Revisora" veio da Câmara. */
export function origemNoSenado(objetivo: string | null | undefined) {
  if (objetivo === "Revisora") return "Veio da Câmara";
  if (objetivo === "Iniciadora") return "Começou no Senado";
  return null;
}

export const urlMateriaSenado = (codigoMateria: number) =>
  `https://www25.senado.leg.br/web/atividade/materias/-/materia/${codigoMateria}`;

export const urlProposicaoCamara = (id: number) => `https://www.camara.leg.br/propostas-legislativas/${id}`;
