import { FormularioConta } from "@/components/conta/formulario-conta";
import { LinkConta, TelaConta } from "@/components/conta/tela-conta";
import { metadados } from "@/lib/metadados";

export const metadata = metadados({
  titulo: "Criar conta · Jabuti",
  descricao: "Crie uma conta com email e senha para fixar políticos, partidos e bancadas.",
});

export default function CadastrarPage() {
  return (
    <TelaConta
      titulo="Criar conta"
      descricao="Depois de criar, enviamos um link para o seu email. A conta só funciona depois que você abre esse link: assim ninguém cria conta com o email de outra pessoa."
      rodape={
        <p>
          Já tem conta? <LinkConta href="/entrar">Entrar</LinkConta>
        </p>
      }
    >
      <FormularioConta tipo="cadastrar" />
    </TelaConta>
  );
}
