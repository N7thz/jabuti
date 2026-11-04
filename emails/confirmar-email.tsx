import { EmailComLink } from "./componentes/email-com-link";

export const assuntoConfirmarEmail = "Jabuti: confirme seu email";

/** Confirmação de email de quem se cadastrou com senha. */
export default function ConfirmarEmail({ url }: { url: string }) {
  return (
    <EmailComLink
      previa="Confirme seu email para ativar sua conta no Jabuti."
      titulo="Confirme seu email"
      paragrafos={["Olá.", "Para ativar sua conta no Jabuti, confirme que este email é seu."]}
      textoBotao="Confirmar meu email"
      url={url}
      avisos={["O link vale por 1 hora. Se você não criou uma conta, ignore este email."]}
    />
  );
}

ConfirmarEmail.PreviewProps = { url: "https://portal-jabuti.com.br/api/auth/verify-email?token=exemplo" };
