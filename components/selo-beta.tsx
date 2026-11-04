"use client";

import Link from "next/link";

import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";

/**
 * Selo "Beta" do header. Não usa <Termo> de propósito: o <Termo> marca a página com `data-termo-ref`, e isso
 * faria "Termos desta página" aparecer em todas as páginas só por causa do header. Sem JavaScript, é um link
 * para o verbete no glossário; com JavaScript, abre o balão com a explicação curta. O texto vem do servidor
 * (verbete "beta" de lib/glossario.ts) para o glossário inteiro não ir para o navegador.
 */
export function SeloBeta({ termo, curto }: { termo: string; curto: string }) {
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={300}
        closeDelay={200}
        nativeButton={false}
        render={<a href="/glossario?termo=beta#beta" onClick={(e) => e.preventDefault()} />}
        className="shrink-0 cursor-help rounded-full border border-border bg-muted px-1.5 py-0.5 text-xs font-semibold uppercase text-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring xs:px-2 xs:tracking-wide"
      >
        Beta
        <span className="sr-only"> (o que é isso?)</span>
      </PopoverTrigger>
      <PopoverContent className="w-[min(20rem,calc(100vw-2rem))]">
        <PopoverHeader>
          <PopoverTitle className="text-base font-semibold">{termo}</PopoverTitle>
          <PopoverDescription className="leading-relaxed text-popover-foreground">{curto}</PopoverDescription>
        </PopoverHeader>
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <Link
            href="/feedback"
            className="w-fit font-medium text-link underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Achou um erro? Conte aqui
          </Link>
          <Link
            href="/glossario?termo=beta#beta"
            className="w-fit font-medium text-link underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Entender melhor
          </Link>
        </p>
      </PopoverContent>
    </Popover>
  );
}
