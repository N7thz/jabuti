import "server-only";

import createClient from "openapi-fetch";

import type { paths } from "./schema";

export const BASE_URL = "https://api.portaldatransparencia.gov.br";

const apiKey = process.env.PORTAL_TRANSPARENCIA_API_KEY;

if (!apiKey) {
  throw new Error(
    "PORTAL_TRANSPARENCIA_API_KEY não definida. Copie .env.example para .env.local e preencha a chave.",
  );
}

/**
 * Cliente tipado da API de dados do Portal da Transparência.
 * Os tipos vêm de `schema.d.ts`, gerado a partir do OpenAPI oficial (`bun run api:types`).
 *
 * Limites da API: 90 req/min das 06h às 23h59 e 300 req/min no restante do dia
 * (alguns endpoints têm limite próprio), por isso as consultas em `queries.ts` são cacheadas.
 */
export const transparencia = createClient<paths>({
  baseUrl: BASE_URL,
  headers: {
    "chave-api-dados": apiKey,
    Accept: "application/json",
  },
});

export class TransparenciaError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    readonly body: unknown,
  ) {
    super(`Portal da Transparência respondeu ${status} em ${path}`);
    this.name = "TransparenciaError";
  }
}

/** Desembrulha o resultado do openapi-fetch, lançando `TransparenciaError` em caso de falha. */
export function unwrap<T>(result: {
  data?: T;
  error?: unknown;
  response: Response;
}): T {
  if (result.error !== undefined || result.data === undefined) {
    const url = new URL(result.response.url);
    throw new TransparenciaError(result.response.status, url.pathname, result.error);
  }
  return result.data;
}
