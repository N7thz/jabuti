import "server-only";

import { db } from "@/lib/db";
import { donoDa } from "@/lib/fixados";
import { getSession, requireSession } from "@/lib/session";

// Perfil de quem está logado (cidade escolhida, preferências, última visita ao painel). Dado pessoal:
// lê a sessão a cada chamada e nunca entra em "use cache".

export async function getDono() {
  const sessao = await getSession();
  return sessao ? donoDa(sessao) : null;
}

export async function exigirDono() {
  return donoDa(await requireSession());
}

export async function getPerfil(usuario: string) {
  return db.perfilUsuario.findUnique({ where: { usuario } });
}

/** Guarda a cidade de "Meus representantes" (null tira). */
export async function salvarMunicipioDo(usuario: string, municipioIbge: number | null) {
  await db.perfilUsuario.upsert({
    where: { usuario },
    create: { usuario, municipioIbge },
    update: { municipioIbge },
  });
}

/**
 * Marca a visita ao painel. Só avança depois de 6 horas da última marca: recarregar a página ou voltar
 * logo depois não some com as novidades que a pessoa ainda está lendo.
 */
export async function marcarPainelVisto(usuario: string, vistoEm: Date | null) {
  const agora = new Date();
  if (vistoEm && agora.getTime() - vistoEm.getTime() < 6 * 3_600_000) return;
  await db.perfilUsuario.upsert({
    where: { usuario },
    create: { usuario, painelVistoEm: agora },
    update: { painelVistoEm: agora },
  });
}
