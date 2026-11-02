// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { expect, test } from "bun:test";

import { mesesComDados } from "./cobertura";

test("mesesComDados exige os meses fechados do ano corrente e os 12 dos anos passados", () => {
  const novembro = new Date(Date.UTC(2026, 10, 2));
  expect(mesesComDados(2026, novembro)).toBe(10);
  expect(mesesComDados(2025, novembro)).toBe(12);
  expect(mesesComDados(2027, novembro)).toBe(0);
  // Em janeiro ainda não há mês fechado: espera ao menos o mês corrente chegar.
  expect(mesesComDados(2026, new Date(Date.UTC(2026, 0, 15)))).toBe(1);
});
