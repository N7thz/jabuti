import { ArrowLeftIcon, ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BaixarCsv } from "@/components/baixar-csv";
import { Aviso } from "@/components/meu/aviso";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatarData } from "@/lib/format/datas";
import { apagarLista, removerItem, renomearLista, salvarNota } from "@/lib/meu/actions";
import { getLista, ROTULO_TIPO } from "@/lib/meu/listas";
import { getDono } from "@/lib/meu/perfil";
import { metadados } from "@/lib/metadados";

export const metadata = metadados({ titulo: "Lista · Jabuti", indexar: false, descricao: "Uma das suas listas, com anotações." });

export default function ListaPage({ params, searchParams }: PageProps<"/listas/[id]">) {
  return (
    <div data-secao="parlamentares" className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 xs:px-6 py-[clamp(2rem,5vw,4rem)]">
      <Link
        href="/listas"
        className="inline-flex h-10 w-fit items-center gap-2 rounded-lg text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        Minhas listas
      </Link>
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <Conteudo params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Conteudo({ params, searchParams }: PageProps<"/listas/[id]">) {
  const [{ id }, sp, usuario] = await Promise.all([params, searchParams, getDono()]);
  if (!usuario) {
    return (
      <p className="rounded-xl border bg-card p-4">
        <Link href={`/entrar?de=${encodeURIComponent(`/listas/${id}`)}`} className="text-link underline">
          Entre na sua conta
        </Link>{" "}
        para ver esta lista.
      </p>
    );
  }
  const lista = await getLista(usuario, id);
  if (!lista) notFound();

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-[clamp(1.75rem,3.5vw,2.5rem)] leading-tight font-bold">{lista.nome}</h1>
        <p className="text-muted-foreground">
          {lista.itens.length} {lista.itens.length === 1 ? "item" : "itens"} · criada em {formatarData(lista.criadaEm)}. Só você
          vê esta lista.
        </p>
      </header>
      <Aviso codigo={sp.aviso} />

      <div className="flex flex-wrap items-end gap-4">
        {lista.itens.length > 0 && <BaixarCsv href={`/api/csv/lista/${lista.id}`} rotulo="Baixar a lista" />}
        <details className="rounded-lg border bg-card">
          <summary className="flex min-h-10 cursor-pointer items-center px-3 text-sm font-medium">Renomear ou apagar</summary>
          <div className="flex flex-col gap-4 border-t p-3">
            <form action={renomearLista} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="lista" value={lista.id} />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="renomear" className="text-sm font-medium">
                  Novo nome
                </label>
                <Input id="renomear" name="nome" defaultValue={lista.nome} required maxLength={80} className="w-64" />
              </div>
              <Button type="submit" variant="outline" className="h-10">
                Renomear
              </Button>
            </form>
            <form action={apagarLista} className="flex flex-col items-start gap-2 rounded-lg border border-destructive/40 p-3">
              <input type="hidden" name="lista" value={lista.id} />
              <p className="text-sm">Apagar a lista remove todos os itens e anotações dela. Não dá para desfazer.</p>
              <Button type="submit" variant="destructive" size="sm">
                Apagar lista
              </Button>
            </form>
          </div>
        </details>
      </div>

      {lista.itens.length === 0 ? (
        <p className="text-muted-foreground">
          Lista vazia. Use &quot;Salvar em lista&quot; nas páginas de votações, empresas e emendas para adicionar itens.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {lista.itens.map((item) => {
            const externo = item.url.startsWith("http");
            return (
              <li key={item.id} id={`item-${item.id}`} className="flex scroll-mt-24 flex-col gap-3 rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-col gap-1">
                    <Badge variant="secondary" className="w-fit">
                      {ROTULO_TIPO[item.tipo]}
                    </Badge>
                    {externo ? (
                      <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-link underline">
                        {item.rotulo}
                        <ExternalLinkIcon aria-hidden="true" className="size-3.5" />
                        <span className="sr-only">(abre em nova aba)</span>
                      </a>
                    ) : (
                      <Link href={item.url} className="font-semibold text-link underline">
                        {item.rotulo}
                      </Link>
                    )}
                    <span className="text-xs text-muted-foreground">Salvo em {formatarData(item.criadoEm)}</span>
                  </div>
                  <form action={removerItem}>
                    <input type="hidden" name="item" value={item.id} />
                    <Button type="submit" variant="ghost" size="sm" aria-label={`Remover ${item.rotulo} da lista`}>
                      Remover
                    </Button>
                  </form>
                </div>
                <form action={salvarNota} className="flex flex-col gap-2">
                  <input type="hidden" name="item" value={item.id} />
                  <label htmlFor={`nota-${item.id}`} className="text-sm font-medium">
                    Anotação
                  </label>
                  <Textarea id={`nota-${item.id}`} name="nota" defaultValue={item.nota ?? ""} maxLength={2000} rows={2} />
                  <Button type="submit" variant="outline" size="sm" className="w-fit">
                    Salvar anotação
                  </Button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
