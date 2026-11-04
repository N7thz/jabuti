import { ListIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { Aviso } from "@/components/meu/aviso";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatarData } from "@/lib/format/datas";
import { criarLista } from "@/lib/meu/actions";
import { LIMITE_LISTAS } from "@/lib/meu/listas";
import { getListas } from "@/lib/meu/listas";
import { getDono } from "@/lib/meu/perfil";
import { metadados } from "@/lib/metadados";

export const metadata = metadados({
  titulo: "Minhas listas · Jabuti",
  indexar: false,
  descricao: "Votações, leis, empresas e emendas que você salvou, com anotações.",
});

export default function ListasPage({ searchParams }: PageProps<"/listas">) {
  return (
    <div data-secao="parlamentares" className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 xs:px-6 py-[clamp(2rem,5vw,4rem)]">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-medium tracking-wide text-secao uppercase">Minha conta</p>
        <h1 className="text-[clamp(2rem,4vw,3rem)] leading-tight font-bold">Minhas listas</h1>
        <p className="max-w-[60ch] text-lg text-muted-foreground">
          Junte votações, leis, empresas e emendas que você quer acompanhar ou usar numa pesquisa, com anotações só suas. Dá
          para baixar cada lista como planilha.
        </p>
      </header>
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Conteudo({ searchParams }: Pick<PageProps<"/listas">, "searchParams">) {
  const [params, usuario] = await Promise.all([searchParams, getDono()]);
  if (!usuario) {
    return (
      <p className="rounded-xl border bg-card p-4">
        <Link href="/entrar?de=%2Flistas" className="text-link underline">
          Entre na sua conta
        </Link>{" "}
        para criar listas.
      </p>
    );
  }
  const listas = await getListas(usuario);

  return (
    <>
      <Aviso codigo={params.aviso} />
      {listas.length < LIMITE_LISTAS && (
        <form action={criarLista} className="flex flex-wrap items-end gap-2 rounded-xl border bg-card p-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="nome-lista" className="text-sm font-medium">
              Nome da lista nova
            </label>
            <Input id="nome-lista" name="nome" required maxLength={80} placeholder="Ex.: Gastos da bancada do meu estado" className="w-80 max-w-full" />
          </div>
          <Button type="submit" className="h-10">
            Criar lista
          </Button>
        </form>
      )}
      {listas.length === 0 ? (
        <p className="text-muted-foreground">
          Nenhuma lista ainda. Crie uma acima ou use &quot;Salvar em lista&quot; nas páginas de votações, empresas e emendas.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {listas.map((l) => (
            <li key={l.id}>
              <Link
                href={`/listas/${l.id}`}
                className="flex min-h-11 flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex items-center gap-2 font-semibold">
                  <ListIcon aria-hidden="true" className="size-4 text-secao" />
                  {l.nome}
                </span>
                <span className="text-sm text-muted-foreground">
                  {l._count.itens} {l._count.itens === 1 ? "item" : "itens"} · criada em {formatarData(l.criadaEm)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
