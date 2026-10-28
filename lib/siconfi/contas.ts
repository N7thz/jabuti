// Leitura da Declaração de Contas Anuais (DCA) que estados e municípios entregam ao Tesouro (SICONFI).

export type LinhaDca = {
  exercicio: number;
  instituicao: string;
  cod_ibge: number;
  uf: string;
  anexo: string;
  rotulo: string;
  coluna: string;
  cod_conta: string;
  conta: string;
  valor: number;
  populacao: number | null;
};

const centavos = (valor: number) => Math.round(valor * 100);

/** Receita bruta realizada no ano (Anexo I-C), sem as receitas intraorçamentárias. Em centavos. */
export function receitaRealizada(linhas: LinhaDca[]) {
  const linha = linhas.find(
    (l) => l.cod_conta === "ReceitasExcetoIntraOrcamentarias" && l.coluna === "Receitas Brutas Realizadas",
  );
  return linha ? centavos(linha.valor) : null;
}

export type DespesaPorFuncao = { codigo: string; funcao: string; empenhado: number; pago: number };

/**
 * Despesa por função de governo (Anexo I-E): "10 - Saúde", "12 - Educação"... com empenhado e pago,
 * em centavos. Subfunções ("10.301 - ...") ficam de fora, e o bloco intraorçamentário (que vem depois
 * de "Despesas Intraorçamentárias" e repetiria as funções) é ignorado.
 */
export function despesaPorFuncao(linhas: LinhaDca[]) {
  const porFuncao = new Map<string, DespesaPorFuncao>();
  let total = { empenhado: 0, pago: 0 };

  for (const coluna of ["Despesas Empenhadas", "Despesas Pagas"] as const) {
    const chave = coluna === "Despesas Empenhadas" ? "empenhado" : "pago";
    for (const l of linhas.filter((l) => l.coluna === coluna)) {
      if (l.conta === "Despesas Intraorçamentárias") break;
      if (l.conta === "Despesas Exceto Intraorçamentárias") {
        total = { ...total, [chave]: centavos(l.valor) };
        continue;
      }
      const funcao = /^(\d{2}) - (.+)$/.exec(l.conta);
      if (!funcao) continue;
      const atual = porFuncao.get(funcao[1]) ?? { codigo: funcao[1], funcao: funcao[2], empenhado: 0, pago: 0 };
      porFuncao.set(funcao[1], { ...atual, [chave]: centavos(l.valor) });
    }
  }

  return { total, funcoes: [...porFuncao.values()].sort((a, b) => b.pago - a.pago) };
}
