// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { expect, test } from "bun:test";

import { despesaPorFuncao, receitaRealizada, type LinhaDca } from "./contas";

const linha = (coluna: string, conta: string, valor: number, cod_conta = "TotalDespesas"): LinhaDca => ({
  exercicio: 2025,
  instituicao: "Prefeitura Municipal de Teste - PI",
  cod_ibge: 2207108,
  uf: "PI",
  anexo: "DCA-Anexo I-E",
  rotulo: "Total Geral da Despesa por Função",
  coluna,
  cod_conta,
  conta,
  valor,
  populacao: 1000,
});

test("despesaPorFuncao soma só as funções, sem subfunções nem o bloco intraorçamentário", () => {
  const linhas = [
    linha("Despesas Empenhadas", "Despesas Exceto Intraorçamentárias", 300.5),
    linha("Despesas Empenhadas", "10 - Saúde", 100),
    linha("Despesas Empenhadas", "10.301 - Atenção Básica", 80),
    linha("Despesas Empenhadas", "12 - Educação", 200.5),
    linha("Despesas Empenhadas", "Despesas Intraorçamentárias", 50),
    linha("Despesas Empenhadas", "10 - Saúde", 50),
    linha("Despesas Pagas", "Despesas Exceto Intraorçamentárias", 290),
    linha("Despesas Pagas", "10 - Saúde", 90),
    linha("Despesas Pagas", "12 - Educação", 200),
  ];

  expect(despesaPorFuncao(linhas)).toEqual({
    total: { empenhado: 30050, pago: 29000 },
    funcoes: [
      { codigo: "12", funcao: "Educação", empenhado: 20050, pago: 20000 },
      { codigo: "10", funcao: "Saúde", empenhado: 10000, pago: 9000 },
    ],
  });
});

test("receitaRealizada pega a receita bruta sem as intraorçamentárias", () => {
  const linhas = [
    linha("Deduções - FUNDEB", "RECEITAS (EXCETO INTRA-ORÇAMENTÁRIAS) (I)", 10, "ReceitasExcetoIntraOrcamentarias"),
    linha("Receitas Brutas Realizadas", "RECEITAS (EXCETO INTRA-ORÇAMENTÁRIAS) (I)", 1234.56, "ReceitasExcetoIntraOrcamentarias"),
  ];
  expect(receitaRealizada(linhas)).toBe(123456);
  expect(receitaRealizada([])).toBeNull();
});
