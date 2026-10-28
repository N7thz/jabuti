// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { expect, test } from "bun:test";

import { termoDoTipo } from "./emendas/rotulos";
import { GLOSSARIO, TEMAS } from "./glossario";

test("cada verbete tem id único, tema conhecido e definição curta de uma frase", () => {
  const ids = GLOSSARIO.map((v) => v.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const v of GLOSSARIO) {
    expect(Object.keys(TEMAS)).toContain(v.tema);
    // O balão mostra só `curto`: precisa caber num relance.
    expect(v.curto.length).toBeLessThanOrEqual(180);
    expect(v.explicacao.length).toBeGreaterThan(0);
  }
});

test("termoDoTipo reconhece os tipos de emenda que o Portal publica", () => {
  expect(termoDoTipo("Emenda Individual - Transferências Especiais")).toBe("emenda-pix");
  expect(termoDoTipo("Emenda Individual - Transferências com Finalidade Definida")).toBe("finalidade-definida");
  expect(termoDoTipo("Emenda de Bancada")).toBe("emenda-bancada");
  expect(termoDoTipo("Emenda de Comissão")).toBe("emenda-comissao");
  expect(termoDoTipo("Emenda de Relator")).toBeNull();
});
