// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { describe, expect, test } from "bun:test";

import { anoDaUrl, anosDesde, inicioDaLegislatura, inicioDaLegislaturaDoAno, periodoDoAno, rotuloAno } from "./anos";

const hoje = new Date(Date.UTC(2026, 10, 2, 12));

describe("anos", () => {
  test("o ano corrente aparece como até o momento", () => {
    expect(rotuloAno(2026, hoje)).toBe("2026 (até o momento)");
    expect(rotuloAno(2025, hoje)).toBe("2025");
  });

  test("período do ano corrente vai até hoje", () => {
    expect(periodoDoAno(2026, hoje)).toBe("de 1º de janeiro a 2 de novembro de 2026");
    expect(periodoDoAno(2024, hoje)).toBe("de janeiro a dezembro de 2024");
  });

  test("anos desde um início, do mais recente ao mais antigo", () => {
    expect(anosDesde(2023, hoje)).toEqual([2026, 2025, 2024, 2023]);
    expect(anosDesde(2030, hoje)).toEqual([2026]);
  });

  test("legislaturas", () => {
    expect(inicioDaLegislatura(57)).toBe(2023);
    expect(inicioDaLegislatura(56)).toBe(2019);
    expect(inicioDaLegislaturaDoAno(2026)).toBe(2023);
    expect(inicioDaLegislaturaDoAno(2027)).toBe(2027);
  });

  test("ano da URL só vale se estiver na lista", () => {
    expect(anoDaUrl("2024", [2026, 2025, 2024])).toBe(2024);
    expect(anoDaUrl("1990", [2026, 2025])).toBe(2026);
    expect(anoDaUrl(undefined, [2026])).toBe(2026);
    expect(anoDaUrl(["2025", "2024"], [2026, 2025])).toBe(2025);
  });
});
