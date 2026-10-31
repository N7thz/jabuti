// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { afterEach, expect, mock, test } from "bun:test";

import { descreverErro, digestDoErro, ErroConfiguracao, fontesQueFalharam, listarFontes, tentar } from "./erros";
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
    const falha = await tentar("o TCU", () => Promise.reject(new ErroHttp(503, "https://tcu.gov.br", "Service Unavailable")));
    expect(falha).toMatchObject({ ok: false, fonte: "o TCU", codigo: "fora-do-ar", passageiro: true });
    expect(falha.ok ? "" : falha.motivo).toContain("código 503");
  } finally {
    console.error = silencio;
  }
});

test("fontesQueFalharam e listarFontes montam o aviso", () => {
  const falha = (fonte: string) => ({ ok: false as const, fonte, ...descreverErro(new Error("x")) });
  const falhas = fontesQueFalharam(falha("o TCU"), { ok: true, dados: 1 }, falha("o Senado"), falha("o TCU"));
  expect(falhas.map((f) => f.fonte)).toEqual(["o TCU", "o Senado"]);
  expect(falhas[0]).not.toHaveProperty("ok");
  expect(listarFontes(falhas.map((f) => f.fonte))).toBe("o TCU e o Senado");
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

test("descreverErro explica em português pelo tipo do erro ou pelo digest", () => {
  expect(descreverErro(new ErroHttp(429, "u", "Too Many Requests")).codigo).toBe("limite");
  expect(descreverErro(new ErroHttp(404, "u", "Not Found"))).toMatchObject({ codigo: "nao-encontrado", passageiro: false });
  expect(descreverErro(new FalhaDeRede("u", { cause: new DOMException("t", "TimeoutError") })).codigo).toBe("tempo");
  expect(descreverErro(new FalhaDeRede("u", { cause: new TypeError("fetch failed") })).codigo).toBe("rede");
  expect(descreverErro(new ErroConfiguracao("sem chave"))).toMatchObject({ codigo: "configuracao", passageiro: false });
  expect(descreverErro(new SyntaxError("Unexpected token")).codigo).toBe("formato");
  expect(descreverErro("qualquer coisa").codigo).toBe("desconhecido");

  // No navegador, em produção, o Next entrega um Error genérico que só conserva o digest.
  const vindoDoServidor = Object.assign(new Error("An error occurred in the Server Components render."), {
    digest: digestDoErro("fora-do-ar", 502),
  });
  expect(descreverErro(vindoDoServidor).motivo).toBe("O servidor da fonte está com problema e respondeu com erro (código 502).");
});
