import "server-only";

import { checkBotId } from "botid/server";
import { headers } from "next/headers";

/**
 * Diz se o envio parece vir de um robô, segundo a Vercel BotID (o script dela roda no navegador e anexa
 * um sinal ao POST).
 *
 * Sem JavaScript o sinal não existe. Como os formulários do portal precisam funcionar sem JavaScript, esse
 * caso não é tratado como robô: fica só com o limite de tentativas por endereço (lib/limite.ts), que já
 * vale para todo mundo. A BotID pega o robô que roda um navegador de verdade, que o limite sozinho não vê.
 * Fora da Vercel (dev, testes) a BotID responde "humano".
 */
export async function pareceRobo(): Promise<boolean> {
  const h = await headers();
  if (!h.has("x-is-human")) return false;
  try {
    const { isBot, isVerifiedBot } = await checkBotId();
    return isBot && !isVerifiedBot;
  } catch (erro) {
    // Falha da verificação não pode trancar o formulário de quem é gente.
    console.error("[botid] verificação falhou:", erro);
    return false;
  }
}

export const MENSAGEM_ROBO = "Não conseguimos confirmar que o envio veio de uma pessoa. Recarregue a página e tente de novo.";
