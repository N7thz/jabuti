// Textos em linguagem simples para os códigos do Transferegov.

const SITUACAO_PLANO_ACAO: Record<string, string> = {
  CIENTE: "Liberada",
  IMPEDIDO: "Impedida",
  IMPEDIDO_REJEICAO_PLANO_TRABALHO: "Impedida (plano de trabalho rejeitado)",
};

/** Situação da emenda Pix: "Liberada" quando o ente deu ciência e pode receber; "Impedida" quando algo trava o repasse. */
export const situacaoEmendaPix = (situacao: string) => SITUACAO_PLANO_ACAO[situacao] ?? situacao;

export const isEmendaPixImpedida = (situacao: string) => situacao.startsWith("IMPEDIDO");

const SITUACAO_PLANO_TRABALHO: Record<string, string> = {
  CONCLUIDO_NT_TCU: "Concluído",
  APROVADO: "Aprovado",
  REPROVADO: "Reprovado",
};

export const situacaoPlanoTrabalho = (situacao: string) => SITUACAO_PLANO_TRABALHO[situacao] ?? situacao;

/** "10-Saúde / 302-Assistência..., 15-Urbanismo / 451-..." → ["Saúde", "Urbanismo"]. */
export function areasDaEmendaPix(areas: string | null) {
  if (!areas) return [];
  const funcoes = areas.split(",").map((parte) => /^\s*\d+-([^/]+)/.exec(parte)?.[1].trim());
  return [...new Set(funcoes.filter((f): f is string => Boolean(f)))];
}
