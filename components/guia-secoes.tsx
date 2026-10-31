"use client";

import { m } from "motion/react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type Secao = { id: string; titulo: string; nivel: 2 | 3 };

// Títulos de seção são os h2/h3 com id dentro do conteúdo; os escondidos (ex.: "Termos desta página" sem termos) ficam de fora.
const SELETOR = "#conteudo h2[id], #conteudo h3[id]";

function lerSecoes(): Secao[] {
  return Array.from(document.querySelectorAll<HTMLHeadingElement>(SELETOR))
    .filter((h) => h.getClientRects().length > 0 && !h.closest("[data-guia-ignorar]"))
    .map((h): Secao => ({ id: h.id, titulo: h.textContent?.trim() ?? "", nivel: h.tagName === "H3" ? 3 : 2 }))
    .filter((s) => s.titulo);
}

const iguais = (a: Secao[], b: Secao[]) =>
  a.length === b.length && a.every((s, i) => s.id === b[i].id && s.titulo === b[i].titulo);

/**
 * Guia lateral "Nesta página", como o sumário flutuante do Notion: tracinhos na borda direita que se abrem
 * na lista de títulos ao passar o mouse ou ao chegar pelo teclado. Fica no layout e lê os títulos do próprio
 * conteúdo, então qualquer página com duas ou mais seções ganha o guia sem configurar nada; seções que chegam
 * depois por streaming e a troca de página também são percebidas (MutationObserver no <main>).
 */
export function GuiaSecoes() {
  const [secoes, setSecoes] = useState<Secao[]>([]);
  const [ativa, setAtiva] = useState<string | null>(null);

  useEffect(() => {
    const main = document.getElementById("conteudo");
    if (!main) return;

    let quadro = 0;
    const atualizar = () => {
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(() => setSecoes((atual) => (iguais(atual, lerSecoes()) ? atual : lerSecoes())));
    };
    atualizar();
    const observador = new MutationObserver(atualizar);
    observador.observe(main, { childList: true, subtree: true, characterData: true });
    return () => {
      observador.disconnect();
      cancelAnimationFrame(quadro);
    };
  }, []);

  // Seção ativa: o último título que já passou de um terço da tela; no fim da página, o último de todos.
  useEffect(() => {
    if (secoes.length < 2) return;

    let quadro = 0;
    const medir = () => {
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(() => {
        const limite = window.innerHeight / 3;
        const noFim = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
        let atual = secoes[0].id;
        for (const s of secoes) {
          const el = document.getElementById(s.id);
          if (el && el.getBoundingClientRect().top <= limite) atual = s.id;
        }
        setAtiva(noFim ? secoes[secoes.length - 1].id : atual);
      });
    };
    medir();
    window.addEventListener("scroll", medir, { passive: true });
    window.addEventListener("resize", medir);
    return () => {
      window.removeEventListener("scroll", medir);
      window.removeEventListener("resize", medir);
      cancelAnimationFrame(quadro);
    };
  }, [secoes]);

  if (secoes.length < 2) return null;

  return (
    <nav
      aria-label="Nesta página"
      className="group/guia fixed top-1/2 right-2 z-30 hidden -translate-y-1/2 lg:block print:hidden"
    >
      {/* Tracinhos: só o mapa visual; os links de verdade estão na lista abaixo. */}
      <div aria-hidden="true" className="flex flex-col items-end gap-2.5 py-3 pr-1 pl-4">
        {secoes.map((s) => (
          <span
            key={s.id}
            className={cn(
              "h-0.5 rounded-full transition-colors duration-200",
              s.nivel === 2 ? "w-4" : "w-2.5",
              s.id === ativa ? "bg-foreground" : "bg-muted-foreground/40",
            )}
          />
        ))}
      </div>

      {/* Aberta no hover ou quando o foco do teclado entra num dos links (eles continuam na ordem de tabulação). */}
      <div
        className={cn(
          "absolute top-1/2 right-0 w-64 -translate-y-1/2 rounded-xl bg-popover p-2 text-popover-foreground shadow-lift ring-1 ring-border",
          "pointer-events-none opacity-0 motion-safe:translate-x-2 motion-safe:transition-[opacity,translate] motion-safe:duration-200",
          "group-hover/guia:pointer-events-auto group-hover/guia:translate-x-0 group-hover/guia:opacity-100",
          "group-focus-within/guia:pointer-events-auto group-focus-within/guia:translate-x-0 group-focus-within/guia:opacity-100",
        )}
      >
        <p className="px-2 pt-1 pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Nesta página</p>
        <ol className="flex max-h-[min(70dvh,32rem)] flex-col gap-0.5 overflow-y-auto">
          {secoes.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={s.id === ativa ? "location" : undefined}
                className={cn(
                  "relative isolate block rounded-md py-1.5 pr-2 text-sm leading-snug outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                  s.nivel === 2 ? "pl-2" : "pl-5",
                  s.id === ativa ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {/* Marca da seção ativa: desliza de um título para o outro (layoutId do Motion). */}
                {s.id === ativa && (
                  <m.span
                    layoutId="guia-secao-ativa"
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 rounded-md bg-muted"
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                )}
                {s.titulo}
              </a>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}
