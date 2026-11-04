import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/lib/db";
import { listarParlamentares } from "@/lib/parlamentares/queries";
import { urlDoSite } from "@/lib/site";
import { UFS } from "@/lib/ufs";
import { linkVotacao } from "@/lib/votacoes/queries";

// Páginas fixas, das mais importantes para as menos.
const FIXAS = [
  "/",
  "/parlamentares",
  "/empresas",
  "/estados",
  "/orcamento",
  "/orcamento/loa",
  "/rankings/cota",
  "/leis",
  "/como-eu-votaria",
  "/comparar",
  "/parlamentares/cobrar",
  "/glossario",
  "/ajuda",
  "/apoie",
  "/feedback",
];

async function listarMunicipios() {
  "use cache";
  cacheLife("weeks");
  cacheTag("municipios");

  return db.municipio.findMany({ select: { ibge: true, uf: true }, orderBy: [{ uf: "asc" }, { nome: "asc" }] });
}

/** Votações guardadas pelos syncs da Câmara e do Senado, no mesmo endereço que a página usa. */
async function listarVotacoes() {
  "use cache";
  cacheLife("days");
  cacheTag("votacoes");

  const votacoes = await db.votacao.findMany({
    select: { casa: true, idExterno: true, data: true },
    orderBy: { data: "desc" },
  });
  return votacoes.map((v) => ({
    caminho: linkVotacao(v.casa === "CAMARA" ? "camara" : "senado", v.idExterno),
    data: v.data.toISOString(),
  }));
}

/**
 * Cerca de 6,5 mil endereços (594 parlamentares, 27 estados, ~5,6 mil cidades e as votações guardadas,
 * umas 250 em nov/2026): cabe num sitemap só, bem abaixo do limite de 50 mil. Se uma fonte falhar, o
 * sitemap sai sem ela em vez de dar erro.
 *
 * As emendas Pix ficam de fora: vêm ao vivo do Transferegov pelo id do plano de ação, que o banco não
 * guarda, e listar todas exigiria varrer a API inteira a cada geração.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [parlamentares, municipios, votacoes] = await Promise.all([
    listarParlamentares().then((r) => r.lista).catch(() => []),
    listarMunicipios().catch(() => []),
    listarVotacoes().catch(() => []),
  ]);

  return [
    ...FIXAS.map((caminho, i) => ({ url: urlDoSite(caminho), priority: i === 0 ? 1 : 0.8 })),
    ...parlamentares.map((p) => ({
      url: urlDoSite(p.casa === "camara" ? `/parlamentares/deputado/${p.id}` : `/parlamentares/senador/${p.id}`),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...Object.keys(UFS).map((uf) => ({ url: urlDoSite(`/estados/${uf}`), changeFrequency: "monthly" as const, priority: 0.6 })),
    ...municipios.map((m) => ({ url: urlDoSite(`/estados/${m.uf}/${m.ibge}`), changeFrequency: "monthly" as const, priority: 0.5 })),
    // Votação encerrada não muda: a data dela serve de última alteração.
    ...votacoes.map((v) => ({ url: urlDoSite(v.caminho), lastModified: v.data, changeFrequency: "yearly" as const, priority: 0.4 })),
  ];
}
