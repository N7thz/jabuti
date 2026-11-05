import type { Legislatura } from "./camara/types";

// Legislatura do Congresso calculada pela data, sem consultar a API. É a mesma numeração na Câmara e no Senado.
// Cada legislatura dura 4 anos e começa em 1º de fevereiro do ano seguinte à eleição (Constituição, art. 44):
// a 57ª vai de 01/02/2023 a 31/01/2027. As duas Casas têm um recurso de legislaturas na API (Câmara:
// /legislaturas; Senado: /plenario/legislatura/{data}), mas eles ficam fora do ar (504/503) por dias enquanto
// o resto responde, e derrubavam as cargas inteiras.

const REFERENCIA = { id: 57, ano: 2023 };

/** Legislatura em vigor no dia `dia` (AAAA-MM-DD). */
export function legislaturaPelaData(dia: string): Legislatura {
  const [ano, mes] = dia.split("-").map(Number);
  // Janeiro ainda pertence à legislatura que começou no ano anterior.
  const anoEfetivo = mes >= 2 ? ano : ano - 1;
  const ordem = Math.floor((anoEfetivo - REFERENCIA.ano) / 4);
  const inicio = REFERENCIA.ano + ordem * 4;
  return { id: REFERENCIA.id + ordem, dataInicio: `${inicio}-02-01`, dataFim: `${inicio + 4}-01-31` };
}
