import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";

export const TAG_APOIADORES = "apoiadores";

/** Mural de /apoie, do apoio mais antigo para o mais novo. Atualiza na hora quando o admin mexe (updateTag). */
export async function getApoiadores() {
  "use cache";
  cacheLife("days");
  cacheTag(TAG_APOIADORES);

  return db.apoiador.findMany({ orderBy: { criadoEm: "asc" }, select: { id: true, nome: true } });
}

/** Lista completa para o admin, do mais novo para o mais antigo. Sem cache: o admin vê o que está no banco. */
export function listarApoiadoresAdmin() {
  return db.apoiador.findMany({ orderBy: { criadoEm: "desc" }, select: { id: true, nome: true, criadoPor: true, criadoEm: true } });
}
