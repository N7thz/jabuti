import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { useId } from "react";

import { iniciais } from "@/components/parlamentar-item";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function Voltar() {
  return (
    // Link com o visual do Button (buttonVariants): o Button do base-ui poria role="button" num link.
    <Link href="/parlamentares" className={cn(buttonVariants({ variant: "ghost" }), "w-fit text-muted-foreground")}>
      <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
      Todos os parlamentares
    </Link>
  );
}

export function Cabecalho({
  nome,
  fotoUrl,
  cargo,
  partido,
  uf,
  situacao,
  dados,
  acoes,
}: {
  nome: string;
  fotoUrl: string | null;
  cargo: string;
  partido: string | null;
  uf: string | null;
  situacao?: string | null;
  dados: [string, React.ReactNode][];
  /** Ações do perfil (ex.: botões de fixar), mostradas abaixo dos dados. */
  acoes?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-6 animate-enter sm:flex-row sm:items-center">
      <Avatar className="size-28 shadow-soft">
        {fotoUrl && <AvatarImage src={fotoUrl} alt={`Foto de ${nome}`} />}
        <AvatarFallback className="text-2xl">{iniciais(nome)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium tracking-wide text-secao uppercase">
            {cargo} · {partido ?? "sem partido"}
            {uf && <>/{uf}</>}
          </p>
          <h1 className="text-[clamp(2rem,4vw,3rem)] leading-tight font-bold">{nome}</h1>
        </div>
        {situacao && <Badge variant="outline">{situacao}</Badge>}
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {dados.map(([rotulo, valor]) => (
            <div key={rotulo} className="flex gap-1.5">
              <dt className="text-muted-foreground">{rotulo}:</dt>
              <dd>{valor}</dd>
            </div>
          ))}
        </dl>
        {acoes}
      </div>
    </header>
  );
}

/** Âncoras do perfil, na ordem em que as seções aparecem. Funcionam sem JavaScript. */
export const SECOES = [
  { id: "resumo", rotulo: "Resumo" },
  { id: "votacoes", rotulo: "Como votou" },
  { id: "fidelidade", rotulo: "Partido e fidelidade" },
  { id: "cota", rotulo: "Cota parlamentar" },
  { id: "proposicoes", rotulo: "Proposições" },
  { id: "emendas", rotulo: "Emendas" },
  { id: "votos-e-emendas", rotulo: "Votos e emendas" },
  { id: "campanha", rotulo: "Eleição e campanha" },
  { id: "fiscalizacao", rotulo: "Fiscalização" },
] as const;

export function NavSecoes() {
  return (
    <nav aria-label="Seções do perfil" className="animate-enter">
      <ul className="flex flex-wrap gap-2">
        {SECOES.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className={cn(buttonVariants({ variant: "outline" }), "rounded-full px-4 font-medium")}
            >
              {s.rotulo}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Lista longa com rolagem própria: cresce até `altura` e depois rola dentro do card,
 * para uma seção extensa não empurrar o resto do perfil. A área recebe foco pelo teclado.
 */
export function Rolavel({
  children,
  className,
  preencher,
}: {
  children: React.ReactNode;
  className?: string;
  /**
   * Em duas colunas (lg), ocupa a altura que sobra no card em vez de usar a própria. `contain: size`
   * tira a lista da conta da altura: a linha fica com a altura do conteúdo fixo mais o `min-h` de cada
   * lista (padrão 16rem; passe outro em `className`), e as listas dos dois cards terminam alinhadas.
   */
  preencher?: boolean;
}) {
  return (
    <ScrollArea
      className={cn(
        "-mr-3 *:data-[slot=scroll-area-viewport]:max-h-[min(28rem,65dvh)] *:data-[slot=scroll-area-viewport]:pr-3",
        preencher && "lg:min-h-64 lg:flex-1 lg:[contain:size] lg:*:data-[slot=scroll-area-viewport]:max-h-none",
        className,
      )}
    >
      {children}
    </ScrollArea>
  );
}

export function Secao({
  id: ancora,
  titulo,
  descricao,
  children,
}: {
  /** Âncora para a navegação de seções (ver SECOES). */
  id?: string;
  titulo: string;
  descricao?: React.ReactNode;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <Card data-revelar id={ancora} role="region" aria-labelledby={id} className="scroll-mt-24 border-t-2 border-t-secao animate-enter">
      <CardHeader>
        <CardTitle className="text-xl font-bold">
          <h2 id={id}>{titulo}</h2>
        </CardTitle>
        {descricao && <CardDescription>{descricao}</CardDescription>}
      </CardHeader>
      {/* flex-1: num grid de colunas o card estica até a altura da linha e o conteúdo acompanha. */}
      <CardContent className="flex flex-1 flex-col">{children}</CardContent>
    </Card>
  );
}

export function SecaoSkeleton({ titulo }: { titulo: string }) {
  return (
    <div role="status" aria-label={`Carregando ${titulo.toLowerCase()}`}>
      <Skeleton className="h-72" />
    </div>
  );
}

export function PerfilSkeleton() {
  return (
    <div role="status" aria-label="Carregando parlamentar" className="flex items-center gap-6">
      <Skeleton className="size-28 rounded-full" />
      <div className="flex flex-1 flex-col gap-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-10 w-80 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
    </div>
  );
}
