"use server";

import { z } from "zod";

import { MENSAGEM_ROBO, pareceRobo } from "@/lib/bot";
import { enviarFeedback } from "@/lib/feedback/enviar";
import { CAMPOS_TEXTO, feedbackSchema, type CampoDeTexto, type CampoFeedback } from "@/lib/feedback/schema";
import { ipDoPedido, tentativaPermitida } from "@/lib/limite";

export type EstadoFeedback =
  | { status: "inicial" }
  | { status: "enviado" }
  | {
      status: "erro";
      /** Erro geral (falha no envio); os de cada campo vão em `erros`. */
      mensagem?: string;
      erros?: Partial<Record<CampoFeedback, string>>;
      /** O que a pessoa digitou, para o formulário voltar preenchido quando a página recarrega sem JavaScript. */
      /** Os anexos não voltam: input de arquivo não aceita valor inicial. */
      valores: Partial<Record<CampoDeTexto, string>>;
    };

/**
 * Recebe o formulário de /feedback (com ou sem JavaScript, via `useActionState`), valida e envia por email.
 * O campo `site` é uma armadilha para robôs: fica escondido, então só robô preenche. Nesse caso a resposta
 * finge sucesso e nada é enviado.
 */
export async function enviarFeedbackAction(_anterior: EstadoFeedback, formData: FormData): Promise<EstadoFeedback> {
  if (formData.get("site")) return { status: "enviado" };

  const valores = Object.fromEntries(CAMPOS_TEXTO.map((campo) => [campo, String(formData.get(campo) ?? "")]));
  const dados = feedbackSchema.safeParse({ ...valores, anexos: formData.getAll("anexos") });

  if (!dados.success) {
    const { fieldErrors } = z.flattenError(dados.error);
    const erros = Object.fromEntries(Object.entries(fieldErrors).map(([campo, lista]) => [campo, lista?.[0]]));
    return { status: "erro", erros, valores };
  }

  if (await pareceRobo()) return { status: "erro", mensagem: MENSAGEM_ROBO, valores };

  // Até 5 mensagens por hora de cada endereço: a armadilha `site` pega robô simples, este limite segura
  // quem tenta encher a caixa do portal (e gastar a cota do Resend) com envios em sequência.
  if (!(await tentativaPermitida(`feedback:ip:${await ipDoPedido()}`, { janela: 60 * 60, max: 5 }))) {
    return {
      status: "erro",
      mensagem: "Você já enviou várias mensagens na última hora. Espere um pouco e tente de novo; o que você escreveu continua aqui.",
      valores,
    };
  }

  const falha = await enviarFeedback(dados.data);
  if (falha) return { status: "erro", mensagem: `Não conseguimos enviar sua mensagem. ${falha}`, valores };

  return { status: "enviado" };
}
