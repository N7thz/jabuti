import "server-only";

import createClient from "openapi-fetch";

import { codigoDoStatus, digestDoErro, ErroConfiguracao } from "@/lib/erros-motivos";
import { createFetchResiliente, NA_PAGINA } from "@/lib/sync/run";

import type { paths } from "./schema";

export const BASE_URL = "https://api.portaldatransparencia.gov.br";

/**
 * Cliente tipado da API de dados do Portal da Transparência.
 * Os tipos vêm de `schema.d.ts`, gerado a partir do OpenAPI oficial (`bun run api:types`).
 *
 * Limites da API: 90 req/min das 06h às 23h59 e 300 req/min no restante do dia
 * (alguns endpoints têm limite próprio), por isso as consultas em `queries.ts` são cacheadas.
 * As chamadas têm o timeout curto e a nova tentativa das páginas (NA_PAGINA), inclusive no 429.
 */
export const transparencia = createClient<paths>({
  baseUrl: BASE_URL,
  headers: { Accept: "application/json" },
  fetch: createFetchResiliente(NA_PAGINA),
});

// A chave é lida na hora da consulta: sem ela, só as partes que usam o Portal avisam do problema,
// em vez de o import derrubar toda página que passa por este arquivo (ex.: o perfil do parlamentar).
transparencia.use({
  onRequest({ request }) {
    const chave = process.env.PORTAL_TRANSPARENCIA_API_KEY;
    if (!chave) {
      throw new ErroConfiguracao(
        "PORTAL_TRANSPARENCIA_API_KEY não definida. Copie .env.example para .env.local e preencha a chave.",
      );
    }
    request.headers.set("chave-api-dados", chave);
    return request;
  },
});

export class TransparenciaError extends Error {
  readonly digest: string;
  constructor(
    readonly status: number,
    readonly path: string,
    readonly body: unknown,
  ) {
    super(`Portal da Transparência respondeu ${status} em ${path}`);
    this.name = "TransparenciaError";
    // Leva o tipo da falha até a tela de erro (ver digestDoErro em lib/erros).
    this.digest = digestDoErro(codigoDoStatus(status), status);
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
