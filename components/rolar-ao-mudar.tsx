"use client";

import { useEffect, useRef } from "react";

/**
 * Depois de trocar de página ou de filtro sem recarregar, rola suave até o início dos resultados
 * quando eles ficaram fora da tela (ex.: clicou em "Próxima" lá embaixo). Na primeira carga não faz
 * nada, e quem pede menos movimento recebe o salto direto.
 */
export function RolarAoMudar({ alvo, chave }: { alvo: string; chave: string }) {
  const anterior = useRef(chave);

  useEffect(() => {
    if (anterior.current === chave) return;
    anterior.current = chave;

    const elemento = document.getElementById(alvo);
    if (!elemento) return;
    const { top } = elemento.getBoundingClientRect();
    const margem = parseFloat(getComputedStyle(elemento).scrollMarginTop) || 0;
    if (top >= margem && top < window.innerHeight * 0.5) return;

    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    elemento.scrollIntoView({ behavior: reduzido ? "auto" : "smooth", block: "start" });
  }, [alvo, chave]);

  return null;
}
