"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { CAMPOS_QUE_VOLTAM, destinoSeguro, SCHEMAS_CONTA, type FormularioConta } from "@/lib/conta/schemas";

export type EstadoConta =
  | { status: "inicial" }
  | { status: "ok"; mensagem: string }
  | {
      status: "erro";
      /** Erro geral (senha errada, link vencido…); os de cada campo vão em `erros`. */
      mensagem?: string;
      erros?: Record<string, string | undefined>;
      /** O que a pessoa digitou (menos a senha), para o formulário voltar preenchido sem JavaScript. */
      valores: Record<string, string>;
    };

/** Códigos do Better Auth traduzidos para quem está tentando entrar. */
const MENSAGENS: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Email ou senha incorretos.",
  EMAIL_NOT_VERIFIED:
    "Seu email ainda não foi confirmado. Enviamos um novo link para ele; abra o link e depois entre de novo.",
  USER_ALREADY_EXISTS: "Já existe uma conta com este email. Entre com ele ou use \"Esqueci minha senha\".",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Já existe uma conta com este email. Entre com ele ou use \"Esqueci minha senha\".",
  INVALID_TOKEN: "Este link de redefinição venceu ou já foi usado. Peça um novo.",
  PASSWORD_TOO_SHORT: "A senha precisa ter pelo menos 8 caracteres.",
  PASSWORD_TOO_LONG: "A senha pode ter no máximo 128 caracteres.",
};

function motivo(erro: unknown) {
  if (erro instanceof APIError) {
    const codigo = String((erro.body as { code?: string } | undefined)?.code ?? "");
    if (MENSAGENS[codigo]) return MENSAGENS[codigo];
    if (erro.statusCode === 429) return "Muitas tentativas seguidas. Espere um minuto e tente de novo.";
  }
  console.error("[conta] falha no login:", erro);
  return "Não conseguimos concluir agora. Tente de novo em alguns minutos.";
}

/**
 * Uma Server Action para os quatro formulários (entrar, cadastrar, recuperar e redefinir a senha).
 * Funciona com e sem JavaScript via `useActionState`; o cookie da sessão é gravado pelo plugin nextCookies.
 */
export async function acaoConta(formulario: FormularioConta, _anterior: EstadoConta, formData: FormData): Promise<EstadoConta> {
  const bruto = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const valores = Object.fromEntries(CAMPOS_QUE_VOLTAM.filter((c) => c in bruto).map((c) => [c, bruto[c]]));
  const dados = SCHEMAS_CONTA[formulario].safeParse(bruto);

  if (!dados.success) {
    const { fieldErrors } = z.flattenError(dados.error as z.ZodError<Record<string, unknown>>);
    const erros = Object.fromEntries(Object.entries(fieldErrors).map(([campo, lista]) => [campo, (lista as string[] | undefined)?.[0]]));
    return { status: "erro", erros, valores };
  }

  const cabecalhos = await headers();
  const destino = destinoSeguro(bruto.de);
  try {
    switch (formulario) {
      case "entrar": {
        const { email, senha } = SCHEMAS_CONTA.entrar.parse(bruto);
        await auth.api.signInEmail({ body: { email, password: senha, callbackURL: destino }, headers: cabecalhos });
        break;
      }
      case "cadastrar": {
        const { nome, email, senha } = SCHEMAS_CONTA.cadastrar.parse(bruto);
        await auth.api.signUpEmail({ body: { name: nome, email, password: senha, callbackURL: destino }, headers: cabecalhos });
        return {
          status: "ok",
          mensagem: `Enviamos um link de confirmação para ${email}. Abra o link para ativar a conta; ele vale por 1 hora. Se não chegar, confira a caixa de spam.`,
        };
      }
      case "recuperar": {
        const { email } = SCHEMAS_CONTA.recuperar.parse(bruto);
        await auth.api.requestPasswordReset({ body: { email, redirectTo: "/redefinir-senha" }, headers: cabecalhos });
        // Mesma resposta exista ou não a conta: assim a tela não revela quem tem cadastro.
        return {
          status: "ok",
          mensagem: `Se existir uma conta com ${email}, enviamos um link para criar uma senha nova. Ele vale por 1 hora.`,
        };
      }
      case "redefinir": {
        const { token, senha } = SCHEMAS_CONTA.redefinir.parse(bruto);
        await auth.api.resetPassword({ body: { token, newPassword: senha }, headers: cabecalhos });
        redirect("/entrar?senha=nova");
      }
    }
  } catch (erro) {
    // redirect() lança um sinal interno do Next: deixa subir.
    unstable_rethrow(erro);
    return { status: "erro", mensagem: motivo(erro), valores };
  }

  redirect(destino);
}
