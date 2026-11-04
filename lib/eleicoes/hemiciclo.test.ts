// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { describe, expect, test } from "bun:test";

import { chavePartido, COR_OUTROS, corDoPartido } from "./cores";
import { agruparComposicao, contarPorPartido, distribuirCadeiras, hemiciclo, OUTROS } from "./hemiciclo";

describe("hemiciclo", () => {
  test.each([0, 1, 3, 8, 13, 27, 54, 81, 513])("%i cadeiras: uma posição para cada", (total: number) => {
    const { cadeiras } = hemiciclo(total);
    expect(cadeiras).toHaveLength(total);
    // Ninguém sobreposto: duas cadeiras nunca no mesmo ponto.
    expect(new Set(cadeiras.map((c) => `${c.x.toFixed(4)},${c.y.toFixed(4)}`)).size).toBe(total);
  });

  test("cadeiras ficam no semicírculo de raio 1, com o arco para cima", () => {
    for (const c of hemiciclo(513).cadeiras) {
      const r = Math.hypot(c.x, c.y);
      expect(r).toBeGreaterThanOrEqual(0.4 - 1e-9);
      expect(r).toBeLessThanOrEqual(1 + 1e-9);
      expect(c.y).toBeLessThanOrEqual(1e-9);
    }
  });

  test("ordenadas da esquerda para a direita pelo ângulo", () => {
    const { cadeiras } = hemiciclo(81);
    for (let i = 1; i < cadeiras.length; i++) expect(cadeiras[i].angulo).toBeLessThanOrEqual(cadeiras[i - 1].angulo);
    expect(cadeiras[0].x).toBeLessThan(0);
    expect(cadeiras.at(-1)!.x).toBeGreaterThan(0);
  });

  test("bolinhas não se encostam na mesma fileira", () => {
    const { cadeiras, raio } = hemiciclo(513);
    const porFileira = Map.groupBy(cadeiras, (c) => c.fileira);
    for (const fileira of porFileira.values()) {
      const ordem = [...fileira].sort((a, b) => b.angulo - a.angulo);
      for (let i = 1; i < ordem.length; i++) {
        const d = Math.hypot(ordem[i].x - ordem[i - 1].x, ordem[i].y - ordem[i - 1].y);
        expect(d).toBeGreaterThan(raio * 2);
      }
    }
  });

  test("uma cadeira só fica no topo", () => {
    const [c] = hemiciclo(1).cadeiras;
    expect(c.x).toBeCloseTo(0);
    expect(c.y).toBeCloseTo(-1);
  });
});

describe("agruparComposicao", () => {
  test("ordena por cadeiras, maior primeiro, e tira quem não tem cadeira", () => {
    expect(
      agruparComposicao([
        { partido: "PT", assentos: 3 },
        { partido: "PL", assentos: 5 },
        { partido: "MDB", assentos: 3 },
        { partido: "NOVO", assentos: 0 },
      ]),
    ).toEqual([
      { partido: "PL", assentos: 5 },
      { partido: "MDB", assentos: 3 },
      { partido: "PT", assentos: 3 },
    ]);
  });

  test("passando do máximo, junta os menores em Outros, por último", () => {
    const bancadas = Array.from({ length: 20 }, (_, i) => ({ partido: `P${String(i).padStart(2, "0")}`, assentos: 40 - i }));
    const grupos = agruparComposicao(bancadas, 16);
    expect(grupos).toHaveLength(16);
    const outros = grupos.at(-1)!;
    expect(outros.partido).toBe(OUTROS);
    expect(outros.outros?.map((b) => b.partido)).toEqual(["P15", "P16", "P17", "P18", "P19"]);
    expect(outros.assentos).toBe(25 + 24 + 23 + 22 + 21);
    expect(grupos.reduce((s, g) => s + g.assentos, 0)).toBe(bancadas.reduce((s, b) => s + b.assentos, 0));
  });
});

test("contarPorPartido e distribuirCadeiras", () => {
  const grupos = agruparComposicao(contarPorPartido(["PT", "PL", "PT", "PSD", "PT"]));
  expect(grupos).toEqual([
    { partido: "PT", assentos: 3 },
    { partido: "PL", assentos: 1 },
    { partido: "PSD", assentos: 1 },
  ]);
  expect(distribuirCadeiras(grupos).map((g) => g.partido)).toEqual(["PT", "PT", "PT", "PL", "PSD"]);
});

describe("cores", () => {
  test("mesma cor para grafias diferentes da sigla", () => {
    expect(chavePartido("União")).toBe("UNIAO");
    expect(chavePartido("PC do B")).toBe("PCDOB");
    expect(corDoPartido("PCdoB")).toEqual(corDoPartido("PC do B"));
    expect(corDoPartido("Podemos")).toEqual(corDoPartido("PODE"));
  });

  test("partido sem cor cadastrada fica cinza", () => {
    expect(corDoPartido("XYZ")).toEqual(COR_OUTROS);
  });
});
