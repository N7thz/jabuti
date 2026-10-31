// Leitura do Relatório Resumido da Execução Orçamentária (RREO) da União no SICONFI: o que a LOA
// autorizou e quanto já foi executado até o último bimestre publicado.

export type LinhaRreo = {
  exercicio: number;
  periodo: number;
  rotulo: string;
  coluna: string;
  cod_conta: string;
  conta: string;
  valor: number;
};

// As 28 funções de governo (Portaria MOG 42/1999). O Anexo 2 lista funções e subfunções juntas e sem
// código, então é por esta lista que se separam as funções.
export const FUNCOES_GOVERNO = [
  "Legislativa", "Judiciária", "Essencial à Justiça", "Administração", "Defesa Nacional", "Segurança Pública",
  "Relações Exteriores", "Assistência Social", "Previdência Social", "Saúde", "Trabalho", "Educação", "Cultura",
  "Direitos da Cidadania", "Urbanismo", "Habitação", "Saneamento", "Gestão Ambiental", "Ciência e Tecnologia",
  "Agricultura", "Organização Agrária", "Indústria", "Comércio e Serviços", "Comunicações", "Energia", "Transporte",
  "Desporto e Lazer", "Encargos Especiais",
  // Não é função, mas o RREO a lista no mesmo nível e ela fecha a soma.
  "Reserva de Contingência",
];

const centavos = (valor: number | undefined) => Math.round((valor ?? 0) * 100);

/** Primeira linha da conta e coluna pedidas (no Anexo 1 o bloco intraorçamentário repete nomes mais abaixo). */
function valor(linhas: LinhaRreo[], conta: string, coluna: string) {
  return centavos(linhas.find((l) => l.conta === conta && l.coluna === coluna)?.valor);
}

/** Balanço orçamentário (Anexo 1): receita e despesa do ano, sem as operações dentro do próprio governo. Em centavos. */
export function balancoOrcamentario(anexo1: LinhaRreo[]) {
  const receitas = "RECEITAS (EXCETO INTRA-ORÇAMENTÁRIAS) (I)";
  const despesas = "DESPESAS (EXCETO INTRA-ORÇAMENTÁRIAS) (IX)";
  return {
    receitaPrevista: valor(anexo1, receitas, "PREVISÃO ATUALIZADA (a)"),
    receitaArrecadada: valor(anexo1, receitas, "Até o Bimestre (c)"),
    despesaInicial: valor(anexo1, despesas, "DOTAÇÃO INICIAL (d)"),
    despesaAutorizada: valor(anexo1, despesas, "DOTAÇÃO ATUALIZADA (e)"),
    empenhado: valor(anexo1, despesas, "DESPESAS EMPENHADAS ATÉ O BIMESTRE (f)"),
    liquidado: valor(anexo1, despesas, "DESPESAS LIQUIDADAS ATÉ O BIMESTRE (h)"),
    pago: valor(anexo1, despesas, "DESPESAS PAGAS ATÉ O BIMESTRE (j)"),
    juros: valor(anexo1, "JUROS E ENCARGOS DA DÍVIDA", "DOTAÇÃO ATUALIZADA (e)"),
    /** Dívida antiga paga com dívida nova: entra no total da LOA, mas não é gasto com serviços. */
    refinanciamento: valor(anexo1, "AMORTIZAÇÃO DA DÍVIDA / REFINANCIAMENTO (XII)", "DOTAÇÃO ATUALIZADA (e)"),
  };
}

export type DespesaFuncaoLoa = { funcao: string; inicial: number; atualizada: number; empenhado: number; liquidado: number };

/** Despesa por função (Anexo 2), do maior para o menor valor autorizado. Em centavos. */
export function despesaPorFuncaoLoa(anexo2: LinhaRreo[]): DespesaFuncaoLoa[] {
  const exceto = anexo2.filter((l) => l.rotulo.startsWith("Total das Despesas Exceto"));
  return FUNCOES_GOVERNO.map((funcao) => ({
    funcao,
    inicial: valor(exceto, funcao, "DOTAÇÃO INICIAL"),
    atualizada: valor(exceto, funcao, "DOTAÇÃO ATUALIZADA (a)"),
    empenhado: valor(exceto, funcao, "DESPESAS EMPENHADAS ATÉ O BIMESTRE (b)"),
    liquidado: valor(exceto, funcao, "DESPESAS LIQUIDADAS ATÉ O BIMESTRE (d)"),
  }))
    .filter((f) => f.atualizada > 0)
    .sort((a, b) => b.atualizada - a.atualizada);
}

/**
 * Receita corrente líquida (Anexo 3): a base dos pisos e das emendas obrigatórias. Em centavos.
 * `prevista` é a do ano inteiro; `ultimos12Meses`, a efetivamente arrecadada até o bimestre.
 */
export function receitaCorrenteLiquida(anexo3: LinhaRreo[], ano: number) {
  const rcl = anexo3.filter((l) => l.cod_conta === "RREO3ReceitaCorrenteLiquida");
  return {
    prevista: centavos(rcl.find((l) => l.coluna === `PREVISÃO ATUALIZADA ${ano}`)?.valor),
    ultimos12Meses: centavos(rcl.find((l) => l.coluna === "TOTAL (ÚLTIMOS 12 MESES)")?.valor),
  };
}

/** Bimestre do RREO em texto: 4 → "julho e agosto". */
export function mesesDoBimestre(bimestre: number) {
  const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  return `${meses[(bimestre - 1) * 2]} e ${meses[(bimestre - 1) * 2 + 1]}`;
}
