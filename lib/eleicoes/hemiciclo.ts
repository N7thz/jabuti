// Geometria do gráfico de composição em semicírculo (hemiciclo): cada cadeira é uma bolinha, em fileiras
// concêntricas, e os partidos ocupam fatias da esquerda para a direita. Funções puras, sem React, para testar.

import { chavePartido } from "./cores";

export type Bancada = { partido: string; assentos: number };

/** Grupo da legenda: um partido ou "Outros", que junta os partidos pequenos (listados em `partidos`). */
export type GrupoComposicao = Bancada & { outros?: Bancada[] };

export const OUTROS = "Outros";

/**
 * Ordena por número de cadeiras (maior primeiro, empate pela sigla) e, se passar de `maximo` itens, junta os
 * menores em "Outros", que fica por último. Partidos sem cadeira saem.
 */
export function agruparComposicao(bancadas: Bancada[], maximo = 16): GrupoComposicao[] {
  const ordenadas = bancadas
    .filter((b) => b.assentos > 0)
    .sort((a, b) => b.assentos - a.assentos || a.partido.localeCompare(b.partido, "pt-BR"));
  if (ordenadas.length <= maximo) return ordenadas;
  const visiveis = ordenadas.slice(0, maximo - 1);
  const outros = ordenadas.slice(maximo - 1);
  return [...visiveis, { partido: OUTROS, assentos: outros.reduce((s, b) => s + b.assentos, 0), outros }];
}

/**
 * Conta as cadeiras por partido. Grafias diferentes da mesma sigla (TSE "PC do B" e Senado "PCdoB", "PODE" e
 * "PODEMOS") contam juntas, com o rótulo da primeira grafia que aparecer: quem chama põe o TSE primeiro.
 */
export function contarPorPartido(partidos: Iterable<string>): Bancada[] {
  const contagem = new Map<string, Bancada>();
  for (const p of partidos) {
    const chave = chavePartido(p);
    const atual = contagem.get(chave);
    if (atual) atual.assentos++;
    else contagem.set(chave, { partido: p, assentos: 1 });
  }
  return [...contagem.values()];
}

export type Cadeira = { x: number; y: number; angulo: number; fileira: number };

export type Hemiciclo = {
  cadeiras: Cadeira[];
  /** Raio de cada bolinha, na mesma escala das coordenadas (raio externo = 1). */
  raio: number;
  /** Raio da fileira de dentro: o espaço livre no centro, onde vai o total. */
  raioInterno: number;
};

/** Raio da fileira de dentro em relação à de fora, quando há mais de uma fileira. */
const INTERNO = 0.4;
/** Até quantas cadeiras cabem numa fileira só (bancadas pequenas, de um estado). */
const MAX_UMA_FILEIRA = 12;

const raiosDas = (fileiras: number) =>
  fileiras === 1 ? [1] : Array.from({ length: fileiras }, (_, i) => INTERNO + (i * (1 - INTERNO)) / (fileiras - 1));

/** Quantas cadeiras cabem em cada fileira: o comprimento do arco dividido pelo espaço entre fileiras. */
function capacidades(fileiras: number) {
  if (fileiras === 1) return [MAX_UMA_FILEIRA];
  const passo = (1 - INTERNO) / (fileiras - 1);
  return raiosDas(fileiras).map((r) => Math.floor((Math.PI * r) / passo) + 1);
}

/** Divide `total` entre as fileiras na proporção das capacidades (maiores restos), sem passar de nenhuma. */
function repartir(total: number, caps: number[]) {
  const soma = caps.reduce((s, c) => s + c, 0);
  const exatos = caps.map((c) => (total * c) / soma);
  const partes = exatos.map(Math.floor);
  let falta = total - partes.reduce((s, p) => s + p, 0);
  const porResto = exatos.map((e, i) => ({ i, resto: e - Math.floor(e) })).sort((a, b) => b.resto - a.resto || b.i - a.i);
  for (const { i } of porResto) {
    if (falta === 0) break;
    if (partes[i] < caps[i]) {
      partes[i]++;
      falta--;
    }
  }
  return partes;
}

/**
 * Posições das `total` cadeiras num semicírculo de raio 1 com centro em (0, 0) e o arco para cima (y negativo,
 * como no SVG), em ordem da esquerda para a direita: as cadeiras são ordenadas pelo ângulo, então cada partido
 * que recebe as próximas N cadeiras forma uma fatia. Número de fileiras: o menor em que todas cabem.
 */
export function hemiciclo(total: number): Hemiciclo {
  if (total <= 0) return { cadeiras: [], raio: 0, raioInterno: INTERNO };
  let fileiras = 1;
  while (capacidades(fileiras).reduce((s, c) => s + c, 0) < total) fileiras++;

  const raios = raiosDas(fileiras);
  const porFileira = repartir(total, capacidades(fileiras));
  const cadeiras: Cadeira[] = [];
  porFileira.forEach((n, fileira) => {
    const r = raios[fileira];
    for (let j = 0; j < n; j++) {
      // Da esquerda (π) para a direita (0); uma cadeira só fica no topo.
      const angulo = n === 1 ? Math.PI / 2 : Math.PI * (1 - j / (n - 1));
      cadeiras.push({ x: r * Math.cos(angulo), y: -r * Math.sin(angulo), angulo, fileira });
    }
  });
  // Mesma ângulo (as pontas e o topo): a fileira de dentro primeiro, para as fatias ficarem retas.
  cadeiras.sort((a, b) => b.angulo - a.angulo || a.fileira - b.fileira);

  const espacamento =
    fileiras > 1
      ? (1 - INTERNO) / (fileiras - 1)
      : Math.min(0.25, porFileira[0] > 1 ? (Math.PI / (porFileira[0] - 1)) * 0.9 : 0.25);
  return { cadeiras, raio: espacamento * 0.4, raioInterno: fileiras > 1 ? INTERNO : 1 - espacamento };
}

/** Partido de cada cadeira, na ordem do hemiciclo: as primeiras N cadeiras para o primeiro grupo, e assim por diante. */
export function distribuirCadeiras<T extends { assentos: number }>(grupos: T[]): T[] {
  return grupos.flatMap((g) => Array.from({ length: g.assentos }, () => g));
}
