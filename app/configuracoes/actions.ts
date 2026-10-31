"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { donoDa } from "@/lib/fixados";
import { getSession, requireSession } from "@/lib/session";

/** Fixados são ligados ao email (não ao usuário do banco), então saem à parte quando a conta é excluída. */
function apagarFixadosDe(sessao: { user: { email: string } }) {
  return db.fixado.deleteMany({ where: { usuario: donoDa(sessao) } });
}

/**
 * Apaga os atalhos fixados de quem está logado, mantendo a conta. Exige a caixa de confirmação marcada;
 * funciona sem JavaScript, porque é um <form action> comum.
 */
export async function apagarMeusDados(formData: FormData) {
  const sessao = await requireSession();
  if (formData.get("confirmo") !== "sim") redirect("/configuracoes?dados=confirme#dados-salvos");

  await apagarFixadosDe(sessao);
  redirect("/configuracoes?dados=apagados#dados-salvos");
}

/**
 * Sai da conta neste navegador. O `confirmo=sim` vem do diálogo (com JS) ou do painel de confirmação
 * (sem JS, ver `?confirmar=sair`); sem ele, volta para confirmar em vez de sair direto.
 */
export async function sairDaConta(formData: FormData) {
  if (!(await getSession())) redirect("/configuracoes#conta");
  if (formData.get("confirmo") !== "sim") redirect("/configuracoes?confirmar=sair#conta");

  // O plugin nextCookies deixa o Better Auth apagar o cookie da sessão a partir da Server Action.
  await auth.api.signOut({ headers: await headers() });
  redirect("/configuracoes?conta=saiu#conta");
}

/**
 * Exclui a conta de verdade: o usuário do banco (com sessões, senha e vínculo com o Google, que caem junto
 * por cascata) e os fixados do email. O Better Auth só aceita com login recente (até 1 dia); se a sessão for
 * mais antiga, a pessoa sai e é levada a entrar de novo para confirmar que é ela.
 */
export async function excluirConta(formData: FormData) {
  const sessao = await requireSession();
  if (formData.get("confirmo") !== "sim") redirect("/configuracoes?confirmar=excluir#conta");

  const cabecalhos = await headers();
  try {
    await auth.api.deleteUser({ body: {}, headers: cabecalhos });
  } catch (erro) {
    if (!(erro instanceof APIError)) throw erro;
    console.error("[conta] exclusão recusada:", erro.body);
    await auth.api.signOut({ headers: cabecalhos });
    redirect(`/entrar?de=${encodeURIComponent("/configuracoes#conta")}&motivo=excluir`);
  }
  await apagarFixadosDe(sessao);
  redirect("/configuracoes?conta=excluida#conta");
}
