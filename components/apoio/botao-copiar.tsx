"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

const semAssinatura = () => () => {};

/**
 * Copia `texto` para a área de transferência e confirma em voz alta para o leitor de tela.
 * Sem JavaScript não aparece: quem está sem ele seleciona o texto à mão.
 */
export function BotaoCopiar({
  texto,
  rotulo,
  confirmacao,
  variant = "default",
  className,
}: {
  texto: string;
  rotulo: string;
  /** O que o leitor de tela anuncia depois de copiar. */
  confirmacao: string;
  variant?: "default" | "outline" | "secondary";
  className?: string;
}) {
  const pronto = useSyncExternalStore(semAssinatura, () => true, () => false);
  const [copiado, setCopiado] = useState(false);
  const [falhou, setFalhou] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setFalhou(false);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    } catch {
      setFalhou(true);
    }
  }

  if (!pronto) return null;

  return (
    <>
      <Button type="button" variant={variant} onClick={copiar} className={className}>
        {copiado ? <CheckIcon data-icon="inline-start" aria-hidden="true" /> : <CopyIcon data-icon="inline-start" aria-hidden="true" />}
        {copiado ? "Copiado" : rotulo}
      </Button>
      <span role="status" className="sr-only">
        {copiado ? confirmacao : falhou ? "Não deu para copiar. Selecione o texto e copie à mão." : ""}
      </span>
      {falhou && <p className="text-sm text-destructive">Não deu para copiar. Selecione o código e copie à mão.</p>}
    </>
  );
}
