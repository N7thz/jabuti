import { CloudOffIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { listarFontes } from "@/lib/erros";
import { cn } from "@/lib/utils";

/**
 * Aviso de dado incompleto: uma ou mais fontes não responderam e o resto da página mostra só o que veio.
 * Sem nada para avisar, não renderiza. role="status" porque chega junto com o conteúdo, não interrompe.
 */
export function AvisoFonte({
  fontes,
  consequencia = "Os dados abaixo podem estar incompletos.",
  className,
}: {
  /** Já com artigo ("o TCU", "a Câmara dos Deputados"). */
  fontes: string[];
  /** O que muda para quem lê: "A lista mostra só os deputados.", "Não dá para dizer se há sanções." */
  consequencia?: string;
  className?: string;
}) {
  if (fontes.length === 0) return null;
  return (
    <Alert role="status" className={cn("border-amber-700/40 bg-amber-50 text-amber-950 dark:bg-amber-950 dark:text-amber-50", className)}>
      <CloudOffIcon aria-hidden="true" />
      <AlertTitle className="font-semibold">Não conseguimos consultar {listarFontes(fontes)} agora</AlertTitle>
      <AlertDescription className="text-current">
        {consequencia} Costuma voltar em alguns minutos; recarregue a página mais tarde.
      </AlertDescription>
    </Alert>
  );
}
