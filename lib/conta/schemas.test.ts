// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { describe, expect, test } from "bun:test";

import { destinoSeguro, nome } from "./schemas";

describe("destinoSeguro", () => {
  test("mantém caminhos internos, com busca e âncora", () => {
    expect(destinoSeguro("/configuracoes#conta")).toBe("/configuracoes#conta");
    expect(destinoSeguro("/parlamentares?uf=SP&pagina=2")).toBe("/parlamentares?uf=SP&pagina=2");
    expect(destinoSeguro("/")).toBe("/");
  });

  test("recusa o que o navegador levaria para outro site", () => {
    for (const ataque of [
      "//evil.com",
      "/\\evil.com",
      "/\t/evil.com",
      "/\n/evil.com",
      "https://evil.com",
      "evil.com",
      "javascript:alert(1)",
      `/${"a".repeat(400)}`,
    ]) {
      expect(destinoSeguro(ataque)).toBe("/");
    }
  });

  test("recusa o que não é texto", () => {
    expect(destinoSeguro(undefined)).toBe("/");
    expect(destinoSeguro(["/a"])).toBe("/");
  });
});

describe("nome do cadastro", () => {
  test("aceita nomes comuns", () => {
    for (const valor of ["Ana", "João da Silva", "Maria-José D'Ávila", "J. R. R. Souza"]) {
      expect(nome.safeParse(valor).success).toBe(true);
    }
  });

  test("recusa link, arroba e quebra de linha", () => {
    for (const valor of ["Ana http://golpe.com", "golpe.com/x", "Acesse golpe.com", "ana@site", "Ana\nSua conta foi bloqueada", "Ana: clique"]) {
      expect(nome.safeParse(valor).success).toBe(false);
    }
  });
});
