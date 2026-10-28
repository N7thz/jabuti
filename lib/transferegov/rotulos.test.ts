// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { expect, test } from "bun:test";

import { areasDaEmendaPix, situacaoEmendaPix } from "./rotulos";

test("areasDaEmendaPix fica só com as funções, sem repetir", () => {
  expect(
    areasDaEmendaPix(
      "10-Saúde / 302-Assistência Hospitalar e Ambulatorial , 15-Urbanismo / 451-Infraestrutura Urbana, 10-Saúde / 301-Atenção Básica",
    ),
  ).toEqual(["Saúde", "Urbanismo"]);
  expect(areasDaEmendaPix(null)).toEqual([]);
});

test("situacaoEmendaPix traduz os códigos e mantém os desconhecidos", () => {
  expect(situacaoEmendaPix("CIENTE")).toBe("Liberada");
  expect(situacaoEmendaPix("NOVO_CODIGO")).toBe("NOVO_CODIGO");
});
