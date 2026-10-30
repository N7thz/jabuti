import { HomeIcon, MapIcon, UsersIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia } from "@/components/ui/empty";
import { cn } from "@/lib/utils";

/*
 * Telas de "não encontrado" e de erro. Não há loading.tsx no app: toda página já envolve os dados em
 * <Suspense> com um esqueleto do próprio formato, e com cacheComponents um loading.tsx trocaria o
 * shell estático (título, link de voltar) por um esqueleto genérico, deixando a navegação pior.
 */

const LINKS = [
  { href: "/", rotulo: "Página inicial", Icone: HomeIcon },
  { href: "/parlamentares", rotulo: "Parlamentares", Icone: UsersIcon },
  { href: "/estados", rotulo: "Estados e cidades", Icone: MapIcon },
] as const;

/** Links para os pontos de partida do portal; funcionam sem JavaScript. */
export function LinksDeSaida() {
  return (
    <nav aria-label="Para onde ir" className="flex flex-wrap justify-center gap-2">
      {LINKS.map(({ href, rotulo, Icone }) => (
        // Link com o visual do Button (buttonVariants): o Button do base-ui poria role="button" num link.
        <Link key={href} href={href} className={cn(buttonVariants({ variant: "outline" }), "rounded-full px-4 font-medium")}>
          <Icone aria-hidden="true" />
          {rotulo}
        </Link>
      ))}
    </nav>
  );
}

export function AvisoPagina({
  icone,
  titulo,
  children,
  acoes,
  alerta,
}: {
  icone: React.ReactNode;
  titulo: string;
  children: React.ReactNode;
  acoes?: React.ReactNode;
  /** Erro: anuncia a mensagem no leitor de tela assim que ela substitui a página. */
  alerta?: boolean;
}) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 items-center px-4 py-16 xs:px-6">
      <Empty className="animate-enter rounded-lg border bg-card shadow-soft" role={alerta ? "alert" : undefined}>
        <EmptyHeader>
          <EmptyMedia variant="icon">{icone}</EmptyMedia>
          <h1 className="text-2xl font-bold text-balance">{titulo}</h1>
          <EmptyDescription className="text-pretty">{children}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="max-w-xl gap-4">
          {acoes}
          <LinksDeSaida />
        </EmptyContent>
      </Empty>
    </div>
  );
}
