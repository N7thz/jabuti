import { EmailComLink } from "./componentes/email-com-link";

export const assuntoBoasVindas = "Boas-vindas ao Jabuti: ative sua conta";

/** Link mágico de quem ainda não tem conta: a conta nasce quando a pessoa abre o link. */
export default function BoasVindas({ url }: { url: string }) {
  return (
    <EmailComLink
      previa="Abra o link para criar sua conta e já entrar no Jabuti."
      titulo="Boas-vindas ao Jabuti!"
      paragrafos={[
        "Para criar sua conta e já entrar, use o botão abaixo.",
        "Com a conta você fixa políticos, partidos e bancadas para acompanhar de perto. Não precisa de senha: sempre que quiser entrar, peça um link novo. Se preferir uma senha, crie em “Esqueci minha senha”.",
      ]}
      textoBotao="Criar minha conta"
      url={url}
      avisos={[
        "O link vale por 1 hora e funciona uma vez só. Se você não pediu para criar uma conta, ignore este email.",
      ]}
    />
  );
}

BoasVindas.PreviewProps = { url: "https://portal-jabuti.com.br/api/auth/magic-link/verify?token=exemplo" };
