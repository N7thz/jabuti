"use client";

import { BellIcon, BellOffIcon } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

/** Botão do formulário de seguir: com JavaScript, fica desabilitado enquanto a ação roda. */
export function EnviarSeguido({
  seguindo,
  bloqueado = false,
  descritoPor,
  children,
}: {
  seguindo: boolean;
  bloqueado?: boolean;
  descritoPor?: string;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  const Icone = seguindo ? BellOffIcon : BellIcon;

  return (
    <Button
      type="submit"
      variant={seguindo ? "secondary" : "outline"}
      size="sm"
      aria-pressed={seguindo}
      aria-describedby={descritoPor}
      disabled={pending || bloqueado}
    >
      <Icone data-icon="inline-start" aria-hidden="true" />
      {children}
    </Button>
  );
}
