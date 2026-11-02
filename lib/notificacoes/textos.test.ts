// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { describe, expect, test } from "bun:test";

import { estadoDoProjeto, hashCurto, lerChave, textoEstado, textoVotos, tituloVotacao } from "./textos";

describe("lerChave", () => {
  test("separa casa e id", () => {
    expect(lerChave("camara-204379")).toEqual({ casa: "camara", id: "204379" });
    expect(lerChave("senado-8441243")).toEqual({ casa: "senado", id: "8441243" });
  });
  test("recusa formato estranho", () => {
    expect(lerChave("PL")).toBeNull();
    expect(lerChave("camara-")).toBeNull();
  });
});

describe("tituloVotacao", () => {
  test("usa a proposição quando houver", () => {
    expect(tituloVotacao({ descricao: "x", proposicao: { siglaTipo: "PL", numero: 1087, ano: 2025 } })).toBe("Votação do PL 1087/2025");
  });
  test("corta descrição longa", () => {
    const t = tituloVotacao({ descricao: "a".repeat(200), proposicao: null });
    expect(t.length).toBe(90);
    expect(t.endsWith("…")).toBe(true);
  });
});

test("textoVotos ordena por nome e usa os rótulos do portal", () => {
  expect(
    textoVotos([
      { nome: "Zélia", tipo: "NAO" },
      { nome: "Ana", tipo: "SIM" },
    ]),
  ).toBe("Ana: Sim · Zélia: Não");
});

describe("estado do projeto", () => {
  test("sem situação não há estado", () => {
    expect(estadoDoProjeto(null, "2026-01-01")).toBeNull();
    expect(estadoDoProjeto("  ", null)).toBeNull();
  });
  test("muda quando a data muda", () => {
    expect(estadoDoProjeto("REMETIDA À CÂMARA", "2025-03-17")).not.toBe(estadoDoProjeto("REMETIDA À CÂMARA", "2025-03-18T10:00"));
  });
  test("texto legível com data", () => {
    expect(textoEstado("Aguardando sanção|2026-10-30")).toBe("Nova situação: Aguardando sanção (desde 30/10/2026).");
  });
  test("hash estável", () => {
    expect(hashCurto("abc")).toBe(hashCurto("abc"));
    expect(hashCurto("abc")).not.toBe(hashCurto("abd"));
  });
});
