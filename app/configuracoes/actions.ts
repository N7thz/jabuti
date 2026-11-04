"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { comoUsuario } from "@/lib/como-usuario";
import { donoDa } from "@/lib/fixados";
import { getSession, requireSession } from "@/lib/session";

/**
 * Tudo o que a conta guarda fora do usuário do banco: fixados, seguidos, notificações, perfil (cidade, preferências
 * do site, última visita ao painel), listas (os itens caem junto por cascata) e empresas vigiadas. São ligados ao email, não ao usuário do banco, então saem à parte quando a conta é excluída.
 * Mesma lista de /api/meus-dados: o que se baixa é o que se apaga.
 */
function apagarDadosDe(sessao: { user: { email: string } }) {
  const usuario = donoDa(sessao);
  // Tudo numa transação, com o banco avisado de quem é a pessoa (RLS, ver lib/rls.ts): apaga tudo ou nada.
  return comoUsuario(usuario, async (tx) => {
    await tx.fixado.deleteMany({ where: { usuario } });
    await tx.seguido.deleteMany({ where: { usuario } });
    await tx.notificacao.deleteMany({ where: { usuario } });
    await tx.perfilUsuario.deleteMany({ where: { usuario } });
    await tx.lista.deleteMany({ where: { usuario } });
    await tx.empresaVigiada.deleteMany({ where: { usuario } });
  });
}

/**
 * Apaga todos os dados de quem está logado (ver apagarDadosDe), mantendo a conta. Exige a caixa de confirmação marcada;
 * funciona sem JavaScript, porque é um <form action> comum.
 */
export async function apagarMeusDados(formData: FormData) {
  const sessao = await requireSession();
  if (formData.get("confirmo") !== "sim") redirect("/configuracoes?dados=confirme#dados-salvos");

  await apagarDadosDe(sessao);
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
 * por cascata) e os dados ligados ao email. O Better Auth só aceita com login recente (até 1 dia); se a sessão for
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
  await apagarDadosDe(sessao);
  redirect("/configuracoes?conta=excluida#conta");
}
