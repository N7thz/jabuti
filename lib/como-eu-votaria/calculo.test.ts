// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { describe, expect, test } from "bun:test";

import { calcular, letraDoVoto, respostasDoFormulario, respostasGuardadas, type MatrizVotos } from "./calculo";

const v = (id: string) => ({ id, data: "2026-10-14", proposicao: "PL 1/2026", ementa: "", descricao: "", resultado: null, href: "" });
const p = (chave: string, nome: string, partido: string, posicoes: string) => ({
  chave,
  nome,
  partido,
  uf: "DF",
  perfil: `/p/${chave}`,
  posicoes,
});

const matriz: MatrizVotos = {
  casa: "camara",
  votacoes: [v("a"), v("b"), v("c")],
  parlamentares: [
    p("1", "Ana", "AAA", "SSN"),
    p("2", "Bruno", "AAA", "NN-"),
    p("3", "Carla", "BBB", "A--"),
    p("4", "Davi", "BBB", "---"),
  ],
};

describe("calcular", () => {
  test("compara só onde os dois tomaram posição e ordena pela concordância", () => {
    const r = calcular({ a: "SIM", b: "NAO", c: "NAO" }, matriz);
    expect(r.respondidas).toBe(3);
    expect(r.parlamentares.map((x) => [x.nome, x.iguais, x.comparadas])).toEqual([
      ["Ana", 2, 3],
      ["Bruno", 1, 2],
      ["Carla", 0, 1],
    ]);
  });

  test("abstenção do parlamentar conta como diferente; quem não tomou posição fica fora", () => {
    const r = calcular({ a: "SIM" }, matriz);
    expect(r.parlamentares.find((x) => x.nome === "Carla")).toMatchObject({ iguais: 0, comparadas: 1 });
    expect(r.parlamentares.find((x) => x.nome === "Davi")).toBeUndefined();
  });

  test("soma por partido", () => {
    const r = calcular({ a: "SIM", b: "NAO", c: "NAO" }, matriz);
    expect(r.partidos).toEqual([
      { partido: "AAA", parlamentares: 2, comparadas: 5, iguais: 3 },
      { partido: "BBB", parlamentares: 1, comparadas: 1, iguais: 0 },
    ]);
  });

  test("sem respostas, lista vazia", () => {
    expect(calcular({}, matriz)).toEqual({ respondidas: 0, parlamentares: [], partidos: [] });
  });
});

test("letraDoVoto", () => {
  expect(["SIM", "NAO", "ABSTENCAO", "AUSENTE", "VOTO_SECRETO", "OBSTRUCAO"].map(letraDoVoto).join("")).toBe("SNA---");
});

test("respostasDoFormulario ignora pular, valores estranhos e votações desconhecidas", () => {
  const f = new FormData();
  f.set("v:a", "SIM");
  f.set("v:b", "PULAR");
  f.set("v:c", "TALVEZ");
  f.set("v:x", "NAO");
  expect(respostasDoFormulario(f, matriz.votacoes)).toEqual({ a: "SIM" });
});

test("respostasGuardadas descarta lixo", () => {
  expect(respostasGuardadas(null)).toEqual({});
  expect(respostasGuardadas("{quebrado")).toEqual({});
  expect(respostasGuardadas("[1]")).toEqual({});
  expect(respostasGuardadas('{"a":"SIM","b":"x","c":"NAO"}')).toEqual({ a: "SIM", c: "NAO" });
});
