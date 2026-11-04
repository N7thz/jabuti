// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { describe, expect, test } from "bun:test";

import { inicioDaLegislatura } from "@/lib/anos";

import {
  composicaoAtual,
  type EleitoResumo,
  filtrarEleitos,
  legislaturaDaPosse,
  montarComposicao,
  situacaoDoEleito,
} from "./eleitos";

const eleito = (e: Partial<EleitoResumo>): EleitoResumo => ({
  id: "x",
  casa: "camara",
  uf: "SP",
  nome: "FULANO DE TAL",
  nomeUrna: "Fulano",
  partido: "PT",
  resultado: "ELEITO POR QP",
  situacao: "novo",
  casaAtual: null,
  perfil: null,
  fotoUrl: null,
  ...e,
});

test("legislaturaDaPosse: a que começa em fevereiro do ano seguinte à eleição", () => {
  expect(legislaturaDaPosse(2026)).toBe(58);
  expect(legislaturaDaPosse(2022)).toBe(57);
  expect(inicioDaLegislatura(legislaturaDaPosse(2026))).toBe(2027);
});

test("situacaoDoEleito", () => {
  expect(situacaoDoEleito("camara", null)).toBe("novo");
  // Sem a candidatura anterior não dá para dizer que foi reeleito.
  expect(situacaoDoEleito("camara", { casa: "camara", emExercicio: true })).toBe("mesma-casa");
  expect(
    situacaoDoEleito("camara", {
      casa: "camara",
      emExercicio: true,
      candidaturas: [{ cargo: "DEPUTADO FEDERAL", resultado: "ELEITO POR MÉDIA" }],
    }),
  ).toBe("reeleito");
  // Suplente de deputado em exercício: o TSE marca "SUPLENTE" no resultado.
  expect(
    situacaoDoEleito("camara", {
      casa: "camara",
      emExercicio: true,
      candidaturas: [{ cargo: "DEPUTADO FEDERAL", resultado: "SUPLENTE" }],
    }),
  ).toBe("mesma-casa");
  // Suplente de senador que assumiu: o cargo é de suplente, mesmo com a chapa eleita.
  expect(
    situacaoDoEleito("senado", {
      casa: "senado",
      emExercicio: true,
      candidaturas: [{ cargo: "1º SUPLENTE", resultado: "ELEITO" }],
    }),
  ).toBe("mesma-casa");
  expect(situacaoDoEleito("senado", { casa: "camara", emExercicio: true })).toBe("outra-casa");
  expect(situacaoDoEleito("camara", { casa: "camara", emExercicio: false })).toBe("ja-foi");
});

test("filtrarEleitos: casa, UF, partido e nome (de urna ou completo)", () => {
  const lista = [
    eleito({ id: "1", nomeUrna: "Zé da Feira", nome: "JOSÉ SILVA" }),
    eleito({ id: "2", casa: "senado", uf: "RJ", partido: "PCdoB", nomeUrna: "Maria" }),
  ];
  expect(filtrarEleitos(lista, { casa: "senado" }).map((e) => e.id)).toEqual(["2"]);
  expect(filtrarEleitos(lista, { uf: "SP" }).map((e) => e.id)).toEqual(["1"]);
  expect(filtrarEleitos(lista, { partido: "PCDOB" }).map((e) => e.id)).toEqual(["2"]);
  // Grafia do TSE na lista, outra na URL (e o contrário).
  expect(filtrarEleitos([eleito({ id: "3", partido: "PC do B" })], { partido: "PCDOB" }).map((e) => e.id)).toEqual(["3"]);
  expect(filtrarEleitos([eleito({ id: "4", partido: "PODE" })], { partido: "PODEMOS" }).map((e) => e.id)).toEqual(["4"]);
  expect(filtrarEleitos(lista, { nome: "ZE DA" }).map((e) => e.id)).toEqual(["1"]);
  expect(filtrarEleitos(lista, { nome: "JOSE" }).map((e) => e.id)).toEqual(["1"]);
});

describe("montarComposicao", () => {
  const eleitos = [
    eleito({ partido: "PL" }),
    eleito({ partido: "PL", uf: "RJ" }),
    eleito({ partido: "PT", uf: "RJ" }),
    eleito({ casa: "senado", partido: "PT", uf: "SP" }),
    eleito({ casa: "senado", partido: "PSD", uf: "RJ", perfil: { casa: "senado", id: "99" } }),
  ];
  const ficam = [
    { id: "10", partido: "MDB", uf: "SP" },
    { id: "11", partido: null, uf: "RJ" },
    // Também eleito agora: não conta duas vezes.
    { id: "99", partido: "PSD", uf: "RJ" },
  ];

  test("país: Câmara só com os eleitos, Senado com eleitos e quem fica", () => {
    const c = montarComposicao(eleitos, ficam);
    expect(c.camara.total).toBe(3);
    expect(c.camara.esperado).toBe(513);
    expect(c.camara.grupos).toEqual([
      { partido: "PL", assentos: 2 },
      { partido: "PT", assentos: 1 },
    ]);
    expect(c.senado.total).toBe(4);
    expect(c.senado.queFicam).toBe(2);
    expect(c.senado.esperado).toBe(81);
    expect(c.senado.grupos.map((g) => g.partido)).toEqual(["MDB", "PSD", "PT", "Sem partido"]);
  });

  test("com UF, a bancada do estado", () => {
    const c = montarComposicao(eleitos, ficam, "RJ");
    expect(c.camara.total).toBe(2);
    expect(c.camara.esperado).toBeNull();
    expect(c.senado.total).toBe(2);
    expect(c.senado.esperado).toBe(3);
  });

  test("grafias diferentes da mesma sigla (TSE e Senado) viram uma fatia só, com o rótulo do TSE", () => {
    const c = montarComposicao(
      [eleito({ casa: "senado", partido: "PC do B" }), eleito({ casa: "senado", partido: "PODE" })],
      [
        { id: "20", partido: "PCdoB", uf: "BA" },
        { id: "21", partido: "PODEMOS", uf: "PR" },
        { id: "22", partido: "Podemos", uf: "SP" },
      ],
    );
    expect(c.senado.grupos).toEqual([
      { partido: "PODE", assentos: 3 },
      { partido: "PC do B", assentos: 2 },
    ]);
  });
});

test("composicaoAtual: parlamentares em exercício pelo partido atual, com a bancada do estado", () => {
  const atuais = [
    { casa: "camara" as const, uf: "SP", partido: "PL" },
    { casa: "camara" as const, uf: "SP", partido: "PODE" },
    { casa: "camara" as const, uf: "RJ", partido: "PODEMOS" },
    { casa: "senado" as const, uf: "SP", partido: "PT" },
    { casa: "senado" as const, uf: "BA", partido: null },
  ];
  const brasil = composicaoAtual(atuais);
  expect(brasil.camara.total).toBe(3);
  expect(brasil.camara.esperado).toBe(513);
  // "PODE" e "PODEMOS" são o mesmo partido: uma fatia só, com a primeira grafia.
  expect(brasil.camara.grupos).toEqual([
    { partido: "PODE", assentos: 2 },
    { partido: "PL", assentos: 1 },
  ]);
  expect(brasil.senado.total).toBe(2);
  expect(brasil.senado.esperado).toBe(81);
  expect(brasil.senado.grupos.map((g) => g.partido).sort()).toEqual(["PT", "Sem partido"]);

  const sp = composicaoAtual(atuais, "SP");
  expect(sp.camara.total).toBe(2);
  expect(sp.camara.esperado).toBeNull();
  expect(sp.senado.total).toBe(1);
  expect(sp.senado.esperado).toBe(3);
});
