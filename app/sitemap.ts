import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/lib/db";
import { listarParlamentares } from "@/lib/parlamentares/queries";
import { urlDoSite } from "@/lib/site";
import { UFS } from "@/lib/ufs";

// Páginas fixas, das mais importantes para as menos.
const FIXAS = ["/", "/parlamentares", "/empresas", "/estados", "/orcamento", "/orcamento/loa", "/rankings/cota", "/comparar", "/glossario"];

async function listarMunicipios() {
  "use cache";
  cacheLife("weeks");
  cacheTag("municipios");

  return db.municipio.findMany({ select: { ibge: true, uf: true }, orderBy: [{ uf: "asc" }, { nome: "asc" }] });
}

/**
 * Cerca de 6,2 mil endereços (594 parlamentares, 27 estados, ~5,6 mil cidades): cabe num sitemap só,
 * bem abaixo do limite de 50 mil. Se uma fonte falhar, o sitemap sai sem ela em vez de dar erro.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [parlamentares, municipios] = await Promise.all([
    listarParlamentares().then((r) => r.lista).catch(() => []),
    listarMunicipios().catch(() => []),
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
  ];
}
