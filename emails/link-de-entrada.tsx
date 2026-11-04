import { EmailComLink } from "./componentes/email-com-link";

export const assuntoLinkDeEntrada = "Jabuti: seu link para entrar";

/** Link mágico de quem já tem conta. */
export default function LinkDeEntrada({ url }: { url: string }) {
  return (
    <EmailComLink
      previa="Seu link para entrar no Jabuti. Vale por 1 hora."
      titulo="Seu link para entrar"
      paragrafos={["Olá.", "Você já tem conta no Jabuti com este email. Para entrar, use o botão abaixo."]}
      textoBotao="Entrar no Jabuti"
      url={url}
      avisos={[
        "O link vale por 1 hora e funciona uma vez só. Se não foi você, ignore este email: ninguém entra sem ele.",
      ]}
    />
  );
}

LinkDeEntrada.PreviewProps = { url: "https://portal-jabuti.com.br/api/auth/magic-link/verify?token=exemplo" };
