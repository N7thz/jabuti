"use client";

import { domAnimation, LazyMotion, MotionConfig, useReducedMotion } from "motion/react";
import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";

import { CHAVE_ANIMACOES, lerPreferencia, type PreferenciaAnimacoes } from "@/lib/animacoes";

type ContextoAnimacoes = {
  preferencia: PreferenciaAnimacoes;
  setPreferencia: (p: PreferenciaAnimacoes) => void;
  /** Se as animações estão valendo agora (preferência + "reduzir movimento" do aparelho). */
  ativas: boolean;
};

const Contexto = createContext<ContextoAnimacoes>({ preferencia: "sistema", setPreferencia: () => {}, ativas: false });

export const useAnimacoes = () => use(Contexto);

// reducedMotion do Motion: "user" segue o aparelho, "always" corta transform e layout, "never" anima sempre.
const REDUCED_MOTION = { sistema: "user", ligadas: "never", desligadas: "always" } as const;

function aplicar(p: PreferenciaAnimacoes) {
  if (p === "sistema") delete document.documentElement.dataset.animacoes;
  else document.documentElement.dataset.animacoes = p;
}

/**
 * Liga o Motion à preferência de animações. LazyMotion com domAnimation: só os recursos de animação de DOM
 * entram no pacote (sem drag e sem o motion completo); por isso os componentes usam `m.*` e não `motion.*`.
 */
export function AnimacoesProvider({ children }: { children: React.ReactNode }) {
  // Começa em "sistema" no servidor e na hidratação; o valor salvo entra logo depois (o <html> já veio certo do script).
  const [preferencia, setEstado] = useState<PreferenciaAnimacoes>("sistema");
  const reduzNoAparelho = useReducedMotion() ?? false;

  useEffect(() => {
    const ler = () => {
      try {
        setEstado(lerPreferencia(localStorage.getItem(CHAVE_ANIMACOES)));
      } catch {}
    };
    ler();
    // Outra aba mudou a preferência: acompanha.
    const aoMudar = (e: StorageEvent) => {
      if (e.key !== CHAVE_ANIMACOES) return;
      ler();
      aplicar(lerPreferencia(e.newValue));
    };
    window.addEventListener("storage", aoMudar);
    return () => window.removeEventListener("storage", aoMudar);
  }, []);

  const setPreferencia = useCallback((p: PreferenciaAnimacoes) => {
    setEstado(p);
    aplicar(p);
    try {
      if (p === "sistema") localStorage.removeItem(CHAVE_ANIMACOES);
      else localStorage.setItem(CHAVE_ANIMACOES, p);
    } catch {}
  }, []);

  const ativas = preferencia === "ligadas" || (preferencia === "sistema" && !reduzNoAparelho);
  const valor = useMemo(() => ({ preferencia, setPreferencia, ativas }), [preferencia, setPreferencia, ativas]);

  return (
    <Contexto value={valor}>
      <MotionConfig reducedMotion={REDUCED_MOTION[preferencia]}>
        <LazyMotion features={domAnimation} strict>
          {children}
        </LazyMotion>
      </MotionConfig>
    </Contexto>
  );
}
