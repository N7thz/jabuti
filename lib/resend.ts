// Envio de email pela API do Resend (https://resend.com), compartilhado pelo login (lib/email.ts)
// e pelo formulário /feedback (lib/feedback/enviar.ts).
// O layout de cada email fica em emails/ (react-email); emails/renderizar.ts gera o HTML e o texto puro.

const URL_RESEND = "https://api.resend.com/emails";

/**
 * Remetente de teste do Resend. Funciona sem domínio verificado, mas só entrega para o email dono da conta
 * do Resend. Vale enquanto EMAIL_REMETENTE e FEEDBACK_REMETENTE estiverem vazios.
 */
export const REMETENTE_PADRAO = "Jabuti <onboarding@resend.dev>";

/** Exemplo de remetente válido: um endereço do domínio do portal, verificado no Resend. */
export const EXEMPLO_REMETENTE = "Jabuti <avisos@portal-jabuti.com.br>";

/** Provedores de email gratuito: o Resend não aceita remetente desses domínios, porque não dá para verificá-los. */
const PROVEDORES_GRATUITOS = new Set([
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "hotmail.com.br",
  "outlook.com",
  "outlook.com.br",
  "yahoo.com",
  "yahoo.com.br",
  "icloud.com",
  "live.com",
  "msn.com",
  "bol.com.br",
  "uol.com.br",
  "terra.com.br",
]);

/** Domínio do endereço de um remetente, aceitando "Nome <email@dominio>" ou só "email@dominio". */
export function dominioDoRemetente(de: string): string | null {
  const endereco = de.match(/<([^>]+)>/)?.[1] ?? de;
  const dominio = endereco.trim().split("@")[1];
  return dominio ? dominio.trim().toLowerCase() : null;
}

const jaAvisados = new Set<string>();

/** Avisa no log (uma vez por remetente) quando o endereço é de provedor gratuito. Não bloqueia o envio. */
function avisarSeGratuito(de: string) {
  const dominio = dominioDoRemetente(de);
  if (!dominio || !PROVEDORES_GRATUITOS.has(dominio) || jaAvisados.has(de)) return;
  jaAvisados.add(de);
  console.warn(
    `[email] O remetente "${de}" é de um provedor gratuito (${dominio}). O Resend só aceita remetente de um ` +
      `domínio verificado na conta, então o envio deve ser recusado. Use um endereço do domínio do portal, ` +
      `por exemplo ${EXEMPLO_REMETENTE}, em EMAIL_REMETENTE ou FEEDBACK_REMETENTE.`,
  );
}

/**
 * Remetente configurado para cada tipo de email:
 * - "sistema" (login e resumo de notificações): EMAIL_REMETENTE, depois FEEDBACK_REMETENTE;
 * - "feedback" (formulário /feedback): FEEDBACK_REMETENTE, depois EMAIL_REMETENTE.
 * Com os dois vazios, vale o remetente de teste do Resend.
 */
export function remetente(tipo: "sistema" | "feedback"): string {
  const sistema = process.env.EMAIL_REMETENTE?.trim();
  const feedback = process.env.FEEDBACK_REMETENTE?.trim();
  const de = (tipo === "sistema" ? sistema || feedback : feedback || sistema) || REMETENTE_PADRAO;
  avisarSeGratuito(de);
  return de;
}

export interface AnexoResend {
  /** Nome do arquivo como aparece no email. */
  filename: string;
  /** Conteúdo em base64. */
  content: string;
}

export interface EmailResend {
  de: string;
  para: string[];
  assunto: string;
  /** Corpo em texto puro. Vai sempre, mesmo com `html`: clientes sem HTML e leitores de tela usam esta versão. */
  texto: string;
  /** Corpo em HTML, montado com os templates de emails/ (react-email). */
  html?: string;
  /** Endereço que recebe a resposta (o "responder" do cliente de email). */
  responderPara?: string;
  /** Cabeçalhos extras do email, como List-Unsubscribe. */
  cabecalhos?: Record<string, string>;
  anexos?: AnexoResend[];
  /** Tempo máximo de espera pela resposta do Resend, em milissegundos. Padrão: 10 segundos. */
  tempoLimiteMs?: number;
}

/** Falta a chave da API: o email não sai. Mensagem igual à que o login mostrava antes. */
export const MENSAGEM_SEM_CHAVE = "RESEND_API_KEY não configurada; email não enviado.";

/**
 * Manda o email para o Resend e devolve a resposta como veio, para cada chamador tratar o status do seu jeito.
 * Lança erro se RESEND_API_KEY não estiver configurada, se a rede falhar ou se passar do tempo limite.
 */
export async function postarNoResend(email: EmailResend): Promise<Response> {
  const chave = process.env.RESEND_API_KEY;
  if (!chave) throw new Error(MENSAGEM_SEM_CHAVE);

  const corpo = {
    from: email.de,
    to: email.para,
    subject: email.assunto,
    text: email.texto,
    ...(email.html && { html: email.html }),
    ...(email.responderPara && { reply_to: email.responderPara }),
    ...(email.cabecalhos && Object.keys(email.cabecalhos).length > 0 && { headers: email.cabecalhos }),
    ...(email.anexos && email.anexos.length > 0 && { attachments: email.anexos }),
  };

  return fetch(URL_RESEND, {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(email.tempoLimiteMs ?? 10_000),
  });
}

/** Como `postarNoResend`, mas também lança erro quando o Resend recusa o email (status fora de 2xx). */
export async function enviarPeloResend(email: EmailResend): Promise<void> {
  const resposta = await postarNoResend(email);
  if (!resposta.ok) throw new Error(`Resend recusou o email (${resposta.status}): ${await resposta.text()}`);
}
