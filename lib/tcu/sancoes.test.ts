// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { expect, test } from "bun:test";

import { inabilitacoesDaPessoa, inidoneidadesDe, type InabilitadoTcu, type InidoneoTcu } from "./sancoes";

const base = {
  processo: "000.288/2025-0",
  deliberacao: "AC-001792/2026-PL",
  data_transito_julgado: "2026-08-27T03:00:00Z",
  data_final: "2031-08-27T03:00:00Z",
  data_acordao: "2026-07-08T17:30:00Z",
  municipio: null,
};

const INABILITADOS: InabilitadoTcu[] = [
  { ...base, nome: "JOSE DA SILVA", cpf: "111.111.111-11", uf: "SP" },
  { ...base, nome: "JOSÉ DA SILVA", cpf: "222.222.222-22", uf: "MG" },
];

test("com CPF casa só a pessoa certa e não devolve o CPF", () => {
  const { casamento, sancoes } = inabilitacoesDaPessoa(INABILITADOS, { nomeCivil: "José da Silva", cpf: "22222222222" });
  expect(casamento).toBe("cpf");
  expect(sancoes).toHaveLength(1);
  expect(sancoes[0]).not.toHaveProperty("cpf");
  expect(sancoes[0].uf).toBe("MG");
});

test("só com o nome ignora acento e usa a UF para separar homônimos", () => {
  expect(inabilitacoesDaPessoa(INABILITADOS, { nomeCivil: "José da Silva" }).sancoes).toHaveLength(2);
  const { casamento, sancoes } = inabilitacoesDaPessoa(INABILITADOS, { nomeCivil: "Jose da Silva", uf: "SP" });
  expect(casamento).toBe("nome");
  expect(sancoes.map((s) => s.uf)).toEqual(["SP"]);
});

test("inidoneidadesDe casa CNPJ com ou sem máscara", () => {
  const lista: InidoneoTcu[] = [{ ...base, nome: "EMPRESA X", cpf_cnpj: "30.139.983/0001-02", uf: "DF" }];
  expect(inidoneidadesDe(lista, "30139983000102")).toHaveLength(1);
  expect(inidoneidadesDe(lista, "00.000.000/0001-91")).toHaveLength(0);
});
