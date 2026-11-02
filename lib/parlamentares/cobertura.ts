// Quanto do período o banco precisa cobrir para uma média da casa valer (ver medias.ts).

/**
 * Meses do ano que já deveriam ter gastos da cota no banco: todos os anteriores ao atual (o mês
 * corrente ainda está chegando e pode estar vazio). Ano passado: os 12.
 */
export function mesesComDados(ano: number, hoje = new Date()) {
  if (ano < hoje.getUTCFullYear()) return 12;
  if (ano > hoje.getUTCFullYear()) return 0;
  return Math.max(1, hoje.getUTCMonth());
}
