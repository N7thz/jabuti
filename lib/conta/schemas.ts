import { z } from "zod";

// Formulários do login por email e senha. O mesmo schema valida no navegador (react-hook-form) e na
// Server Action, então quem envia sem JavaScript recebe os mesmos erros.

const email = z
  .string()
  .trim()
  .min(1, "Informe seu email.")
  .max(200, "Use no máximo 200 caracteres.")
  .pipe(z.email("Confira o email: ele precisa ter o formato nome@exemplo.com."));

/** Mesmos limites do Better Auth (lib/auth.ts): 8 a 128 caracteres. */
const senhaNova = z.string().min(8, "Use pelo menos 8 caracteres.").max(128, "Use no máximo 128 caracteres.");

const confirmarSenha = <T extends { senha: string; confirmar: string }>(dados: T) => dados.senha === dados.confirmar;
const erroConfirmar = { message: "As duas senhas não são iguais.", path: ["confirmar"] };

export const SCHEMAS_CONTA = {
  entrar: z.object({
    email,
    senha: z.string().min(1, "Informe sua senha."),
  }),
  cadastrar: z
    .object({
      nome: z.string().trim().min(2, "Informe seu nome.").max(100, "Use no máximo 100 caracteres."),
      email,
      senha: senhaNova,
      confirmar: z.string(),
    })
    .refine(confirmarSenha, erroConfirmar),
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

/** Destino depois de entrar: só caminhos internos, para o `?de=` não virar redirecionamento para outro site. */
export const destinoSeguro = (de: unknown) =>
  typeof de === "string" && de.startsWith("/") && !de.startsWith("//") ? de.slice(0, 300) : "/";
