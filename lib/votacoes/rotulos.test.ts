// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { expect, test } from "bun:test";

import type { TipoVoto } from "../generated/prisma/enums";
import { concordancia, contarPlacar, placarPorGrupo } from "./rotulos";

const voto = (tipo: TipoVoto, partido: string | null = null) => ({ tipo, partido });

test("contarPlacar junta ausências, secretos e presidente em Outros", () => {
  const placar = contarPlacar([voto("SIM"), voto("SIM"), voto("NAO"), voto("AUSENTE"), voto("VOTO_SECRETO"), voto("PRESIDENTE")]);
  expect(placar).toEqual({ SIM: 2, NAO: 1, ABSTENCAO: 0, OBSTRUCAO: 0, OUTROS: 3, total: 6 });
});

test("placarPorGrupo ordena do maior grupo para o menor e nomeia grupo vazio", () => {
  const grupos = placarPorGrupo([voto("SIM", "PT"), voto("NAO", "PL"), voto("NAO", "PL"), voto("SIM", null)], (v) => v.partido);
  expect(grupos.map((g) => g.nome)).toEqual(["PL", "PT", "Sem informação"]);
  expect(grupos[0].placar.NAO).toBe(2);
});

test("concordancia só conta votações em que os dois tomaram posição", () => {
  const a = new Map<string, TipoVoto>([
    ["1", "SIM"],
    ["2", "NAO"],
    ["3", "AUSENTE"],
    ["4", "ABSTENCAO"],
    ["5", "SIM"],
  ]);
  const b = new Map<string, TipoVoto>([
    ["1", "SIM"],
    ["2", "SIM"],
    ["3", "SIM"],
    ["4", "ABSTENCAO"],
    ["6", "NAO"],
  ]);
  expect(concordancia(a, b)).toEqual({ comuns: 3, iguais: 2 });
});
