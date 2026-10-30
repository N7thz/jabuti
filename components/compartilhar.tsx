import { urlDoSite } from "@/lib/site";

import { CompartilharBotoes } from "./compartilhar-botoes";

/**
 * Compartilhar um resumo em texto com o link da página. Sem JavaScript sobram os links de WhatsApp
 * e Telegram; com JavaScript entram o menu de compartilhar do aparelho e o "copiar".
 */
export function Compartilhar({ texto, caminho }: { texto: string; caminho: string }) {
  return <CompartilharBotoes texto={texto} url={urlDoSite(caminho)} />;
}
