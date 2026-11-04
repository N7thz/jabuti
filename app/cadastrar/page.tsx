import { FormularioConta } from "@/components/conta/formulario-conta";
import { LinkConta, TelaConta } from "@/components/conta/tela-conta";
import { metadados } from "@/lib/metadados";

export const metadata = metadados({
  titulo: "Criar conta · Jabuti",
  indexar: false,
  descricao: "Crie uma conta com um link no seu email, sem senha, para fixar políticos, partidos e bancadas.",
});

export default function CadastrarPage() {
  return (
    <TelaConta
      titulo="Criar conta"
      descricao="Não precisa de senha: enviamos um link de boas-vindas para o seu email e a conta é criada quando você abre o link. Assim ninguém cria conta com o email de outra pessoa. Já tem conta? O mesmo link serve para entrar."
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
