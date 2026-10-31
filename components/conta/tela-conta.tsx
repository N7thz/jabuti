import Link from "next/link";

/** Moldura das telas de login e senha: título, texto de apoio, o cartão com o formulário e links embaixo. */
export function TelaConta({
  titulo,
  descricao,
  children,
  rodape,
}: {
  titulo: string;
  descricao?: React.ReactNode;
  children: React.ReactNode;
  rodape?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 xs:px-6 py-[clamp(2rem,6vw,5rem)]">
      <header className="flex flex-col gap-2 animate-enter">
        <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] leading-tight font-bold">{titulo}</h1>
        {descricao && <p className="text-muted-foreground">{descricao}</p>}
      </header>
      <div className="flex flex-col gap-5 rounded-2xl border bg-card p-4 shadow-soft animate-enter sm:p-6" style={{ "--stagger": 1 } as React.CSSProperties}>
        {children}
      </div>
      {rodape && <div className="flex flex-col gap-2 text-sm animate-enter" style={{ "--stagger": 2 } as React.CSSProperties}>{rodape}</div>}
    </div>
  );
}

/** Link de texto das telas de conta, com área de toque de 44px. */
export function LinkConta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center font-medium underline underline-offset-4 hover:text-primary">
      {children}
    </Link>
  );
}
