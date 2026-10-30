// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { afterEach, expect, mock, test } from "bun:test";

import { fontesQueFalharam, listarFontes, tentar } from "./erros";
import { createFetcher, ErroHttp, FalhaDeRede, naoEncontrado } from "./sync/run";

const fetchOriginal = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = fetchOriginal;
});

test("tentar devolve os dados ou a fonte que falhou, sem lançar", async () => {
  const silencio = console.error;
  console.error = () => {};
  try {
    expect(await tentar("o TCU", Promise.resolve([1]))).toEqual({ ok: true, dados: [1] });
    expect(await tentar("o TCU", () => Promise.reject(new Error("503")))).toEqual({ ok: false, fonte: "o TCU" });
  } finally {
    console.error = silencio;
  }
});

test("fontesQueFalharam e listarFontes montam o aviso", () => {
  const falhas = fontesQueFalharam(
    { ok: false, fonte: "o TCU" },
    { ok: true, dados: 1 },
    { ok: false, fonte: "o Senado" },
    { ok: false, fonte: "o TCU" },
  );
  expect(falhas).toEqual(["o TCU", "o Senado"]);
  expect(listarFontes(falhas)).toBe("o TCU e o Senado");
  expect(listarFontes(["a Câmara", "o TCU", "o Senado"])).toBe("a Câmara, o TCU e o Senado");
  expect(listarFontes([])).toBe("");
});

test("fetcher: 404 vira ErroHttp reconhecido como não encontrado, sem nova tentativa", async () => {
  const chamada = mock(async () => new Response("{}", { status: 404, statusText: "Not Found" }));
  globalThis.fetch = chamada as unknown as typeof fetch;

  const erro = await createFetcher({ retries: 3 })("https://exemplo.gov.br/x").catch((e: unknown) => e);
  expect(erro).toBeInstanceOf(ErroHttp);
  expect(naoEncontrado(erro)).toBe(true);
  expect(chamada).toHaveBeenCalledTimes(1);
});

test("fetcher: 503 tenta de novo até o limite e não é tratado como não encontrado", async () => {
  const chamada = mock(async () => new Response("", { status: 503, statusText: "Service Unavailable" }));
  globalThis.fetch = chamada as unknown as typeof fetch;

  const erro = await createFetcher({ retries: 1, esperaMaximaMs: 0 })("https://exemplo.gov.br/x").catch((e: unknown) => e);
  expect(erro).toBeInstanceOf(ErroHttp);
  expect((erro as ErroHttp).status).toBe(503);
  expect(naoEncontrado(erro)).toBe(false);
  expect(chamada).toHaveBeenCalledTimes(2);
});

test("fetcher: sem resposta vira FalhaDeRede depois das tentativas", async () => {
  const chamada = mock(async () => {
    throw new TypeError("fetch failed");
  });
  globalThis.fetch = chamada as unknown as typeof fetch;

  const erro = await createFetcher({ retries: 1, esperaMaximaMs: 0 })("https://exemplo.gov.br/x").catch((e: unknown) => e);
  expect(erro).toBeInstanceOf(FalhaDeRede);
  expect(chamada).toHaveBeenCalledTimes(2);
});
