"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

import { useAnimacoes } from "@/components/animacoes-provider";
import { lerLeitura, salvarLeitura } from "@/lib/acessibilidade";
import { CHAVE_ANIMACOES, lerPreferencia } from "@/lib/animacoes";
import { salvarPreferencias } from "@/lib/meu/actions";
import { assinatura, type Preferencias } from "@/lib/meu/preferencias";
import { EVENTO_MENU, menuSalvo, salvarMenu } from "@/lib/menu";

/** Última versão combinada com a conta neste aparelho: diz quem mudou desde então (este aparelho ou outro). */
const CHAVE_SINCRONIZADO = "jabuti-preferencias-sincronizadas";

const ler = (chave: string) => {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
};

function lerAparelho(): Preferencias {
  const tema = ler("theme");
  return {
    menu: menuSalvo(),
    texto: lerLeitura("texto", ler("jabuti-texto")),
    espacamento: lerLeitura("espacamento", ler("jabuti-espacamento")),
    tema: tema === "light" || tema === "dark" ? tema : "system",
    animacoes: lerPreferencia(ler(CHAVE_ANIMACOES)),
  };
}

/**
 * Para quem está logado: as preferências do site (menu, texto, espaçamento, tema e animações) valem em
 * todos os aparelhos. Mudou aqui → vai para a conta; mudou em outro aparelho → chega aqui ao abrir o site.
 * Não desenha nada.
 */
export function SincronizarPreferencias({ daConta }: { daConta: Preferencias | null }) {
  const { setTheme } = useTheme();
  const { setPreferencia } = useAnimacoes();
  const enviando = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: só na montagem; depois disso quem manda é o aparelho.
  useEffect(() => {
    const marcar = (p: Preferencias) => {
      try {
        localStorage.setItem(CHAVE_SINCRONIZADO, assinatura(p));
      } catch {}
    };

    const aplicar = (p: Preferencias) => {
      salvarMenu(p.menu);
      salvarLeitura("texto", p.texto);
      salvarLeitura("espacamento", p.espacamento);
      setTheme(p.tema);
      setPreferencia(p.animacoes);
    };

    const enviar = async () => {
      const agora = lerAparelho();
      if (enviando.current || assinatura(agora) === ler(CHAVE_SINCRONIZADO)) return;
      enviando.current = true;
      try {
        const r = await salvarPreferencias(agora);
        if (r.ok) marcar(agora);
      } catch {
        // Sem rede: tenta de novo na próxima mudança ou ao voltar para a aba.
      } finally {
        enviando.current = false;
      }
    };

    // Ao abrir: se este aparelho mudou algo desde a última sincronização, ele manda; senão, a conta manda.
    const aparelho = lerAparelho();
    const mudouAqui = ler(CHAVE_SINCRONIZADO) !== null && assinatura(aparelho) !== ler(CHAVE_SINCRONIZADO);
    if (daConta && !mudouAqui && assinatura(daConta) !== assinatura(aparelho)) {
      aplicar(daConta);
      marcar(daConta);
    } else if (!daConta || mudouAqui) {
      void enviar();
    } else {
      marcar(aparelho);
    }

    // As preferências de leitura, tema e animações não avisam quando mudam: confere de tempos em tempos
    // (só lê o localStorage) e ao sair da aba.
    const intervalo = window.setInterval(enviar, 5000);
    const aoEsconder = () => document.visibilityState === "hidden" && void enviar();
    window.addEventListener(EVENTO_MENU, enviar);
    document.addEventListener("visibilitychange", aoEsconder);
    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener(EVENTO_MENU, enviar);
      document.removeEventListener("visibilitychange", aoEsconder);
    };
  }, []);

  return null;
}
