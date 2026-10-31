"use client";

import { RefreshCwIcon } from "lucide-react";
import { catchError, type ErrorInfo } from "next/error";

import { Button } from "@/components/ui/button";
import { codigoParaSuporte, descreverErro } from "@/lib/erros-motivos";

interface Props {
  /** Nome da seção, mostrado como título no lugar dela. */
  titulo: string;
  /** De onde a seção tira os dados, com artigo ("do TCU", "da API do Senado"). */
  fonte: string;
  /** Âncora da seção, para a navegação do perfil continuar chegando nela. */
  id?: string;
}

/**
 * O que aparece no lugar de uma seção que falhou. O resto da página continua: um portal com oito
 * fontes não pode sumir inteiro porque uma delas está fora do ar. "Tentar de novo" busca só esta parte.
 */
function SecaoComErro({ titulo, fonte, id }: Props, { error, retry }: ErrorInfo) {
  const codigo = codigoParaSuporte(error);
  const { codigo: tipo, motivo, passageiro } = descreverErro(error);

  return (
    <section
      id={id}
      aria-label={titulo}
      className="flex scroll-mt-24 flex-col gap-3 rounded-lg border border-dashed bg-card p-6"
    >
      <h2 className="text-xl font-bold">{titulo}</h2>
      <p className="max-w-[65ch] text-muted-foreground">
        Não conseguimos carregar esta parte agora. Os dados vêm {fonte}.{" "}
        {tipo === "desconhecido" ? "A fonte pode estar fora do ar ou lenta." : motivo} O resto da página não foi afetado.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {passageiro && (
          <Button variant="outline" onClick={() => retry()}>
            <RefreshCwIcon data-icon="inline-start" aria-hidden="true" />
            Tentar de novo
          </Button>
        )}
        {codigo && <span className="font-mono text-xs text-muted-foreground">Código do erro: {codigo}</span>}
      </div>
    </section>
  );
}

export const ErroSecao = catchError(SecaoComErro);
