// @ts-expect-error: o projeto não tem @types/bun; o runner do Bun resolve este módulo.
import { describe, expect, test } from "bun:test";
import { z } from "zod";

import { cnpjValido, cpfValido, mascaraCnpj, mascaraCpf, mascaraCpfCnpj } from "./mascaras";
import { linkAno, linkBuscaCnpj } from "./formularios";
import { ano, cnpj, cpfCnpj, ibge, lerFiltros, nomeAutor, opcional, uf } from "./schemas";

describe("máscaras", () => {
  test("CNPJ formata enquanto digita e corta no 14º dígito", () => {
    expect(mascaraCnpj("12")).toBe("12");
    expect(mascaraCnpj("12345")).toBe("12.345");
    expect(mascaraCnpj("123456780001")).toBe("12.345.678/0001");
    expect(mascaraCnpj("12345678000190999")).toBe("12.345.678/0001-90");
    expect(mascaraCnpj("12.345.678/0001-90")).toBe("12.345.678/0001-90");
  });

  test("CPF e CPF/CNPJ", () => {
    expect(mascaraCpf("12345678901")).toBe("123.456.789-01");
    expect(mascaraCpfCnpj("12345678901")).toBe("123.456.789-01");
    expect(mascaraCpfCnpj("123456789012")).toBe("12.345.678/9012");
  });

  test("dígitos verificadores", () => {
    expect(cnpjValido("00.000.000/0001-91")).toBe(true); // Banco do Brasil
    expect(cnpjValido("00.000.000/0001-92")).toBe(false);
    expect(cnpjValido("11111111111111")).toBe(false);
    expect(cpfValido("529.982.247-25")).toBe(true);
    expect(cpfValido("529.982.247-24")).toBe(false);
  });
});

describe("schemas no formato da API", () => {
  test("CNPJ sai só com dígitos", () => {
    expect(cnpj.parse("00.000.000/0001-91")).toBe("00000000000191");
    expect(cnpj.safeParse("00.000.000/0001").error?.issues[0].message).toBe("O CNPJ tem 14 dígitos.");
  });

  test("CPF ou CNPJ", () => {
    expect(cpfCnpj.parse("529.982.247-25")).toBe("52998224725");
    expect(cpfCnpj.safeParse("123").success).toBe(false);
  });

  test("nome do autor em maiúsculas e sem acento, como o filtro nomeAutor exige", () => {
    expect(nomeAutor.parse("  General Girão ")).toBe("GENERAL GIRAO");
    expect(nomeAutor.safeParse("Jo").success).toBe(false);
  });

  test("ano, UF e IBGE", () => {
    expect(ano(2020, 2025).parse("2024")).toBe(2024);
    expect(ano(2020, 2025).safeParse("2019").success).toBe(false);
    expect(uf.parse("sp")).toBe("SP");
    expect(uf.safeParse("XX").success).toBe(false);
    expect(ibge.parse("3509502")).toBe(3509502);
  });

  test("searchParams com lista ou vazio", () => {
    expect(cnpj.parse(["00000000000191", "x"])).toBe("00000000000191");
    expect(opcional(uf).parse("")).toBeUndefined();
    expect(opcional(uf).parse(undefined)).toBeUndefined();
  });

  test("lerFiltros devolve os erros por campo para o formulário sem JavaScript", () => {
    const schema = z.object({ cnpj, uf: opcional(uf) });
    expect(lerFiltros(schema, { cnpj: "00.000.000/0001-91" }).valores).toEqual({
      cnpj: "00000000000191",
      uf: undefined,
    });
    expect(lerFiltros(schema, { cnpj: "123", uf: "XX" }).erros).toEqual({
      cnpj: "O CNPJ tem 14 dígitos.",
      uf: "Escolha um estado da lista.",
    });
  });

  test("links compartilháveis (nuqs) omitem campos vazios", () => {
    expect(linkBuscaCnpj("/", { cnpj: cnpj.parse("00.000.000/0001-91") })).toBe("/?cnpj=00000000000191");
    expect(linkBuscaCnpj("/", { cnpj: null })).toBe("/");
    expect(linkAno("/estados/SP/3509502", { ano: 2024 })).toBe("/estados/SP/3509502?ano=2024");
  });
});
