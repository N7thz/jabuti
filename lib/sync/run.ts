import type { FonteSync } from "../generated/prisma/enums";
import type { PrismaClient } from "../prisma";

/**
 * Executa uma sincronização registrando-a em `SyncRun` (base do "dados atualizados em" das páginas).
 * `job` devolve quantos registros gravou; erros são registrados e relançados.
 */
export async function registrarSync(
  prisma: PrismaClient,
  fonte: FonteSync,
  escopo: string | null,
  job: () => Promise<number>,
) {
  const run = await prisma.syncRun.create({ data: { fonte, escopo } });

  try {
    const registros = await job();
    await prisma.syncRun.update({
      where: { id: run.id },
      data: { status: "SUCESSO", registros, finalizadoEm: new Date() },
    });
    return registros;
  } catch (error) {
    await prisma.syncRun.update({
      where: { id: run.id },
      data: { status: "ERRO", erro: String(error).slice(0, 2000), finalizadoEm: new Date() },
    });
    throw error;
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const RETRY_AFTER_MAX_MS = 2 * 60 * 1000;

/** Espera pedida pelo header `Retry-After` (segundos ou data HTTP), limitada a 2 min. */
function retryAfterMs(response: Response) {
  const valor = response.headers.get("Retry-After")?.trim();
  if (!valor) return null;
  const ms = /^\d+$/.test(valor) ? Number(valor) * 1000 : Date.parse(valor) - Date.now();
  return Number.isFinite(ms) ? Math.min(Math.max(ms, 0), RETRY_AFTER_MAX_MS) : null;
}

/** Sem resposta HTTP: conexão recusada/resetada, DNS (chegam como TypeError ou com `code`) ou timeout. */
function isErroDeRede(error: unknown) {
  return (
    error instanceof TypeError ||
    (error instanceof DOMException && error.name === "TimeoutError") ||
    (error instanceof Error && "code" in error)
  );
}

/**
 * `fetch` de JSON com timeout, novas tentativas para falha de rede e 429/5xx (respeitando
 * `Retry-After`) e intervalo mínimo entre chamadas, inclusive concorrentes, para respeitar o
 * limite das APIs públicas (Portal: 90 req/min no horário comercial). Outros 4xx falham na hora.
 */
export function createFetcher({
  minIntervalMs = 0,
  retries = 4,
  timeoutMs = 30_000,
  headers = {} as HeadersInit,
} = {}) {
  // Horário reservado para a próxima chamada; reservar antes de esperar serializa chamadas simultâneas.
  let proximo = 0;
  async function aguardarVez() {
    const inicio = Math.max(Date.now(), proximo);
    proximo = inicio + minIntervalMs;
    const espera = inicio - Date.now();
    if (espera > 0) await sleep(espera);
  }

  return async function fetchJson<T>(url: string | URL): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      await aguardarVez();

      let response: Response;
      try {
        response = await fetch(url, {
          headers: { Accept: "application/json", ...headers },
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (response.ok) return (await response.json()) as T;
      } catch (error) {
        if (!isErroDeRede(error)) throw error;
        if (attempt >= retries) throw new Error(`Falha de rede em ${url}`, { cause: error });
        await sleep(2 ** attempt * 1000);
        continue;
      }

      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt >= retries) {
        throw new Error(`${response.status} ${response.statusText} em ${url}`);
      }
      await sleep(retryAfterMs(response) ?? 2 ** attempt * 1000);
    }
  };
}

/** Remove acentos e padroniza em maiúsculas para casar nomes entre fontes diferentes. */
export function normalizarNome(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}
