import type { Instrumentation } from "next";

/**
 * Registro de erros do servidor numa linha por erro, com rota, tipo de renderização e o código
 * (`digest`) que o visitante vê na tela de erro: quem receber um print com o código acha o erro no log.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const erro = err instanceof Error ? err : new Error(String(err));
  const digest = typeof err === "object" && err !== null && "digest" in err ? String(err.digest) : "-";

  console.error(
    JSON.stringify({
      nivel: "erro",
      quando: new Date().toISOString(),
      codigo: digest,
      metodo: request.method,
      caminho: request.path,
      rota: context.routePath,
      tipo: context.routeType,
      renderizacao: context.renderSource ?? null,
      erro: erro.name,
      mensagem: erro.message,
      causa: erro.cause instanceof Error ? erro.cause.message : erro.cause ? String(erro.cause) : null,
    }),
  );
};
