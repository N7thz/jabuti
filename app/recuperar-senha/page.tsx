import { FormularioConta } from "@/components/conta/formulario-conta";
import { LinkConta, TelaConta } from "@/components/conta/tela-conta";
import { metadados } from "@/lib/metadados";

export const metadata = metadados({
  titulo: "Recuperar senha · Jabuti",
  descricao: "Receba por email um link para criar uma senha nova.",
});

export default function RecuperarSenhaPage() {
  return (
    <TelaConta
      titulo="Esqueci minha senha"
      descricao="Informe o email da sua conta. Enviamos um link para você criar uma senha nova."
      rodape={
        <p>
          Lembrou? <LinkConta href="/entrar">Voltar para entrar</LinkConta>
        </p>
      }
    >
      <FormularioConta tipo="recuperar" />
    </TelaConta>
  );
}
