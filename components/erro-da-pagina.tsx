"use client";

import { RefreshCwIcon, ServerCrashIcon } from "lucide-react";
import { useEffect } from "react";

import { AvisoPagina } from "@/components/aviso-pagina";
import { Button } from "@/components/ui/button";
import { codigoParaSuporte, descreverErro } from "@/lib/erros-motivos";

/**
 * Corpo dos error.tsx. `fonte` nomeia de onde a página tira os dados, para o visitante saber quem
 * pode estar fora do ar. Nunca mostra a mensagem do erro: em produção ela vem genérica e, mesmo em
 * desenvolvimento, não ajuda o público; o código (`digest`) basta para achar o erro nos logs.
 */
export function ErroDaPagina({ error, retry, fonte }: { error: unknown; retry: () => void; fonte?: string }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const codigo = codigoParaSuporte(error);
  const { codigo: tipo, motivo, passageiro } = descreverErro(error);

  return (
    <AvisoPagina
      alerta
      icone={<ServerCrashIcon aria-hidden="true" />}
      titulo="Não conseguimos carregar esta página"
      acoes={
        <>
          <Button size="lg" onClick={() => retry()}>
            <RefreshCwIcon aria-hidden="true" />
            Tentar de novo
          </Button>
          {codigo && <p className="font-mono text-xs text-muted-foreground">Código do erro: {codigo}</p>}
        </>
      }
    >
      {tipo === "desconhecido"
        ? fonte
          ? `Os dados vêm ${fonte}, que pode estar fora do ar ou lento agora.`
          : "Uma das fontes oficiais de onde tiramos os dados pode estar fora do ar ou lenta agora."
        : `${fonte ? `Os dados vêm ${fonte}. ` : ""}${motivo}`}{" "}
      {passageiro ? "Isso costuma passar em alguns minutos. Tente de novo ou siga por outro caminho." : "Siga por outro caminho enquanto resolvemos."}
    </AvisoPagina>
  );
}
