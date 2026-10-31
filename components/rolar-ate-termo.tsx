"use client";

import { useEffect } from "react";

/**
 * Leva até o verbete destacado no glossário. Na navegação do Next o verbete chega por streaming, depois de o
 * navegador já ter tentado ir até o #id, então a rolagem acontece quando ele aparece. O foco vai junto para
 * o leitor de tela começar dali; quem pede menos movimento recebe o salto direto.
 */
export function RolarAteTermo({ id }: { id: string }) {
  useEffect(() => {
    const verbete = document.getElementById(id);
    if (!verbete) return;
    const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    verbete.scrollIntoView({ block: "start", behavior: suave ? "smooth" : "auto" });
    verbete.focus({ preventScroll: true });
  }, [id]);

  return null;
}
