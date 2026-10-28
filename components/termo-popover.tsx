"use client";

import Link from "next/link";

import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Parte interativa do <Termo>. Antes de o JavaScript carregar (conexão lenta, ou sem JS), o termo é
 * só um link para "Termos desta página", no fim da página. Depois de hidratado, passar o mouse, tocar
 * ou apertar Enter abre o balão ao lado da palavra, e o preventDefault segura o pulo da âncora.
 */
export function TermoPopover({
  id,
  termo,
  curto,
  className,
  children,
}: {
  id: string;
  termo: string;
  curto: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      {/* Com mouse, abre ao passar por cima; o closeDelay deixa levar o cursor até o balão (WCAG 1.4.13). */}
      <PopoverTrigger
        openOnHover
        delay={300}
        closeDelay={200}
        nativeButton={false}
        render={<a href={`#glossario-${id}`} data-termo-ref={id} onClick={(e) => e.preventDefault()} />}
        className={cn(
          "cursor-help rounded-sm underline decoration-dotted decoration-from-font underline-offset-4 outline-none hover:decoration-solid focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        {children}
        <span className="sr-only"> (o que é isso?)</span>
      </PopoverTrigger>
      <PopoverContent className="w-[min(20rem,calc(100vw-2rem))]">
        <PopoverHeader>
          <PopoverTitle className="text-base font-semibold">{termo}</PopoverTitle>
          <PopoverDescription className="leading-relaxed text-popover-foreground">{curto}</PopoverDescription>
        </PopoverHeader>
        <Link
          href={`/glossario?termo=${id}#${id}`}
          className="w-fit font-medium text-link underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Entender melhor
        </Link>
      </PopoverContent>
    </Popover>
  );
}
