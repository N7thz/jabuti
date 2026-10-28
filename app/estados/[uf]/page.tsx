import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { EmendasEstado } from "@/components/emendas/emendas-estado";
import { ParlamentarItem } from "@/components/parlamentar-item";
import { Badge } from "@/components/ui/badge";
import { ItemGroup } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { listarParlamentares } from "@/lib/parlamentares/queries";
import { isUf, UFS } from "@/lib/ufs";

export function generateStaticParams() {
  return Object.keys(UFS).map((uf) => ({ uf }));
}

export async function generateMetadata({ params }: PageProps<"/estados/[uf]">): Promise<Metadata> {
  const { uf } = await params;
  return { title: `${isUf(uf) ? UFS[uf] : "Estado"} · Portal da Transparência` };
}

export default function EstadoPage({ params, searchParams }: PageProps<"/estados/[uf]">) {
  return (
    <div data-secao="cidades" className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 xs:px-6 py-[clamp(2rem,5vw,4rem)]">
      <Link
        href="/estados"
        className="inline-flex h-10 w-fit items-center gap-2 rounded-lg text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        Todos os estados
      </Link>
      <Suspense fallback={<Skeleton className="h-96" />}>
        {params.then(({ uf }) => (
          <Bancada uf={uf} />
        ))}
      </Suspense>
      <Suspense
        fallback={
          <div role="status" aria-label="Carregando emendas" className="flex flex-col gap-3">
            <Skeleton className="h-10 w-72" />
            <Skeleton className="h-32" />
            <Skeleton className="h-64" />
          </div>
        }
      >
        {Promise.all([params, searchParams]).then(([{ uf }, { ano }]) =>
          isUf(uf) ? <EmendasEstado uf={uf} anoUrl={ano} /> : null,
        )}
      </Suspense>
    </div>
  );
}

async function Bancada({ uf }: { uf: string }) {
  if (!isUf(uf)) notFound();
  const bancada = (await listarParlamentares()).filter((p) => p.uf === uf);
  const senadores = bancada.filter((p) => p.casa === "senado");
  const deputados = bancada.filter((p) => p.casa === "camara");

  const partidos = Object.entries(Object.groupBy(bancada, (p) => p.partido ?? "Sem partido"))
    .map(([partido, membros = []]) => ({ partido, total: membros.length }))
    .sort((a, b) => b.total - a.total);

  return (
    <>
      <header className="flex flex-col gap-3 animate-enter">
        <p className="text-sm font-medium tracking-wide text-secao uppercase">Bancada de {uf}</p>
        <h1 className="text-[clamp(2rem,4vw,3rem)] leading-tight font-bold">{UFS[uf]}</h1>
        <p className="text-lg text-muted-foreground">
          {deputados.length} deputados e {senadores.length} senadores em exercício
        </p>
        <ul aria-label="Parlamentares por partido" className="flex flex-wrap gap-2">
          {partidos.map(({ partido, total }) => (
            <li key={partido}>
              <Badge variant="outline">
                {partido}: {total}
              </Badge>
            </li>
          ))}
        </ul>
      </header>

      {[
        { titulo: "Senadores", lista: senadores },
        { titulo: "Deputados federais", lista: deputados },
      ].map(({ titulo, lista }) => (
        <section key={titulo} aria-labelledby={titulo} className="flex flex-col gap-4">
          <h2 id={titulo} className="text-xl font-bold">
            {titulo} <span className="font-normal text-muted-foreground">({lista.length})</span>
          </h2>
          <ItemGroup className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {lista.map((p) => (
              <ParlamentarItem key={`${p.casa}-${p.id}`} parlamentar={p} />
            ))}
          </ItemGroup>
        </section>
      ))}
    </>
  );
}
