import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { createFetchResiliente, ErroHttp, NA_PAGINA } from "@/lib/sync/run";

import { type Ideia, indicePorMateria, lerIdeia, lerListaIdeias, type OrigemPopular, URL_IDEIAS_TRANSFORMADAS, urlIdeia } from "./ideias";
import { lerConsultaSenado, lerEnqueteCamara, urlConsultaSenado, urlEnqueteCamara } from "./ler";

// Páginas HTML, não API; cada placar é guardado por horas, então o site da Casa recebe poucas visitas.
const buscar = createFetchResiliente({ ...NA_PAGINA, headers: { Accept: "text/html" } });

async function html(url: string) {
  const resposta = await buscar(url);
  if (!resposta.ok) throw new ErroHttp(resposta.status, url, resposta.statusText);
  return resposta.text();
}

/** Consulta pública do e-Cidadania da matéria, ou null se ela não tiver consulta. */
export async function getConsultaSenado(codigoMateria: number) {
  "use cache";
  cacheLife("hours");
  cacheTag("consultas");

  return lerConsultaSenado(await html(urlConsultaSenado(codigoMateria)));
}

/** Enquete da proposição no site da Câmara, ou null se a página não tiver enquete. */
export async function getEnqueteCamara(id: number) {
  "use cache";
  cacheLife("hours");
  cacheTag("consultas");

  return lerEnqueteCamara(await html(urlEnqueteCamara(id)));
}

// O índice de ideias lê ~80 páginas de uma vez: um intervalo curto entre pedidos e poucas em paralelo, para
// não pesar no site do Senado. Roda uma vez por dia (cacheLife "days").
const buscarIdeia = createFetchResiliente({ minIntervalMs: 150, retries: 2, timeoutMs: 15_000, esperaMaximaMs: 5_000, headers: { Accept: "text/html" } });
const PARALELO = 4;

async function lerIdeiaRemota(id: number): Promise<Ideia | null> {
  try {
    const resposta = await buscarIdeia(urlIdeia(id));
    return resposta.ok ? lerIdeia(id, await resposta.text()) : null;
  } catch {
    // Uma ideia fora do ar não derruba o índice: ela só fica de fora até a próxima leitura.
    return null;
  }
}

/**
 * Matéria do Senado → ideia legislativa de origem, para todas as ideias que viraram proposição.
 * Objeto simples (não Map) porque o resultado passa pelo cache, que guarda só dados serializáveis.
 */
export async function getIdeiasPorMateria(): Promise<Record<number, OrigemPopular>> {
  "use cache";
  cacheLife("days");
  cacheTag("consultas");

  const lista = lerListaIdeias(await html(URL_IDEIAS_TRANSFORMADAS));
  const ideias: Ideia[] = [];
  for (let i = 0; i < lista.length; i += PARALELO) {
    const lote = await Promise.all(lista.slice(i, i + PARALELO).map((ideia) => lerIdeiaRemota(ideia.id)));
    for (const ideia of lote) if (ideia) ideias.push(ideia);
  }
  return Object.fromEntries(indicePorMateria(ideias));
}

/** Ideia legislativa que deu origem à matéria, ou null se ela não nasceu de uma. */
export async function getOrigemPopular(codigoMateria: number): Promise<OrigemPopular | null> {
  return (await getIdeiasPorMateria())[codigoMateria] ?? null;
}
