// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { describe, expect, test } from "bun:test";

import { lerEmLote } from "./lote";

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("lerEmLote", () => {
  test("lê tudo, conta as falhas e ignora o que veio null sem contar como falta", async () => {
    const r = await lerEmLote([1, 2, 3, 4, 5], { paralelo: 2, prazoMs: 1_000 }, async (n) => {
      if (n === 2) throw new Error("fora do ar");
      return n === 4 ? null : n * 10;
    });
    expect(r.lidos.sort((a, b) => a - b)).toEqual([10, 30, 50]);
    expect(r.faltaram).toBe(1);
  });

  test("nunca passa do limite de pedidos ao mesmo tempo", async () => {
    let agora = 0;
    let pico = 0;
    await lerEmLote(Array.from({ length: 12 }, (_, i) => i), { paralelo: 3, prazoMs: 1_000 }, async (n) => {
      agora++;
      pico = Math.max(pico, agora);
      await esperar(5);
      agora--;
      return n;
    });
    expect(pico).toBe(3);
  });

  test("um item lento ocupa uma vaga só: os outros seguem pelas vagas livres", async () => {
    const inicio = Date.now();
    const r = await lerEmLote([0, 1, 2, 3, 4, 5, 6, 7], { paralelo: 2, prazoMs: 1_000 }, async (n) => {
      await esperar(n === 0 ? 80 : 5);
      return n;
    });
    expect(r.lidos).toHaveLength(8);
    // Com lotes fixos de 2 o item lento seguraria o primeiro lote; aqui os outros 7 andam na outra vaga.
    expect(Date.now() - inicio).toBeLessThan(150);
  });

  test("passado o prazo, nada novo começa e o que não foi tentado conta como falta", async () => {
    const tentados: number[] = [];
    const r = await lerEmLote([1, 2, 3, 4, 5, 6], { paralelo: 1, prazoMs: 30 }, async (n) => {
      tentados.push(n);
      await esperar(20);
      return n;
    });
    expect(tentados.length).toBeLessThan(6);
    expect(r.lidos.length + r.faltaram).toBe(6);
    expect(r.faltaram).toBe(6 - tentados.length);
  });

  test("lista vazia não espera nada", async () => {
    expect(await lerEmLote([], { paralelo: 4, prazoMs: 1_000 }, async () => 1)).toEqual({ lidos: [], faltaram: 0 });
  });
});
