// @ts-expect-error -- o projeto não tem @types/bun; o Bun resolve "bun:test" em tempo de execução.
import { expect, test } from "bun:test";

import { balancoOrcamentario, despesaPorFuncaoLoa, mesesDoBimestre, receitaCorrenteLiquida, type LinhaRreo } from "./rreo";

const linha = (conta: string, coluna: string, valor: number, rotulo = "Padrão"): LinhaRreo => ({
  exercicio: 2026,
  periodo: 4,
  rotulo,
  coluna,
  cod_conta: "X",
  conta,
  valor,
});

test("balancoOrcamentario usa a primeira ocorrência e ignora o bloco intraorçamentário", () => {
  const anexo1 = [
    linha("RECEITAS (EXCETO INTRA-ORÇAMENTÁRIAS) (I)", "PREVISÃO ATUALIZADA (a)", 1000),
    linha("RECEITAS (EXCETO INTRA-ORÇAMENTÁRIAS) (I)", "Até o Bimestre (c)", 600.5),
    linha("DESPESAS (EXCETO INTRA-ORÇAMENTÁRIAS) (IX)", "DOTAÇÃO ATUALIZADA (e)", 900),
    linha("DESPESAS (EXCETO INTRA-ORÇAMENTÁRIAS) (IX)", "DESPESAS PAGAS ATÉ O BIMESTRE (j)", 400),
    linha("JUROS E ENCARGOS DA DÍVIDA", "DOTAÇÃO ATUALIZADA (e)", 100),
    linha("JUROS E ENCARGOS DA DÍVIDA", "DOTAÇÃO ATUALIZADA (e)", 5),
    linha("AMORTIZAÇÃO DA DÍVIDA / REFINANCIAMENTO (XII)", "DOTAÇÃO ATUALIZADA (e)", 300),
  ];
  const b = balancoOrcamentario(anexo1);
  expect(b.receitaArrecadada).toBe(60050);
  expect(b.pago).toBe(40000);
  expect(b.juros).toBe(10000);
  expect(b.refinanciamento).toBe(30000);
  expect(b.empenhado).toBe(0);
});

test("despesaPorFuncaoLoa fica só com funções, sem subfunções nem intraorçamentárias", () => {
  const exceto = "Total das Despesas Exceto Intra-Orçamentárias";
  const anexo2 = [
    linha("Saúde", "DOTAÇÃO ATUALIZADA (a)", 250, exceto),
    linha("Atenção Básica", "DOTAÇÃO ATUALIZADA (a)", 80, exceto),
    linha("FU10 - Demais Subfunções", "DOTAÇÃO ATUALIZADA (a)", 10, exceto),
    linha("Educação", "DOTAÇÃO ATUALIZADA (a)", 300, exceto),
    linha("Educação", "DESPESAS LIQUIDADAS ATÉ O BIMESTRE (d)", 120, exceto),
    linha("Saúde", "DOTAÇÃO ATUALIZADA (a)", 999, "Total das Despesas Intra-Orçamentárias"),
  ];
  expect(despesaPorFuncaoLoa(anexo2)).toEqual([
    { funcao: "Educação", inicial: 0, atualizada: 30000, empenhado: 0, liquidado: 12000 },
    { funcao: "Saúde", inicial: 0, atualizada: 25000, empenhado: 0, liquidado: 0 },
  ]);
});

test("mesesDoBimestre", () => {
  expect(mesesDoBimestre(1)).toBe("janeiro e fevereiro");
  expect(mesesDoBimestre(4)).toBe("julho e agosto");
  expect(mesesDoBimestre(6)).toBe("novembro e dezembro");
});

test("receitaCorrenteLiquida lê a previsão do ano e o acumulado de 12 meses", () => {
  const rcl = (coluna: string, valor: number) => ({ ...linha("RECEITA CORRENTE LÍQUIDA (III) = (I - II)", coluna, valor), cod_conta: "RREO3ReceitaCorrenteLiquida" });
  const anexo3 = [
    { ...linha("DEDUÇÕES (II)", "PREVISÃO ATUALIZADA 2026", 50), cod_conta: "DeducoesDaReceitaCorrenteLiquida" },
    rcl("<MR>", 10),
    rcl("TOTAL (ÚLTIMOS 12 MESES)", 1500.25),
    rcl("PREVISÃO ATUALIZADA 2026", 1600),
  ];
  expect(receitaCorrenteLiquida(anexo3, 2026)).toEqual({ prevista: 160000, ultimos12Meses: 150025 });
  expect(receitaCorrenteLiquida(anexo3, 2025).prevista).toBe(0);
});
