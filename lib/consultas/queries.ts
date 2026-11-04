import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { createFetchResiliente, ErroHttp, NA_PAGINA } from "@/lib/sync/run";

import { type Ideia, indicePorMateria, lerIdeia, lerListaIdeias, type OrigemPopular, URL_IDEIAS_TRANSFORMADAS, urlIdeia } from "./ideias";
import { lerConsultaSenado, lerEnqueteCamara, urlConsultaSenado, urlEnqueteCamara } from "./ler";
import { lerEmLote } from "./lote";

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

// O índice de ideias lê ~80 páginas: um intervalo curto entre pedidos e poucas em paralelo, para não pesar no
// site do Senado. Algumas páginas de ideia nunca respondem (em novembro de 2026, 7 de 82 ficavam penduradas
// até o timeout, sempre as mesmas). Com nova tentativa e lotes fixos, cada uma segurava o lote por ~45 s e o
// índice levava minutos, prendendo o fim da página /leis. Agora: sem nova tentativa, timeout curto, vagas
// que não esperam a mais lenta e um prazo para o índice inteiro.
const buscarIdeia = createFetchResiliente({ minIntervalMs: 100, retries: 0, timeoutMs: 6_000, headers: { Accept: "text/html" } });
const PARALELO = 6;
const PRAZO_INDICE_MS = 20_000;
/** Acima disso o índice sai incompleto demais para ficar guardado por dias: falha e é refeito na próxima visita. */
const FALTA_TOLERADA = 0.25;

async function lerIdeiaRemota(id: number): Promise<Ideia | null> {
  const url = urlIdeia(id);
  const resposta = await buscarIdeia(url);
  // 404: a ideia saiu do ar, não é falha da fonte. O resto (5xx, 429) conta como falta.
  if (resposta.status === 404) return null;
  if (!resposta.ok) throw new ErroHttp(resposta.status, url, resposta.statusText);
  return lerIdeia(id, await resposta.text());
}

/**
 * Matéria do Senado → ideia legislativa de origem, para todas as ideias que viraram proposição.
 * Objeto simples (não Map) porque o resultado passa pelo cache, que guarda só dados serializáveis.
 *
 * Uma ideia que não responde fica de fora até a próxima leitura (é um complemento do cartão). Se faltarem
 * muitas, o site está com problema: a função lança e nada fica guardado no "use cache".
 */
export async function getIdeiasPorMateria(): Promise<Record<number, OrigemPopular>> {
  "use cache";
  cacheLife("days");
  cacheTag("consultas");

  const lista = lerListaIdeias(await html(URL_IDEIAS_TRANSFORMADAS));
  const { lidos, faltaram } = await lerEmLote(lista, { paralelo: PARALELO, prazoMs: PRAZO_INDICE_MS }, (ideia) =>
    lerIdeiaRemota(ideia.id),
  );
  if (faltaram > lista.length * FALTA_TOLERADA) {
    throw new Error(`O e-Cidadania não respondeu ${faltaram} de ${lista.length} ideias legislativas.`);
  }
  return Object.fromEntries(indicePorMateria(lidos));
}

/** Ideia legislativa que deu origem à matéria, ou null se ela não nasceu de uma. */
export async function getOrigemPopular(codigoMateria: number): Promise<OrigemPopular | null> {
  return (await getIdeiasPorMateria())[codigoMateria] ?? null;
}
