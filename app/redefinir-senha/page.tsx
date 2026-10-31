import { Suspense } from "react";

import { FormularioConta } from "@/components/conta/formulario-conta";
import { LinkConta, TelaConta } from "@/components/conta/tela-conta";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { metadados } from "@/lib/metadados";

export const metadata = metadados({ titulo: "Criar senha nova · Jabuti" });

export default function RedefinirSenhaPage({ searchParams }: PageProps<"/redefinir-senha">) {
  return (
    <TelaConta
      titulo="Criar senha nova"
      rodape={
        <p>
          <LinkConta href="/recuperar-senha">Pedir outro link</LinkConta>
        </p>
      }
    >
      <Suspense fallback={<Skeleton className="h-48 w-full" />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </TelaConta>
  );
}

/** O link do email chega aqui com `?token=`; link vencido chega com `?error=INVALID_TOKEN`. */
async function Conteudo({ searchParams }: Pick<PageProps<"/redefinir-senha">, "searchParams">) {
  const { token, error } = await searchParams;
  if (error || typeof token !== "string" || !token) {
    return (
      <Alert variant="destructive" role="alert">
        <AlertTitle>Este link venceu ou já foi usado.</AlertTitle>
        <AlertDescription>Os links valem por 1 hora e só uma vez. Peça um novo abaixo.</AlertDescription>
      </Alert>
    );
  }
  return <FormularioConta tipo="redefinir" token={token} />;
}
