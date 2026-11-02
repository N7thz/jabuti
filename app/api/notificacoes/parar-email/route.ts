import { db } from "@/lib/db";
import { conferirDescadastro } from "@/lib/notificacoes/email";

/**
 * Para os resumos por email sem precisar de login: o link do email traz o endereço e uma assinatura
 * (lib/notificacoes/email.ts). Recebe o POST de um clique dos clientes de email (List-Unsubscribe-Post)
 * e o formulário da página /notificacoes/parar-email, que volta para ela com o resultado.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const usuario = url.searchParams.get("u")?.trim().toLowerCase() ?? "";
  const assinatura = url.searchParams.get("t") ?? "";
  const valido = usuario !== "" && conferirDescadastro(usuario, assinatura);

  if (valido) {
    await db.preferenciaNotificacao.upsert({
      where: { usuario },
      create: { usuario, email: "NUNCA" },
      update: { email: "NUNCA" },
    });
  }

  // Só o formulário da página pede volta; os clientes de email só olham o status.
  if (url.searchParams.get("voltar") === "1") {
    return Response.redirect(new URL(`/notificacoes/parar-email?resultado=${valido ? "ok" : "invalido"}`, url), 303);
  }
  return new Response(null, { status: valido ? 200 : 400 });
}
