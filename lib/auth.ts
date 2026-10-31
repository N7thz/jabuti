import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { db } from "./db";
import { enviarEmail } from "./email";

/**
 * Login com Google ou com email e senha. Contas, sessões e tokens ficam no banco (modelos User, Session,
 * Account e Verification do prisma/schema/auth.prisma).
 *
 * O email precisa ser confirmado antes do primeiro login com senha: os fixados são ligados ao email, então
 * sem confirmação alguém poderia se cadastrar com o email de outra pessoa e ver os atalhos dela.
 * Quem entra pelo Google com o mesmo email de uma conta de senha cai na mesma conta (o Google já confirmou o email).
 */
export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    // Trocou a senha: derruba as outras sessões, caso alguém estivesse usando a senha antiga.
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await enviarEmail({
        para: user.email,
        assunto: "Jabuti: redefinir sua senha",
        texto: [
          `Olá, ${user.name}.`,
          "",
          "Recebemos um pedido para redefinir a senha da sua conta no Jabuti. Para criar uma senha nova, abra o link:",
          url,
          "",
          "O link vale por 1 hora. Se não foi você, ignore este email: sua senha continua a mesma.",
        ].join("\n"),
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    // Tentou entrar sem ter confirmado: manda o link de novo.
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await enviarEmail({
        para: user.email,
        assunto: "Jabuti: confirme seu email",
        texto: [
          `Olá, ${user.name}.`,
          "",
          "Para ativar sua conta no Jabuti, confirme seu email abrindo o link:",
          url,
          "",
          "O link vale por 1 hora. Se você não criou uma conta, ignore este email.",
        ].join("\n"),
      });
    },
  },
  account: {
    accountLinking: { enabled: true, trustedProviders: ["google"] },
  },
  user: {
    deleteUser: { enabled: true },
  },
  session: {
    // Guarda a sessão num cookie por 5 minutos para não consultar o banco a cada página.
    // JWE: o cookie vai criptografado (o email não fica legível no navegador) e um cookie inválido ou do
    // formato antigo é descartado em vez de lançar "Invalid Base64 character", como faz o "compact".
    cookieCache: { enabled: true, maxAge: 5 * 60, strategy: "jwe" },
  },
  // Deve ser o último plugin: permite que Server Actions gravem os cookies de sessão.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
