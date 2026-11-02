"use client";

import { CheckIcon, CopyIcon, MessageSquareWarningIcon, RefreshCwIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/*
 * Peças comuns às telas de erro (página inteira e seção): saber se a pessoa está sem internet, tentar
 * de novo mostrando que algo está acontecendo, avisar a equipe já com o código e copiar o código.
 */

const assinarConexao = (avisar: () => void) => {
  window.addEventListener("online", avisar);
  window.addEventListener("offline", avisar);
  return () => {
    window.removeEventListener("online", avisar);
    window.removeEventListener("offline", avisar);
  };
};

/** `false` quando o navegador sabe que está sem internet. No servidor, supõe conectado. */
export function useConectado() {
  return useSyncExternalStore(
    assinarConexao,
    () => navigator.onLine,
    () => true,
  );
}

/** Quando a internet volta, tenta de novo sozinho: a pessoa não precisa ficar de olho na tela. */
export function useTentarAoReconectar(retry: () => void) {
  // O evento "online" só dispara quando a conexão volta depois de cair.
  useEffect(() => {
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [retry]);
  return useConectado();
}

/** "Tentar de novo" que mostra "Tentando…" enquanto a página busca os dados outra vez. */
export function BotaoTentarDeNovo({
  retry,
  destaque = true,
}: {
  retry: () => void;
  /** Botão principal (cheio, grande) ou secundário (contorno). */
  destaque?: boolean;
}) {
  const [tentando, iniciar] = useTransition();
  return (
    <Button
      size={destaque ? "lg" : "default"}
      variant={destaque ? "default" : "outline"}
      disabled={tentando}
      aria-busy={tentando || undefined}
      onClick={() => iniciar(() => retry())}
    >
      {tentando ? <Spinner aria-hidden="true" /> : <RefreshCwIcon aria-hidden="true" />}
      {tentando ? "Tentando…" : "Tentar de novo"}
    </Button>
  );
}

/** Link para "Sugestões e problemas" já com a página e o código do erro preenchidos. */
export function LinkAvisarProblema({
  codigo,
  destaque = false,
  tamanho = "lg",
  className,
}: {
  codigo: string | null;
  /** Ação principal da tela (quando tentar de novo não adianta). */
  destaque?: boolean;
  tamanho?: "lg" | "default";
  className?: string;
}) {
  const pagina = usePathname();
  const busca = new URLSearchParams({ de: pagina });
  if (codigo) busca.set("erro", codigo);
  return (
    // Link com o visual do Button (buttonVariants): o Button do base-ui poria role="button" num link.
    <Link
      href={`/feedback?${busca}`}
      className={cn(buttonVariants({ variant: destaque ? "default" : "ghost", size: tamanho }), className)}
    >
      <MessageSquareWarningIcon aria-hidden="true" />
      Avisar a equipe
    </Link>
  );
}

/** Código do erro com botão de copiar: é o que a equipe usa para achar a falha no registro do servidor. */
export function CodigoDoErro({ codigo }: { codigo: string }) {
  const [copiado, setCopiado] = useState(false);
  useEffect(() => {
    if (!copiado) return;
    const t = setTimeout(() => setCopiado(false), 2000);
    return () => clearTimeout(t);
  }, [copiado]);

  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      Código do erro: <code className="font-mono">{codigo}</code>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={copiado ? "Código copiado" : "Copiar código do erro"}
        onClick={() =>
          navigator.clipboard?.writeText(codigo).then(
            () => setCopiado(true),
            () => {},
          )
        }
      >
        {copiado ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
      </Button>
      <span aria-live="polite" className="sr-only">
        {copiado ? "Código copiado" : ""}
      </span>
    </span>
  );
}
