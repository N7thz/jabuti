// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { describe, expect, test } from "bun:test";

import { ETIQUETAS_POR_FONTE, etiquetasDasFontes, FONTES, pedidoRevalidar, segredoConfere } from "./revalidar";

describe("etiquetasDasFontes", () => {
  test("toda fonte tem ao menos uma etiqueta", () => {
    for (const fonte of FONTES) expect(ETIQUETAS_POR_FONTE[fonte].length).toBeGreaterThan(0);
  });

  test("junta as etiquetas de várias fontes sem repetir", () => {
    expect(etiquetasDasFontes(["camara", "senado"])).toEqual(["votacoes", "cota", "medias", "sync", "cruzamentos", "emendas"]);
    expect(etiquetasDasFontes(["emendas", "tse"])).toEqual(["emendas", "medias", "cruzamentos", "tse"]);
  });

  test("não inclui etiquetas de dado lido direto das APIs", () => {
    const todas = etiquetasDasFontes(FONTES);
    for (const daApi of ["parlamentares", "leis", "consultas", "transparencia", "transferegov", "siconfi", "tcu"]) {
      expect(todas).not.toContain(daApi);
    }
  });
});

describe("pedidoRevalidar", () => {
  test("aceita fontes conhecidas", () => {
    expect(pedidoRevalidar.safeParse({ fontes: ["camara", "tse"] }).success).toBe(true);
  });

  test("recusa fonte desconhecida, lista vazia e corpo sem fontes", () => {
    expect(pedidoRevalidar.safeParse({ fontes: ["leis"] }).success).toBe(false);
    expect(pedidoRevalidar.safeParse({ fontes: [] }).success).toBe(false);
    expect(pedidoRevalidar.safeParse({}).success).toBe(false);
  });
});

describe("segredoConfere", () => {
  test("aceita o segredo certo", () => {
    expect(segredoConfere("Bearer abc123", "abc123")).toBe(true);
  });

  test("recusa segredo errado, de outro tamanho, sem Bearer ou ausente", () => {
    expect(segredoConfere("Bearer abc124", "abc123")).toBe(false);
    expect(segredoConfere("Bearer abc1234", "abc123")).toBe(false);
    expect(segredoConfere("abc123", "abc123")).toBe(false);
    expect(segredoConfere("Bearer ", "abc123")).toBe(false);
    expect(segredoConfere(null, "abc123")).toBe(false);
  });
});
