"use client";

import { ServerCrashIcon, WifiOffIcon } from "lucide-react";
import { useEffect } from "react";

import { AvisoPagina } from "@/components/aviso-pagina";
import {
  BotaoTentarDeNovo,
  CodigoDoErro,
  LinkAvisarProblema,
  useTentarAoReconectar,
} from "@/components/erro-acoes";
import { codigoParaSuporte, descreverErro } from "@/lib/erros-motivos";

/**
 * Corpo dos error.tsx. `fonte` nomeia de onde a página tira os dados, para o visitante saber quem
 * pode estar fora do ar. Nunca mostra a mensagem do erro: em produção ela vem genérica e, mesmo em
 * desenvolvimento, não ajuda o público; o código (`digest`) basta para achar o erro nos logs.
 *
 * Sem internet, a tela diz isso (e não culpa a fonte) e tenta de novo sozinha quando a conexão volta.
 */
export function ErroDaPagina({ error, retry, fonte }: { error: unknown; retry: () => void; fonte?: string }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const conectado = useTentarAoReconectar(retry);
  const codigo = codigoParaSuporte(error);
  const { codigo: tipo, motivo, passageiro } = descreverErro(error);

  if (!conectado) {
    return (
      <AvisoPagina alerta icone={<WifiOffIcon aria-hidden="true" />} titulo="Você está sem internet">
        A página não carregou porque o seu aparelho perdeu a conexão. Assim que a internet voltar, ela carrega de novo
        sozinha.
      </AvisoPagina>
    );
  }

  const deOnde = fonte
    ? `Os dados desta página vêm ${fonte}, e a busca não deu certo.`
    : "Não conseguimos buscar os dados desta página nas fontes oficiais.";
  const porque =
    tipo === "desconhecido" ? "A fonte pode estar fora do ar ou lenta agora." : motivo;
  const eAgora = passageiro
    ? "Isso costuma passar em poucos minutos: tente de novo daqui a pouco."
    : "Tentar de novo agora não deve resolver. Se puder, avise a equipe para corrigirmos.";

  return (
    <AvisoPagina
      alerta
      icone={<ServerCrashIcon aria-hidden="true" />}
      titulo="Esta página não carregou"
      acoes={
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-wrap justify-center gap-2">
            {passageiro && <BotaoTentarDeNovo retry={retry} />}
            <LinkAvisarProblema codigo={codigo} destaque={!passageiro} />
          </div>
          {codigo && <CodigoDoErro codigo={codigo} />}
        </div>
      }
    >
      <span className="block">Não foi nada que você fez. {deOnde}</span>
      <span className="mt-2 block">
        {porque} {eAgora}
      </span>
    </AvisoPagina>
  );
}
