import { CircleCheckIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { SignInButton } from "@/components/auth-buttons";
import { FormularioConta } from "@/components/conta/formulario-conta";
import { LinkConta, TelaConta } from "@/components/conta/tela-conta";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { destinoSeguro } from "@/lib/conta/schemas";
import { metadados } from "@/lib/metadados";
import { getSession } from "@/lib/session";

export const metadata = metadados({
  titulo: "Entrar · Jabuti",
  descricao: "Entre com o Google ou com email e senha para fixar políticos, partidos e bancadas.",
});

export default function EntrarPage({ searchParams }: PageProps<"/entrar">) {
  return (
    <TelaConta
      titulo="Entrar"
      descricao="O portal é aberto para todos. A conta só serve para fixar políticos, partidos e bancadas e vê-los em qualquer aparelho."
      rodape={
        <>
          <p>
            Não tem conta? <LinkConta href="/cadastrar">Criar conta com email</LinkConta>
          </p>
          <p>
            <LinkConta href="/recuperar-senha">Esqueci minha senha</LinkConta>
          </p>
        </>
      }
    >
      <Suspense fallback={<Skeleton className="h-72 w-full" />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </TelaConta>
  );
}

async function Conteudo({ searchParams }: Pick<PageProps<"/entrar">, "searchParams">) {
  const [{ de, senha, motivo }, sessao] = await Promise.all([searchParams, getSession()]);
  const destino = destinoSeguro(de);
  if (sessao) redirect(destino);

  return (
    <>
      {motivo === "excluir" && (
        <Alert role="status">
          <AlertTitle>Por segurança, entre de novo para excluir sua conta.</AlertTitle>
          <AlertDescription>Excluir a conta pede um login feito há menos de um dia.</AlertDescription>
        </Alert>
      )}
      {senha === "nova" && (
        <Alert role="status">
          <CircleCheckIcon aria-hidden="true" />
          <AlertTitle>Senha nova salva. Entre com ela.</AlertTitle>
        </Alert>
      )}
      <SignInButton destino={destino} />
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Separator className="flex-1" />
        ou com email e senha
        <Separator className="flex-1" />
      </div>
      <FormularioConta tipo="entrar" de={destino} />
    </>
  );
}
