import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { createFetchResiliente, ErroHttp, NA_PAGINA } from "@/lib/sync/run";

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
