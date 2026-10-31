/**
 * IPCA mensal (série 433 do SGS do Banco Central), para dizer quanto um valor declarado numa eleição
 * antiga vale em dinheiro de hoje. Só multiplica as variações mensais: não guarda nada no banco.
 */
export const URL_IPCA = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json&dataInicial=01/01/2014";

/** Variação do mês em %, como a API publica ({ data: "01/09/2014", valor: "0.57" }). */
export interface MesIpca {
  ano: number;
  mes: number;
  variacao: number;
}

export function lerSerieIpca(json: { data: string; valor: string }[]): MesIpca[] {
  return json.map(({ data, valor }) => {
    const [, mes, ano] = data.split("/").map(Number);
    return { ano, mes, variacao: Number(valor) };
  });
}

/**
 * Inflação acumulada de setembro do ano da eleição até o último mês publicado. Os bens são declarados
 * no registro da candidatura, em agosto. `null` se a série não cobre o ano.
 */
export function fatorIpca(serie: MesIpca[], anoEleicao: number) {
  const desde = serie.filter((m) => m.ano > anoEleicao || (m.ano === anoEleicao && m.mes >= 9));
  if (!desde.some((m) => m.ano === anoEleicao && m.mes === 9)) return null;
  return desde.reduce((fator, m) => fator * (1 + m.variacao / 100), 1);
}
