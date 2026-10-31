// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { expect, test } from "bun:test";

import type { HistoricoDeputadoApi } from "../camara/types";
import { mudancasCamara, periodosCamara, periodosSenado } from "./historico";

// Formato de /deputados/{id}/historico (Abílio Santana, legislatura 56), fora de ordem de propósito.
const base = { siglaUf: "BA", idLegislatura: 56, condicaoEleitoral: "Titular" };
const historico: HistoricoDeputadoApi[] = [
  { ...base, siglaPartido: "PL", dataHora: "2019-05-22T17:05", situacao: "Exercício", descricaoStatus: "Alteração de partido" },
  { ...base, siglaPartido: "PHS", dataHora: "2019-02-01T11:45", situacao: "Exercício", descricaoStatus: "Entrada - Posse de Eleito Titular" },
  { ...base, siglaPartido: "PR", dataHora: "2019-02-26T17:28", situacao: "Exercício", descricaoStatus: "Alteração de partido" },
  { ...base, siglaPartido: "PL", dataHora: "2020-03-01T10:00", situacao: "Licença", descricaoStatus: "Saída - Licença para tratamento de saúde" },
  { ...base, siglaPartido: "PL", dataHora: "2020-07-01T10:00", situacao: "Exercício", descricaoStatus: "Reassunção" },
];

test("periodosCamara junta registros do mesmo partido", () => {
  expect(periodosCamara(historico)).toEqual([
    { partido: "PHS", desde: "2019-02-01", ate: "2019-02-26" },
    { partido: "PR", desde: "2019-02-26", ate: "2019-05-22" },
    { partido: "PL", desde: "2019-05-22", ate: null },
  ]);
});

test("periodosCamara descarta partido lançado e trocado no mesmo dia", () => {
  // Antônia Lúcia (123756): PR por zero dias em 2022 e PSC por zero dias na posse de 2023.
  const registro = (siglaPartido: string, dataHora: string) => ({ ...base, siglaPartido, dataHora, situacao: "Exercício", descricaoStatus: null });
  expect(
    periodosCamara([
      registro("PSC", "2011-02-01T10:00"),
      registro("PR", "2022-07-14T10:00"),
      registro("PL", "2022-07-14T11:00"),
      registro("REPUBLICANOS", "2022-07-19T10:00"),
      registro("PSC", "2023-02-01T10:00"),
      registro("REPUBLICANOS", "2023-02-01T11:00"),
      registro("MDB", "2026-04-10T10:00"),
    ]),
  ).toEqual([
    { partido: "PSC", desde: "2011-02-01", ate: "2022-07-14" },
    { partido: "PL", desde: "2022-07-14", ate: "2022-07-19" },
    { partido: "REPUBLICANOS", desde: "2022-07-19", ate: "2026-04-10" },
    { partido: "MDB", desde: "2026-04-10", ate: null },
  ]);
});

test("mudancasCamara registra só quando a situação muda", () => {
  expect(mudancasCamara(historico).map((m) => [m.data, m.situacao])).toEqual([
    ["2019-02-01", "Exercício"],
    ["2020-03-01", "Licença"],
    ["2020-07-01", "Exercício"],
  ]);
});

test("periodosSenado ordena do mais antigo ao atual", () => {
  expect(
    periodosSenado([
      { partido: "REPUBLICANOS", desde: "2025-11-12", ate: null },
      { partido: "UNIÃO", desde: "2022-02-24", ate: "2025-11-10" },
    ]).map((p) => p.partido),
  ).toEqual(["UNIÃO", "REPUBLICANOS"]);
});
