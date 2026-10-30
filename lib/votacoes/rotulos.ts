import type { TipoVoto } from "../generated/prisma/enums";

// Funções puras sobre votos já normalizados (TipoVoto), usadas nas páginas de votação, no perfil e na comparação.

export const ROTULO_VOTO: Record<TipoVoto, string> = {
  SIM: "Sim",
  NAO: "Não",
  ABSTENCAO: "Abstenção",
  OBSTRUCAO: "Obstrução",
  PRESIDENTE: "Presidindo a sessão",
  PRESENTE_SEM_VOTO: "Presente, sem voto",
  VOTO_SECRETO: "Votou (secreto)",
  AUSENTE: "Ausente",
  AUSENCIA_JUSTIFICADA: "Ausência justificada",
  OUTRO: "Outro",
};

/** Colunas do placar. O resto (ausências, presidente, secreto...) vai para "Outros". */
export const COLUNAS_PLACAR = ["SIM", "NAO", "ABSTENCAO", "OBSTRUCAO"] as const;
export type ColunaPlacar = (typeof COLUNAS_PLACAR)[number] | "OUTROS";

export const colunaDoVoto = (tipo: TipoVoto): ColunaPlacar =>
  (COLUNAS_PLACAR as readonly string[]).includes(tipo) ? (tipo as ColunaPlacar) : "OUTROS";

export type Placar = Record<ColunaPlacar, number> & { total: number };

const placarVazio = (): Placar => ({ SIM: 0, NAO: 0, ABSTENCAO: 0, OBSTRUCAO: 0, OUTROS: 0, total: 0 });

export function contarPlacar(votos: { tipo: TipoVoto }[]) {
  const placar = placarVazio();
  for (const v of votos) {
    placar[colunaDoVoto(v.tipo)]++;
    placar.total++;
  }
  return placar;
}

/** Placar por grupo (partido, UF), do grupo com mais votos para o com menos. */
export function placarPorGrupo<T extends { tipo: TipoVoto }>(votos: T[], grupo: (v: T) => string | null) {
  const grupos = Object.groupBy(votos, (v) => grupo(v) ?? "Sem informação");
  return Object.entries(grupos)
    .map(([nome, itens = []]) => ({ nome, placar: contarPlacar(itens) }))
    .sort((a, b) => b.placar.total - a.placar.total || a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Votou de fato sim, não ou abstenção (o que entra na comparação de posições). */
export const votoDePosicao = (tipo: TipoVoto) => tipo === "SIM" || tipo === "NAO" || tipo === "ABSTENCAO";

/**
 * Concordância entre dois parlamentares nas votações em que ambos tomaram posição (sim, não ou abstenção).
 * Ausências e votos secretos ficam fora: não dá para dizer se concordaram.
 */
export function concordancia(a: Map<string, TipoVoto>, b: Map<string, TipoVoto>) {
  let comuns = 0;
  let iguais = 0;
  for (const [votacao, tipoA] of a) {
    const tipoB = b.get(votacao);
    if (!tipoB || !votoDePosicao(tipoA) || !votoDePosicao(tipoB)) continue;
    comuns++;
    if (tipoA === tipoB) iguais++;
  }
  return { comuns, iguais };
}
