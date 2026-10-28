// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { expect, test } from "bun:test";

import { lerPopulacaoSidra } from "./populacao";

test("lerPopulacaoSidra extrai código, população e ano e ignora valores ausentes", () => {
  const resposta = [
    {
      resultados: [
        {
          series: [
            { localidade: { id: "3550308" }, serie: { "2026": "11911337" } },
            { localidade: { id: "5101837" }, serie: { "2026": "-" } },
            { localidade: { id: "3304557" }, serie: { "2026": "6731133" } },
          ],
        },
      ],
    },
  ];

  expect(lerPopulacaoSidra(resposta)).toEqual([
    { ibge: 3550308, populacao: 11911337, ano: 2026 },
    { ibge: 3304557, populacao: 6731133, ano: 2026 },
  ]);
});
