// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { describe, expect, test } from "bun:test";

import { legislaturaPelaData } from "./legislatura";

describe("legislaturaPelaData", () => {
  test("dentro da 57ª legislatura, com as datas da API", () => {
    const esperada = { id: 57, dataInicio: "2023-02-01", dataFim: "2027-01-31" };
    expect(legislaturaPelaData("2023-02-01")).toEqual(esperada);
    expect(legislaturaPelaData("2026-11-04")).toEqual(esperada);
    expect(legislaturaPelaData("2027-01-31")).toEqual(esperada);
  });

  test("troca em 1º de fevereiro", () => {
    expect(legislaturaPelaData("2023-01-31").id).toBe(56);
    expect(legislaturaPelaData("2027-02-01")).toEqual({ id: 58, dataInicio: "2027-02-01", dataFim: "2031-01-31" });
  });

  test("legislaturas passadas", () => {
    expect(legislaturaPelaData("2019-02-01")).toEqual({ id: 56, dataInicio: "2019-02-01", dataFim: "2023-01-31" });
    expect(legislaturaPelaData("2015-06-10").id).toBe(55);
  });
});
