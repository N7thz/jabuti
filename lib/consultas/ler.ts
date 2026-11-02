// Consultas populares: o voto aberto a qualquer pessoa no site de cada Casa. Nenhuma das duas publica
// esses números na API de dados abertos, então a leitura sai do HTML da página pública:
//  - Senado, e-Cidadania: "Você apoia essa proposição?", Sim ou Não, em visualizacaomateria?id=<codigoMateria>.
//  - Câmara, enquetes: cinco opções, de "Concordo totalmente" a "Discordo totalmente", em /enquetes/<id>.
// Se o site mudar o HTML, a leitura devolve null e a página não mostra o placar (não inventa um zero).

export interface ConsultaSenado {
  sim: number;
  nao: number;
  /** "31/10/2026 11:43:50", como o e-Cidadania escreve. */
  apuradoEm: string | null;
}

export type OpiniaoCamara = "concordo-totalmente" | "concordo-maior-parte" | "indeciso" | "discordo-maior-parte" | "discordo-totalmente";

export interface EnqueteCamara {
  /** Votos por opção, na ordem da página. Enquete aberta e sem votos vem com tudo zerado. */
  votos: Record<OpiniaoCamara, number>;
  total: number;
}

/** "12.345" ou "12345" → 12345. */
const numero = (texto: string) => Number(texto.replace(/\D/g, "") || "0");

export const urlConsultaSenado = (codigoMateria: number) =>
  `https://www12.senado.leg.br/ecidadania/visualizacaomateria?id=${codigoMateria}`;

export const urlEnqueteCamara = (id: number) => `https://www.camara.leg.br/enquetes/${id}`;

/** Placar do e-Cidadania, ou null quando a matéria não tem consulta pública (a página vem sem o gráfico). */
export function lerConsultaSenado(html: string): ConsultaSenado | null {
  const grafico = html.match(/<figure[^>]*grafico-consulta-publica[\s\S]*?<\/figure>/i)?.[0];
  if (!grafico) return null;
  const sim = grafico.match(/contabilizacao-favor[^>]*>([^<]*)</i)?.[1];
  const nao = grafico.match(/contabilizacao-contra[^>]*>([^<]*)</i)?.[1];
  if (sim === undefined || nao === undefined) return null;
  const apuradoEm = html.match(/Votos apurados até\s*([\d/]+\s+[\d:]+)/i)?.[1] ?? null;
  return { sim: numero(sim), nao: numero(nao), apuradoEm };
}

const OPCOES: [RegExp, OpiniaoCamara][] = [
  [/concordo totalmente/i, "concordo-totalmente"],
  [/concordo na maior parte/i, "concordo-maior-parte"],
  [/indecis/i, "indeciso"],
  [/discordo na maior parte/i, "discordo-maior-parte"],
  [/discordo totalmente/i, "discordo-totalmente"],
];

const zerado = (): Record<OpiniaoCamara, number> => ({
  "concordo-totalmente": 0,
  "concordo-maior-parte": 0,
  indeciso: 0,
  "discordo-maior-parte": 0,
  "discordo-totalmente": 0,
});

/**
 * Resultado da enquete da Câmara. Com votos, a página traz a tabela de resultados; sem nenhum voto,
 * traz só o formulário ("Enquete do PL ..."), e o placar sai zerado. Nenhum dos dois: null.
 */
export function lerEnqueteCamara(html: string): EnqueteCamara | null {
  const linhas = [...html.matchAll(/resumo-resposta__opiniao[^>]*>([^<]*)<[\s\S]*?resumo-resposta__participacoes[^>]*>([^<]*)</gi)];
  const votos = zerado();

  if (linhas.length === 0) {
    return /Enquete d[aeo]s?\s/i.test(html) && /concordo totalmente/i.test(html) ? { votos, total: 0 } : null;
  }

  for (const [, opcao, valor] of linhas) {
    const chave = OPCOES.find(([padrao]) => padrao.test(opcao))?.[1];
    if (chave) votos[chave] = numero(valor);
  }
  return { votos, total: Object.values(votos).reduce((a, b) => a + b, 0) };
}
