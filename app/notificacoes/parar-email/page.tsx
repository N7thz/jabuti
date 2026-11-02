import { MailXIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia } from "@/components/ui/empty";
import { metadados } from "@/lib/metadados";

export const metadata = metadados({
  titulo: "Parar os emails de notificação · Jabuti",
  descricao: "Pare de receber o resumo por email das novidades sobre quem você segue.",
});

/**
 * Página do link "parar de receber" dos resumos por email. Só confirma com o botão (um POST):
 * abrir o link não descadastra, porque antivírus de email visitam os links sozinhos.
 */
export default function PararEmailPage({ searchParams }: PageProps<"/notificacoes/parar-email">) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 items-center px-4 py-16 xs:px-6">
      <Suspense fallback={null}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Conteudo({ searchParams }: Pick<PageProps<"/notificacoes/parar-email">, "searchParams">) {
  const { u, t, resultado } = await searchParams;
  const usuario = typeof u === "string" ? u : null;
  const assinatura = typeof t === "string" ? t : null;

  let titulo = "Parar de receber os resumos por email?";
  let descricao: React.ReactNode = (
    <>
      Você deixa de receber em <strong>{usuario}</strong> o resumo das novidades sobre quem segue. As notificações
      continuam em <Link href="/notificacoes">/notificacoes</Link>.
    </>
  );
  let acao: React.ReactNode = usuario && assinatura && (
    <form method="post" action={`/api/notificacoes/parar-email?u=${encodeURIComponent(usuario)}&t=${encodeURIComponent(assinatura)}&voltar=1`}>
      <Button type="submit">Parar de receber</Button>
    </form>
  );

  if (resultado === "ok") {
    titulo = "Pronto, você não vai mais receber os resumos.";
    descricao = "Se mudar de ideia, dá para ligar de novo em Configurações, com login.";
    acao = (
      <Link href="/configuracoes#notificacoes" className={buttonVariants({ variant: "outline" })}>
        Ir para Configurações
      </Link>
    );
  } else if (resultado === "invalido" || !usuario || !assinatura) {
    titulo = "Este link não é válido.";
    descricao = "Ele pode ter sido copiado pela metade. Com login, dá para desligar os emails em Configurações.";
    acao = (
      <Link href="/configuracoes#notificacoes" className={buttonVariants({ variant: "outline" })}>
        Ir para Configurações
      </Link>
    );
  }

  return (
    <Empty className="animate-enter rounded-lg border bg-card shadow-soft">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MailXIcon aria-hidden="true" />
          </EmptyMedia>
          <h1 className="text-2xl font-bold" aria-live="polite">
            {titulo}
          </h1>
          <EmptyDescription>{descricao}</EmptyDescription>
        </EmptyHeader>
      {acao && <EmptyContent>{acao}</EmptyContent>}
    </Empty>
  );
}
