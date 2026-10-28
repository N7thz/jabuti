"use client";

import { PinIcon, PinOffIcon } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

/** Botão do formulário de fixar: com JavaScript, fica desabilitado enquanto a ação roda. */
export function EnviarFixado({ fixado, children }: { fixado: boolean; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  const Icone = fixado ? PinOffIcon : PinIcon;

  return (
    <Button type="submit" variant={fixado ? "secondary" : "outline"} size="sm" aria-pressed={fixado} disabled={pending}>
      <Icone data-icon="inline-start" aria-hidden="true" />
      {children}
    </Button>
  );
}
