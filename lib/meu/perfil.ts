import "server-only";

import { cache } from "react";

import { comoUsuario } from "@/lib/como-usuario";
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

/** Memorizado por requisição: a barra lateral, o menu da conta e a página leem o perfil uma vez só. */
export const getPerfil = cache(async (usuario: string) =>
  comoUsuario(usuario).perfilUsuario.findUnique({ where: { usuario } }),
);

/** Guarda a cidade de "Meus representantes" (null tira). */
export async function salvarMunicipioDo(usuario: string, municipioIbge: number | null) {
  await comoUsuario(usuario).perfilUsuario.upsert({
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
  await comoUsuario(usuario).perfilUsuario.upsert({
    where: { usuario },
    create: { usuario, painelVistoEm: agora },
    update: { painelVistoEm: agora },
  });
}
