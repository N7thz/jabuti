import { createHash, timingSafeEqual } from "node:crypto";

import { z } from "zod";

/** As cargas de .github/workflows/sync.yml, uma por job. */
export const FONTES = ["camara", "senado", "emendas", "municipios", "tse"] as const;
export type Fonte = (typeof FONTES)[number];

/**
 * Etiquetas de cache (cacheTag) cujos dados vêm de tabelas que cada carga grava. Ficam de fora as etiquetas de dado
 * lido direto das APIs oficiais ("parlamentares", "leis", "consultas", "transparencia"...): a carga não muda nada
 * nelas, e invalidá-las só faria o site consultar as APIs de novo.
 *
 * - "votacoes": votacao e voto (Câmara e Senado).
 * - "cota": despesaCota, nos rankings da cota (Câmara e CEAPS do Senado).
 * - "medias": médias da casa, de evento, presenca, voto, despesaCota, proposicao e emenda.
 * - "sync": data da última carga (syncRun) da Câmara e do Senado.
 * - "cruzamentos": parlamentar, votoMunicipio (TSE), emenda e municipio.
 * - "emendas": emenda, com nomes de municipio e de parlamentar.
 * - "tse": candidatura, bens, receitas e votos por município, com emenda e municipio ao lado.
 * - "municipios": municipio (IBGE).
 * - "eleitos": eleito (TSE), com o parlamentar ao lado (o selo "Reeleito" depende de quem está em exercício).
 * Câmara e Senado também renovam "emendas": as listas de emendas mostram nome e partido do parlamentar.
 */
export const ETIQUETAS_POR_FONTE: Record<Fonte, readonly string[]> = {
  camara: ["votacoes", "cota", "medias", "sync", "cruzamentos", "emendas", "eleitos"],
  senado: ["votacoes", "cota", "medias", "sync", "cruzamentos", "emendas", "eleitos"],
  emendas: ["emendas", "medias", "cruzamentos", "tse"],
  municipios: ["municipios", "emendas", "cruzamentos", "tse"],
  tse: ["tse", "cruzamentos", "eleitos"],
};

export const pedidoRevalidar = z.object({
  fontes: z.array(z.enum(FONTES)).min(1).max(FONTES.length),
});

/** Etiquetas das fontes pedidas, sem repetir, na ordem em que aparecem. */
export function etiquetasDasFontes(fontes: readonly Fonte[]): string[] {
  return [...new Set(fontes.flatMap((f) => ETIQUETAS_POR_FONTE[f]))];
}

/**
 * Confere o cabeçalho `Authorization: Bearer <segredo>` em tempo constante. Os dois lados passam pelo SHA-256 antes
 * da comparação para terem o mesmo tamanho, e assim o tempo não revela nem o tamanho do segredo.
 */
export function segredoConfere(authorization: string | null, segredo: string): boolean {
  if (!authorization?.startsWith("Bearer ")) return false;
  const recebido = createHash("sha256").update(authorization.slice("Bearer ".length)).digest();
  const esperado = createHash("sha256").update(segredo).digest();
  return timingSafeEqual(recebido, esperado);
}
