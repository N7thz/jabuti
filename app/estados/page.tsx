import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { AvisoFonte } from "@/components/aviso-fonte";
import { listarParlamentares } from "@/lib/parlamentares/queries";
import { UFS } from "@/lib/ufs";

export const metadata: Metadata = { title: "Estados · Jabuti" };

export default function EstadosPage() {
  return (
    <div data-secao="cidades" className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 xs:px-6 py-[clamp(2rem,5vw,4rem)]">
      <header className="flex flex-col gap-3 animate-enter">
        <p className="text-sm font-medium tracking-wide text-secao uppercase">Bancadas</p>
        <h1 className="text-[clamp(2rem,4vw,3rem)] leading-tight font-bold">Quem representa cada estado</h1>
        <p className="max-w-[60ch] text-lg text-muted-foreground">
          Escolha um estado para ver os deputados e senadores em exercício eleitos por ele.
        </p>
      </header>

      <Suspense
        fallback={
          <div role="status" aria-label="Carregando estados" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.keys(UFS).map((uf) => (
              <Skeleton key={uf} className="h-20" />
            ))}
          </div>
        }
      >
        <Estados />
      </Suspense>
    </div>
  );
}

async function Estados() {
  const { lista: parlamentares, indisponiveis } = await listarParlamentares();
  const temCasa = (casa: "camara" | "senado") => parlamentares.some((p) => p.casa === casa);
  // Casa fora do ar: some da contagem em vez de aparecer como "0 senadores".
  const contagem = (uf: string) =>
    (["camara", "senado"] as const)
      .filter(temCasa)
      .map((casa) => {
        const n = parlamentares.filter((p) => p.uf === uf && p.casa === casa).length;
        return `${n} ${casa === "camara" ? "deputados" : "senadores"}`;
      })
      .join(" · ");

  return (
    <>
      <AvisoFonte fontes={indisponiveis} consequencia="A contagem de parlamentares por estado está incompleta." />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(UFS).map(([sigla, nome], i) => (
          <li key={sigla} className="animate-enter" style={{ "--stagger": Math.min(i, 12) } as React.CSSProperties}>
            <Link
              href={`/estados/${sigla}`}
              className="flex items-center gap-4 rounded-lg border bg-card p-4 outline-none transition-shadow duration-200 hover:shadow-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span aria-hidden="true" className="grid size-12 place-items-center rounded-lg bg-accent font-mono font-bold text-accent-foreground">
                {sigla}
              </span>
              <span className="flex flex-col">
                <span className="font-semibold">{nome}</span>
                <span className="text-sm text-muted-foreground">
                  {contagem(sigla)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
