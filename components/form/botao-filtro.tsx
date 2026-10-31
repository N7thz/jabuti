"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/**
 * Envio dos formulários de filtro. Com JavaScript o filtro já se aplica ao preencher; o botão continua para
 * quem está sem JS e para confirmar na hora (Enter). Enquanto o resultado carrega, gira o indicador.
 */
export function BotaoFiltro({
  pendente,
  children,
  className,
}: {
  pendente: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Button type="submit" size="lg" className={className}>
      {pendente && <Spinner data-icon="inline-start" role={undefined} aria-label={undefined} aria-hidden="true" />}
      {children}
    </Button>
  );
}
