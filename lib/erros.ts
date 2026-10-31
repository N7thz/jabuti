import { unstable_rethrow } from "next/navigation";

import { descreverErro, type MotivoErro } from "./erros-motivos";

export * from "./erros-motivos";

// Regra do portal: fonte fora do ar não é lista vazia. Quando uma consulta falha, a página diz qual
// fonte não respondeu e por quê, em vez de mostrar "nenhum registro" (o que, num portal de cobrança,
// seria afirmar algo falso sobre alguém).

/** Fonte que não respondeu e o motivo, já em português. */
export type Falha = { fonte: string } & MotivoErro;

export type Resultado<T> = { ok: true; dados: T } | ({ ok: false } & Falha);

/**
 * Roda a consulta e devolve o resultado ou a falha com o nome da fonte e o motivo, sem derrubar o resto
 * da página. notFound(), redirect() e os sinais internos do Next continuam subindo.
 *
 * Use fora de "use cache": a função cacheada lança, nada fica guardado, e quem chama decide o que mostrar.
 */
export async function tentar<T>(fonte: string, consulta: Promise<T> | (() => Promise<T>)): Promise<Resultado<T>> {
  try {
    return { ok: true, dados: await (typeof consulta === "function" ? consulta() : consulta) };
  } catch (error) {
    unstable_rethrow(error);
    console.error(`[fonte indisponível] ${fonte}:`, error);
    return { ok: false, fonte, ...descreverErro(error) };
  }
}

/** Falhas sem repetir a fonte, para o aviso "não conseguimos consultar X". */
export function fontesQueFalharam(...resultados: Resultado<unknown>[]): Falha[] {
  const falhas = new Map<string, Falha>();
  for (const r of resultados) {
    if (!r.ok && !falhas.has(r.fonte)) {
      const { ok: _ok, ...falha } = r;
      falhas.set(r.fonte, falha);
    }
  }
  return [...falhas.values()];
}

/** "o TCU", "o TCU e o Senado", "o TCU, o Senado e a Câmara". */
export function listarFontes(fontes: string[]) {
  if (fontes.length <= 1) return fontes[0] ?? "";
  return `${fontes.slice(0, -1).join(", ")} e ${fontes.at(-1)}`;
}
