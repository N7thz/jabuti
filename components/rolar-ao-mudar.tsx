"use client";

import { useEffect, useRef } from "react";

/**
 * Depois de trocar de página ou de filtro sem recarregar, rola suave até o início dos resultados
 * quando eles ficaram fora da tela (ex.: clicou em "Próxima" lá embaixo). Na primeira carga não faz
 * nada, e com animações desligadas (ou menos movimento) o salto é direto.
 */
export function RolarAoMudar({ alvo, chave }: { alvo: string; chave: string }) {
  const anterior = useRef(chave);

  useEffect(() => {
    if (anterior.current === chave) return;
    anterior.current = chave;

    // Filtro aplicado enquanto a pessoa digita: não tira o campo de baixo dela.
    if (document.activeElement?.closest("form[role=search] input")) return;

    const elemento = document.getElementById(alvo);
    if (!elemento) return;
    const { top } = elemento.getBoundingClientRect();
    const margem = parseFloat(getComputedStyle(elemento).scrollMarginTop) || 0;
    if (top >= margem && top < window.innerHeight * 0.5) return;

    // Sem behavior: vale o scroll-behavior do <html>, que já segue a preferência de animações.
    elemento.scrollIntoView({ block: "start" });
  }, [alvo, chave]);

  return null;
}
