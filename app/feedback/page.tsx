import { Suspense } from "react";

import { metadados } from "@/lib/metadados";
import { getSession } from "@/lib/session";

import { FeedbackForm } from "./feedback-form";

export const metadata = metadados({
  titulo: "Sugestões e problemas · Jabuti",
  descricao: "Mande uma sugestão de melhoria, avise de um erro ou de um dado errado no portal.",
});

export default function FeedbackPage({ searchParams }: PageProps<"/feedback">) {
  return (
    <div data-secao="glossario" className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 xs:px-6 py-[clamp(2rem,5vw,4rem)]">
      <header className="flex flex-col gap-3 animate-enter">
        <p className="text-sm font-medium tracking-wide text-secao uppercase">Fale com a gente</p>
        <h1 className="text-[clamp(2rem,4vw,3rem)] leading-tight font-bold">Sugestões e problemas</h1>
        <p className="max-w-[65ch] text-lg text-muted-foreground">
          Viu um número estranho, algo que não funcionou ou tem uma ideia para o portal ficar mais útil? Escreva aqui.
          Deixe seu email para podermos responder.
        </p>
      </header>

      <div className="rounded-2xl border bg-card p-4 shadow-soft animate-enter sm:p-6" style={{ "--stagger": 1 } as React.CSSProperties}>
        <Suspense fallback={<FeedbackForm />}>
          <FormularioPreenchido searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

/** Quem está logado já vem com nome e email; `?de=` traz a página de onde a pessoa clicou no link. */
async function FormularioPreenchido({ searchParams }: Pick<PageProps<"/feedback">, "searchParams">) {
  const [{ de }, sessao] = await Promise.all([searchParams, getSession()]);
  const pagina = typeof de === "string" && de.startsWith("/") ? de.slice(0, 300) : "";

  return <FeedbackForm valores={{ nome: sessao?.user.name ?? "", email: sessao?.user.email ?? "", pagina }} />;
}
