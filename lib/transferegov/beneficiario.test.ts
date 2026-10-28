// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { describe, expect, test } from "bun:test";

import { centavos, municipioDoBeneficiario, padraoBeneficiarioMunicipio } from "./beneficiario";

describe("municipioDoBeneficiario", () => {
  test("tira o prefixo e casa com o nome do IBGE apesar do ':' no lugar do apóstrofo", () => {
    expect(municipioDoBeneficiario("MUNICIPIO DE PAU D:ARCO DO PIAUI")).toBe(
      municipioDoBeneficiario("Município de Pau D'Arco do Piauí"),
    );
    expect(municipioDoBeneficiario("PREFEITURA MUNICIPAL DE SAO PAULO")).toBe("SAO PAULO");
  });

  test("estado não é município", () => {
    expect(municipioDoBeneficiario("ESTADO DO PIAUI")).toBeNull();
  });

  test("nome que só começa igual não casa", () => {
    expect(municipioDoBeneficiario("MUNICIPIO DE PORTO SEGURO")).not.toBe(municipioDoBeneficiario("MUNICIPIO DE PORTO"));
  });
});

test("padraoBeneficiarioMunicipio troca espaços e pontuação por curinga", () => {
  expect(padraoBeneficiarioMunicipio("Pau D'Arco do Piauí")).toBe("ilike.*PAU*D*ARCO*DO*PIAUI");
});

test("centavos arredonda o ponto flutuante da API", () => {
  expect(centavos(30000.00000000)).toBe(3_000_000);
  expect(centavos(0.1 + 0.2)).toBe(30);
  expect(centavos(null)).toBe(0);
});
