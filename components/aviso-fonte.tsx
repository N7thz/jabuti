import { CloudOffIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { listarFontes, type Falha } from "@/lib/erros";
import { cn } from "@/lib/utils";

const maiuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/**
 * Aviso de dado incompleto: uma ou mais fontes não responderam e o resto da página mostra só o que veio.
 * Diz o motivo de cada falha (vindo de `tentar`) e só sugere esperar quando a falha é passageira.
 * Sem nada para avisar, não renderiza. role="status" porque chega junto com o conteúdo, não interrompe.
 */
export function AvisoFonte({
  fontes,
  consequencia = "Os dados abaixo podem estar incompletos.",
  className,
}: {
  /** Falhas de `tentar`/`fontesQueFalharam`, ou só o nome da fonte, com artigo ("o TCU"). */
  fontes: (Falha | string)[];
  /** O que muda para quem lê: "A lista mostra só os deputados.", "Não dá para dizer se há sanções." */
  consequencia?: string;
  className?: string;
}) {
  if (fontes.length === 0) return null;
  const falhas = fontes.map((f) => (typeof f === "string" ? { fonte: f } : f));
  const comMotivo = falhas.filter((f): f is Falha => "motivo" in f);
  const passageiro = comMotivo.every((f) => f.passageiro);

  return (
    <Alert role="status" className={cn("border-amber-700/40 bg-amber-50 text-amber-950 dark:bg-amber-950 dark:text-amber-50", className)}>
      <CloudOffIcon aria-hidden="true" />
      <AlertTitle className="font-semibold">
        Não conseguimos consultar {listarFontes(falhas.map((f) => f.fonte))} agora
      </AlertTitle>
      <AlertDescription className="flex flex-col gap-1 text-current">
        {comMotivo.length === 1 && falhas.length === 1 ? (
          <p>{comMotivo[0].motivo}</p>
        ) : (
          comMotivo.length > 0 && (
            <ul className="list-disc pl-5">
              {comMotivo.map((f) => (
                <li key={f.fonte}>
                  {maiuscula(f.fonte)}: {f.motivo.charAt(0).toLowerCase() + f.motivo.slice(1)}
                </li>
              ))}
            </ul>
          )
        )}
        <p>
          {consequencia}
          {passageiro && " Costuma voltar em alguns minutos; recarregue a página mais tarde."}
        </p>
      </AlertDescription>
    </Alert>
  );
}
