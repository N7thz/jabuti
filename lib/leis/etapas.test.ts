// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { expect, test } from "bun:test";

import { decisaoLegivel, ehTipoDeLei, lerNorma, origemNoSenado, situacaoLegivel } from "./etapas";

test("lerNorma lê leis, leis complementares e emendas constitucionais", () => {
  expect(lerNorma("Lei nº 15.404 de 08/05/2026")).toEqual({ texto: "Lei nº 15.404, de 08/05/2026", data: "2026-05-08" });
  expect(lerNorma("Lei Complementar nº 220 de 14/01/2026")?.texto).toBe("Lei Complementar nº 220, de 14/01/2026");
  expect(lerNorma("Emenda Constitucional nº 137 de 02/03/2026")?.data).toBe("2026-03-02");
});

test("lerNorma ignora decretos, resoluções e texto vazio", () => {
  expect(lerNorma("Decreto Legislativo nº 412 de 10/06/2026")).toBeNull();
  expect(lerNorma("Resolução do Senado Federal nº 12 de 10/06/2026")).toBeNull();
  expect(lerNorma(null)).toBeNull();
});

test("ehTipoDeLei separa projetos de lei de requerimentos e vetos", () => {
  expect(ehTipoDeLei("PL 5649/2026")).toBe(true);
  expect(ehTipoDeLei("PEC 3/2026")).toBe(true);
  expect(ehTipoDeLei("REQ 49/2025 - CI")).toBe(false);
  expect(ehTipoDeLei("VET 12/2026")).toBe(false);
});

test("situacaoLegivel tira as maiúsculas sem estragar nomes próprios", () => {
  expect(situacaoLegivel("REMETIDA À CÂMARA DOS DEPUTADOS")).toBe("Remetida à Câmara dos Deputados");
  expect(situacaoLegivel("INCLUÍDA EM ORDEM DO DIA")).toBe("Incluída em Ordem do Dia");
  expect(situacaoLegivel("Aguardando Parecer")).toBe("Aguardando Parecer");
  expect(situacaoLegivel("  ")).toBeNull();
});

test("decisaoLegivel diz o resultado e o tom", () => {
  expect(decisaoLegivel("APROVADA_NO_PLENARIO")).toEqual({ texto: "Aprovado pelo Plenário do Senado", tom: "aprovado" });
  expect(decisaoLegivel("REJEITADO_PLENARIO")?.tom).toBe("rejeitado");
  expect(decisaoLegivel("REEDITADA")).toEqual({ texto: "Reeditada", tom: "neutro" });
  expect(decisaoLegivel(null)).toBeNull();
});

test("origemNoSenado traduz casa iniciadora e revisora", () => {
  expect(origemNoSenado("Revisora")).toBe("Veio da Câmara");
  expect(origemNoSenado("Iniciadora")).toBe("Começou no Senado");
  expect(origemNoSenado(undefined)).toBeNull();
});
