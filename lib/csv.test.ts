// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { expect, test } from "bun:test";

import { celulaCsv, gerarCsv, nomeArquivo, reaisCsv } from "./csv";

test("celulaCsv escapa separador, aspas e quebras de linha", () => {
  expect(celulaCsv("simples")).toBe("simples");
  expect(celulaCsv("a;b")).toBe('"a;b"');
  expect(celulaCsv('diz "oi"')).toBe('"diz ""oi"""');
  expect(celulaCsv("linha\nnova")).toBe('"linha\nnova"');
  expect(celulaCsv(null)).toBe("");
  expect(celulaCsv(undefined)).toBe("");
});

test("celulaCsv usa vírgula decimal e neutraliza fórmulas vindas das fontes", () => {
  expect(celulaCsv(1234.5)).toBe("1234,5");
  expect(celulaCsv(-3)).toBe("-3");
  expect(celulaCsv(true)).toBe("sim");
  expect(celulaCsv("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
  expect(celulaCsv("+55")).toBe("'+55");
});

test("gerarCsv começa com BOM e separa linhas com CRLF", () => {
  const csv = gerarCsv(["Nome", "Valor"], [["Ana", 10.5]]);
  expect(csv.startsWith("﻿")).toBe(true);
  expect(csv.slice(1)).toBe("Nome;Valor\r\nAna;10,5\r\n");
});

test("reaisCsv e nomeArquivo", () => {
  expect(reaisCsv(123456)).toBe("1234,56");
  expect(reaisCsv(5)).toBe("0,05");
  expect(nomeArquivo("Votação", "PLP 177/2023", 2025)).toBe("votacao-plp-177-2023-2025.csv");
});
