"use client";

import { catchError, type ErrorInfo } from "next/error";

import {
  BotaoTentarDeNovo,
  CodigoDoErro,
  LinkAvisarProblema,
  useTentarAoReconectar,
} from "@/components/erro-acoes";
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
function SecaoComErro(props: Props, { error, retry }: ErrorInfo) {
  // Os hooks ficam num componente próprio: o callback do catchError não é um componente.
  return <Conteudo {...props} error={error} retry={retry} />;
}

function Conteudo({ titulo, fonte, id, error, retry }: Props & Pick<ErrorInfo, "error" | "retry">) {
  const conectado = useTentarAoReconectar(retry);
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
        {conectado ? (
          <>
            Não conseguimos carregar esta parte agora. Os dados vêm {fonte}.{" "}
            {tipo === "desconhecido" ? "A fonte pode estar fora do ar ou lenta." : motivo} O resto da página não foi
            afetado.
          </>
        ) : (
          "Esta parte não carregou porque o seu aparelho está sem internet. Ela carrega sozinha quando a conexão voltar."
        )}
      </p>
      {conectado && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {passageiro && <BotaoTentarDeNovo retry={retry} destaque={false} />}
          <LinkAvisarProblema codigo={codigo} tamanho="default" />
          {codigo && <CodigoDoErro codigo={codigo} />}
        </div>
      )}
    </section>
  );
}

export const ErroSecao = catchError(SecaoComErro);
