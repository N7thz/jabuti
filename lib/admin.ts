import "server-only";

import { notFound } from "next/navigation";

import { donoDa } from "@/lib/fixados";
import { getSession } from "@/lib/session";

// Perfil de admin: quem entra com um dos emails de ADMIN_EMAILS (separados por vírgula), com o email
// confirmado. Fica na configuração do servidor, não no banco: ninguém vira admin por uma falha no portal,
// e trocar a lista é mudar a variável e publicar de novo.

function emailsAdmin() {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

type SessaoBasica = { user: { email: string; emailVerified: boolean } };

export const ehAdmin = (sessao: SessaoBasica | null) => !!sessao && sessao.user.emailVerified && emailsAdmin().has(donoDa(sessao));

/**
 * Sessão de admin ou 404. Responde "não encontrado" em vez de "sem permissão" para não anunciar que a
 * página existe; vale para as páginas e para as Server Actions do admin.
 */
export async function exigirAdmin() {
  const sessao = await getSession();
  if (!sessao || !ehAdmin(sessao)) notFound();
  return sessao;
}
