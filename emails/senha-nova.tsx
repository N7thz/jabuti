import { EmailComLink } from "./componentes/email-com-link";

export const assuntoSenhaNova = "Jabuti: criar uma senha nova";

/** Link de "Esqueci minha senha". */
export default function SenhaNova({ url }: { url: string }) {
  return (
    <EmailComLink
      previa="Recebemos um pedido para criar uma senha nova para a sua conta."
      titulo="Criar uma senha nova"
      paragrafos={["Olá.", "Recebemos um pedido para criar uma senha nova para a sua conta no Jabuti."]}
      textoBotao="Escolher a senha nova"
      url={url}
      avisos={["O link vale por 1 hora. Se não foi você, ignore este email: nada muda na sua conta."]}
    />
  );
}

SenhaNova.PreviewProps = { url: "https://portal-jabuti.com.br/redefinir-senha?token=exemplo" };
