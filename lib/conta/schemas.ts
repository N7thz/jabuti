import { z } from "zod";

// Formulários do login (email e senha, ou link no email). O mesmo schema valida no navegador
// (react-hook-form) e na Server Action, então quem envia sem JavaScript recebe os mesmos erros.

const email = z
  .string()
  .trim()
  .min(1, "Informe seu email.")
  .max(200, "Use no máximo 200 caracteres.")
  .pipe(z.email("Confira o email: ele precisa ter o formato nome@exemplo.com."));

/**
 * Nome de quem se cadastra. Só letras, espaços e pontuação de nome (apóstrofo, hífen, ponto): nada de
 * link, arroba ou quebra de linha, para ninguém usar o campo para escrever recado num email.
 */
export const nome = z
  .string()
  .trim()
  .min(2, "Informe seu nome.")
  .max(80, "Use no máximo 80 caracteres.")
  .regex(/^[\p{L}\p{M}' .-]+$/u, "Use só letras no nome (pode ter espaço, hífen, ponto e apóstrofo).")
  // Ponto colado em letra ("golpe.com") é endereço de site, não abreviação de nome ("J. Souza").
  .refine((valor) => !/\.\p{L}/u.test(valor), "Depois de ponto, deixe um espaço (como em \"J. Souza\").");

/** Mesmos limites do Better Auth (lib/auth.ts): 8 a 128 caracteres. */
const senhaNova = z.string().min(8, "Use pelo menos 8 caracteres.").max(128, "Use no máximo 128 caracteres.");

const confirmarSenha = <T extends { senha: string; confirmar: string }>(dados: T) => dados.senha === dados.confirmar;
const erroConfirmar = { message: "As duas senhas não são iguais.", path: ["confirmar"] };

export const SCHEMAS_CONTA = {
  entrar: z.object({
    email,
    senha: z.string().min(1, "Informe sua senha."),
  }),
  // Sem senha: a conta nasce quando a pessoa abre o link de boas-vindas (magic link). Quem quiser senha
  // cria depois em "Esqueci minha senha".
  cadastrar: z.object({ nome, email }),
  recuperar: z.object({ email }),
  redefinir: z
    .object({
      token: z.string().min(1, "O link de redefinição está incompleto. Peça um novo."),
      senha: senhaNova,
      confirmar: z.string(),
    })
    .refine(confirmarSenha, erroConfirmar),
} as const;

export type FormularioConta = keyof typeof SCHEMAS_CONTA;
export type EntradaConta<F extends FormularioConta> = z.input<(typeof SCHEMAS_CONTA)[F]>;

/** Campos que voltam preenchidos quando a página recarrega sem JavaScript (senha nunca volta). */
export const CAMPOS_QUE_VOLTAM = ["nome", "email", "token"] as const;

/**
 * Destino depois de entrar: só caminhos internos, para o `?de=` não virar redirecionamento para outro site.
 * Não basta recusar "//": o navegador lê "/\site.com" e "/<tab>/site.com" como "//site.com". Por isso o
 * caminho é resolvido como o navegador resolveria e só passa se continuar no próprio portal.
 */
export function destinoSeguro(de: unknown): string {
  // Barra invertida e caracteres de controle (tab, quebra de linha) não aparecem em caminho legítimo.
  if (typeof de !== "string" || !de.startsWith("/") || de.length > 300 || /[\\\u0000-\u001f\u007f]/.test(de)) return "/";
  const base = "https://portal.invalid";
  try {
    const url = new URL(de, base);
    return url.origin === base ? `${url.pathname}${url.search}${url.hash}` : "/";
  } catch {
    return "/";
  }
}
