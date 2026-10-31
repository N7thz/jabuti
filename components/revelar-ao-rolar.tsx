"use client";

import { inView } from "motion";
import { useEffect } from "react";

import { useAnimacoes } from "@/components/animacoes-provider";

// Mesma entrada do animate-enter (DESIGN.md): fade + translate-Y 16px → 0 em 480ms, cascata curta entre vizinhos.
const DESLOCAMENTO = "translateY(16px)";
const DURACAO = 480;
const CASCATA = 80;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const OCULTO = { opacity: 0, transform: DESLOCAMENTO };

/**
 * Faz os blocos marcados com `data-revelar` (dentro do <main>) entrarem ao chegar na tela. Fica no layout, como o
 * GuiaSecoes: a página só marca o atributo, sem virar componente de cliente. Só esconde o que está abaixo da tela
 * quando o JavaScript já rodou, então sem JS, com animações desligadas ou no "reduzir movimento" nada some.
 * Esconder e revelar é só Web Animations (fora da thread principal), sem escrever `style` no elemento: partes da
 * página que ainda vão hidratar (Suspense) acusariam diferença do HTML do servidor. O `inView` vem do Motion.
 */
export function RevelarAoRolar() {
  const { ativas } = useAnimacoes();

  useEffect(() => {
    const main = document.getElementById("conteudo");
    if (!ativas || !main) return;

    const vistos = new WeakSet<Element>();
    // Elemento escondido → animação que o segura invisível e o fim da observação.
    const esperando = new Map<HTMLElement, { segurar: Animation; parar: VoidFunction }>();
    let fila: HTMLElement[] = [];
    let quadroFila = 0;
    let quadroBusca = 0;

    // Os que entram no mesmo quadro (ex.: uma linha de cards) saem em cascata.
    const revelarFila = () => {
      fila.forEach((el, i) => {
        const espera = esperando.get(el);
        esperando.delete(el);
        el.animate([OCULTO, { opacity: 1, transform: "translateY(0)" }], {
          duration: DURACAO,
          delay: Math.min(i, 5) * CASCATA,
          easing: EASE,
          fill: "backwards",
        });
        espera?.segurar.cancel();
      });
      fila = [];
    };

    const procurar = () => {
      for (const el of main.querySelectorAll<HTMLElement>("[data-revelar]")) {
        if (vistos.has(el)) continue;
        vistos.add(el);
        // Já na tela (ou acima dela): fica como está, sem piscar.
        if (el.getBoundingClientRect().top < window.innerHeight) continue;
        const segurar = el.animate([OCULTO, OCULTO], { duration: 1, fill: "forwards" });
        const parar = inView(
          el,
          () => {
            esperando.get(el)?.parar();
            fila.push(el);
            cancelAnimationFrame(quadroFila);
            quadroFila = requestAnimationFrame(revelarFila);
          },
          { amount: 0.1 },
        );
        esperando.set(el, { segurar, parar });
      }
    };

    procurar();
    // Seções que chegam por streaming e a troca de página.
    const observador = new MutationObserver(() => {
      cancelAnimationFrame(quadroBusca);
      quadroBusca = requestAnimationFrame(procurar);
    });
    observador.observe(main, { childList: true, subtree: true });

    // Desligou as animações (ou saiu): o que ainda estava escondido aparece na hora.
    return () => {
      observador.disconnect();
      cancelAnimationFrame(quadroBusca);
      cancelAnimationFrame(quadroFila);
      for (const { segurar, parar } of esperando.values()) {
        parar();
        segurar.cancel();
      }
    };
  }, [ativas]);

  return null;
}
