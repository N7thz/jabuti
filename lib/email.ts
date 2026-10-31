import "server-only";

/**
 * Envia um email pela API do Resend (https://resend.com). Usado pelo login (confirmação de email e
 * redefinição de senha). Sem domínio verificado no Resend, só o remetente de teste funciona, e ele
 * entrega apenas para o email dono da conta do Resend.
 * Lança erro se não conseguir enviar: o Better Auth devolve a falha para a tela.
 */
export async function enviarEmail({ para, assunto, texto }: { para: string; assunto: string; texto: string }) {
  const chave = process.env.RESEND_API_KEY;
  const de = process.env.EMAIL_REMETENTE || process.env.FEEDBACK_REMETENTE || "Jabuti <onboarding@resend.dev>";
  if (!chave) throw new Error("RESEND_API_KEY não configurada; email não enviado.");

  const resposta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: de, to: [para], subject: assunto, text: texto }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!resposta.ok) throw new Error(`Resend recusou o email (${resposta.status}): ${await resposta.text()}`);
}
