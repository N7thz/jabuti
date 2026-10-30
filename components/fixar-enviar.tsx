"use client";

import { PinIcon, PinOffIcon } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

/**
 * Botão do formulário de fixar: com JavaScript, fica desabilitado enquanto a ação roda.
 * `bloqueado` = limite de fixados atingido; `descritoPor` aponta para o aviso que explica.
 */
export function EnviarFixado({
  fixado,
  bloqueado = false,
  descritoPor,
  children,
}: {
  fixado: boolean;
  bloqueado?: boolean;
  descritoPor?: string;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  const Icone = fixado ? PinOffIcon : PinIcon;

  return (
    <Button
      type="submit"
      variant={fixado ? "secondary" : "outline"}
      size="sm"
      aria-pressed={fixado}
      aria-describedby={descritoPor}
      disabled={pending || bloqueado}
    >
      <Icone data-icon="inline-start" aria-hidden="true" />
      {children}
    </Button>
  );
}
