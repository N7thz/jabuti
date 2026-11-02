// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { expect, test } from "bun:test";

import { ASSUNTOS_OPCIONAIS, lerMenu, SCRIPT_MENU } from "./menu";

test("lê só assuntos opcionais conhecidos, sem repetir", () => {
  expect(lerMenu("comparar,ranking,comparar")).toEqual(["comparar", "ranking"]);
  expect(lerMenu("parlamentares,<script>,glossario")).toEqual(["glossario"]);
  expect(lerMenu(null)).toEqual([]);
  expect(lerMenu("")).toEqual([]);
});

test("o script liga os atributos salvos e ignora o resto", () => {
  const atributos: Record<string, string> = {};
  const contexto = {
    localStorage: { getItem: () => "loa,inventado,cnpj" },
    document: { documentElement: { setAttribute: (nome: string, valor: string) => (atributos[nome] = valor) } },
  };
  new Function("localStorage", "document", SCRIPT_MENU)(contexto.localStorage, contexto.document);
  expect(Object.keys(atributos).sort()).toEqual(["data-menu-cnpj", "data-menu-loa"]);
});

test("cada assunto opcional tem id simples (vira atributo e seletor de CSS)", () => {
  for (const a of ASSUNTOS_OPCIONAIS) expect(a.id).toMatch(/^[a-z]+$/);
});
