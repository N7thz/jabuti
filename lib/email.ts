import "server-only";

import type { ReactElement } from "react";

import { renderizar } from "../emails/renderizar";
import { enviarPeloResend, remetente } from "./resend";

/**
 * Envia um email do login (confirmação de email, link de entrada, senha nova) pela API do Resend
 * (https://resend.com). O conteúdo é um template de emails/, que vira HTML e texto puro.
 * Lança erro se não conseguir enviar: o Better Auth devolve a falha para a tela.
 */
export async function enviarEmail({ para, assunto, email }: { para: string; assunto: string; email: ReactElement }) {
  const { html, texto } = await renderizar(email);
  await enviarPeloResend({ de: remetente("sistema"), para: [para], assunto, texto, html });
}
