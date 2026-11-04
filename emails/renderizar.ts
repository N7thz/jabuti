import { render } from "@react-email/components";
import type { ReactElement } from "react";

/**
 * HTML e versão em texto puro do mesmo email. O texto vai junto porque alguns clientes de email e leitores
 * de tela preferem a versão sem formatação, e porque melhora a entrega (email só com HTML pesa no filtro de spam).
 */
export async function renderizar(email: ReactElement) {
  const [html, texto] = await Promise.all([render(email), render(email, { plainText: true })]);
  return { html, texto };
}
