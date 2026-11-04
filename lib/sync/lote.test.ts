// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { describe, expect, test } from "bun:test";

import { Prisma } from "../generated/prisma/client";
import { camposAlterados, emLotes, gravarEmLote, separarNovosEAlterados, unicosPorChave, valoresIguais } from "./lote";

describe("valoresIguais", () => {
  test("nulo e indefinido se equivalem", () => {
    expect(valoresIguais(null, undefined)).toBe(true);
    expect(valoresIguais(null, "x")).toBe(false);
  });

  test("datas comparam pelo instante, como Date ou texto ISO", () => {
    expect(valoresIguais(new Date("2026-11-03T10:00:00Z"), new Date("2026-11-03T10:00:00.000Z"))).toBe(true);
    expect(valoresIguais(new Date("2026-11-03T10:00:00Z"), "2026-11-03T10:00:00Z")).toBe(true);
    expect(valoresIguais(new Date("2026-11-03T10:00:00Z"), new Date("2026-11-03T10:00:01Z"))).toBe(false);
  });

  test("decimal do banco bate com o texto da carga mesmo com zeros diferentes", () => {
    expect(valoresIguais(new Prisma.Decimal("10.5"), "10.50")).toBe(true);
    expect(valoresIguais(new Prisma.Decimal("0"), "0.00")).toBe(true);
    expect(valoresIguais(new Prisma.Decimal("10.5"), "10.51")).toBe(false);
  });

  test("texto, número e booleano por igualdade estrita", () => {
    expect(valoresIguais("PT", "PT")).toBe(true);
    expect(valoresIguais(1, "1")).toBe(false);
    expect(valoresIguais(true, false)).toBe(false);
  });
});

describe("camposAlterados", () => {
  test("ignora campos indefinidos do novo e os campos só do banco", () => {
    const atual = { id: "a", nome: "Fulano", partido: "PT", atualizadoEm: new Date() };
    expect(camposAlterados(atual, { nome: "Fulano", partido: undefined })).toEqual([]);
    expect(camposAlterados(atual, { nome: "Fulano", partido: "PL" })).toEqual(["partido"]);
  });
});

describe("separarNovosEAlterados", () => {
  const existentes = new Map([
    ["1", { id: "x1", idExterno: "1", nome: "A" }],
    ["2", { id: "x2", idExterno: "2", nome: "B" }],
  ]);
  const dados = [
    { idExterno: "1", nome: "A" },
    { idExterno: "2", nome: "B2" },
    { idExterno: "3", nome: "C" },
  ];

  test("novos vão para o createMany, iguais ficam de fora e alterados levam a linha do banco", () => {
    const { novos, alterados } = separarNovosEAlterados(dados, existentes, (d) => d.idExterno, ({ nome }) => ({ nome }));
    expect(novos).toEqual([{ idExterno: "3", nome: "C" }]);
    expect(alterados).toEqual([{ linha: { id: "x2", idExterno: "2", nome: "B" }, dados: { nome: "B2" } }]);
  });
});

test("unicosPorChave mantém o último de cada chave", () => {
  expect(unicosPorChave([{ k: "a", v: 1 }, { k: "b", v: 2 }, { k: "a", v: 3 }], (d) => d.k)).toEqual([
    { k: "a", v: 3 },
    { k: "b", v: 2 },
  ]);
});

test("emLotes divide sem perder itens", () => {
  expect(emLotes([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
});

describe("gravarEmLote", () => {
  test("por lote faz 1 busca, 1 createMany e só os updates do que mudou", async () => {
    const banco = new Map([
      ["1", { id: "x1", idExterno: "1", nome: "A" }],
      ["2", { id: "x2", idExterno: "2", nome: "B" }],
    ]);
    const chamadas = { buscar: 0, criar: [] as string[][], atualizar: [] as string[] };

    const resultado = await gravarEmLote({
      dados: [
        { idExterno: "1", nome: "A" },
        { idExterno: "2", nome: "B2" },
        { idExterno: "3", nome: "C" },
        { idExterno: "4", nome: "D" },
      ],
      chave: (d) => d.idExterno,
      buscar: async (ids) => {
        chamadas.buscar++;
        return ids.flatMap((id) => banco.get(id) ?? []);
      },
      chaveDaLinha: (l) => l.idExterno,
      criar: async (novos) => chamadas.criar.push(novos.map((n) => n.idExterno)),
      atualizar: async (linha) => chamadas.atualizar.push(linha.id),
      tamanhoLote: 2,
    });

    expect(resultado).toEqual({ criados: 2, atualizados: 1 });
    expect(chamadas.buscar).toBe(2);
    expect(chamadas.criar).toEqual([["3", "4"]]);
    expect(chamadas.atualizar).toEqual(["x2"]);
  });

  test("lote sem novidade não chama createMany nem update", async () => {
    let escritas = 0;
    await gravarEmLote({
      dados: [{ idExterno: "1", nome: "A" }],
      chave: (d) => d.idExterno,
      buscar: async () => [{ id: "x1", idExterno: "1", nome: "A" }],
      chaveDaLinha: (l) => l.idExterno,
      criar: async () => escritas++,
      atualizar: async () => escritas++,
    });
    expect(escritas).toBe(0);
  });
});
