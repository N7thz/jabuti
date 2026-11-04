import "server-only";

import FeedbackRecebido from "../../emails/feedback";
import { renderizar } from "../../emails/renderizar";
import { postarNoResend, remetente } from "../resend";
import { ASSUNTOS, type Feedback } from "./schema";

/**
 * Manda a mensagem para o email do responsável pelo portal pela API do Resend (https://resend.com).
 * O `reply_to` é o email de quem escreveu: responder no próprio cliente de email já fala com a pessoa.
 * Devolve `null` se enviou, ou o motivo da falha em português para mostrar a quem escreveu
 * (o detalhe técnico vai para o log).
 */
export async function enviarFeedback(dados: Feedback): Promise<string | null> {
  const chave = process.env.RESEND_API_KEY;
  const para = process.env.FEEDBACK_EMAIL;

  if (!chave || !para) {
    console.error("[feedback] RESEND_API_KEY ou FEEDBACK_EMAIL não configurados; mensagem não enviada.");
    return "O envio de mensagens ainda não está configurado no nosso servidor. O problema é do nosso lado.";
  }

  const assunto = ASSUNTOS[dados.assunto];
  const resumo = dados.mensagem.replace(/\s+/g, " ").slice(0, 60);
  const anexos = dados.anexos.map((arquivo) => arquivo.name);
  // Texto puro escrito à mão: a conversão automática do HTML junta as quebras de linha da mensagem.
  const texto = [
    `Assunto: ${assunto}`,
    `Nome: ${dados.nome || "(não informado)"}`,
    `Email para resposta: ${dados.email}`,
    `Página: ${dados.pagina || "(não informada)"}`,
    `Anexos: ${anexos.length ? anexos.join(", ") : "nenhum"}`,
    "",
    dados.mensagem,
  ].join("\n");

  try {
    const { html } = await renderizar(
      FeedbackRecebido({ assunto, nome: dados.nome, email: dados.email, pagina: dados.pagina, anexos, mensagem: dados.mensagem }),
    );
    // O Resend recebe cada anexo como base64 no próprio JSON.
    const attachments = await Promise.all(
      dados.anexos.map(async (arquivo) => ({
        filename: arquivo.name,
        content: Buffer.from(await arquivo.arrayBuffer()).toString("base64"),
      })),
    );
    const resposta = await postarNoResend({
      // FEEDBACK_REMETENTE, depois EMAIL_REMETENTE; sem nenhum, o remetente de teste (entrega só ao dono da conta).
      de: remetente("feedback"),
      para: para.split(",").map((email) => email.trim()),
      responderPara: dados.email,
      assunto: `[Jabuti] ${assunto}: ${resumo}`,
      texto,
      html,
      anexos: attachments,
      // Mais tempo quando há anexos: até 10 MB (uns 13 MB em base64) precisam subir para o Resend.
      tempoLimiteMs: attachments.length > 0 ? 30_000 : 10_000,
    });
    if (resposta.ok) return null;
    console.error("[feedback] Resend recusou:", resposta.status, await resposta.text());
    return motivoDoStatus(resposta.status);
  } catch (erro) {
    console.error("[feedback] falha ao enviar:", erro);
    return erro instanceof DOMException && erro.name === "TimeoutError"
      ? "O serviço de email demorou demais para responder. Tente de novo em alguns minutos."
      : "Não conseguimos falar com o serviço de email. Tente de novo em alguns minutos.";
  }
}

function motivoDoStatus(status: number) {
  if (status === 429) return "O serviço de email recebeu pedidos demais agora. Tente de novo em alguns minutos.";
  if (status === 401 || status === 403) {
    return "O envio de mensagens está com a configuração errada no nosso servidor. O problema é do nosso lado.";
  }
  if (status >= 500) return "O serviço de email está fora do ar. Tente de novo em alguns minutos.";
  return `O serviço de email recusou a mensagem (código ${status}). Tente de novo mais tarde.`;
}
