import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";

import { db } from "./db";
import { enviarEmail } from "./email";

const UMA_HORA = 60 * 60;

/** Cadastro que nunca confirmou o email e já passou da validade do link: só ocupa o email de alguém. */
const CADASTRO_ABANDONADO_MS = 24 * UMA_HORA * 1000;

/**
 * Login com Google, com link no email (magic link) ou com email e senha. Contas, sessões, tokens e o
 * limite de tentativas ficam no banco (prisma/schema/auth.prisma).
 *
 * O cadastro é pelo link de boas-vindas: a conta só nasce quando a pessoa abre o link, então ela já nasce
 * com o email confirmado e ninguém cria conta com o email de outra pessoa. Quem quiser senha cria depois
 * em "Esqueci minha senha" (o Better Auth cria a senha na conta que ainda não tem).
 * Quem entra pelo Google com o mesmo email de uma conta confirmada cai na mesma conta (o Google já confirmou
 * o email).
 *
 * Os emails não repetem o nome digitado no cadastro: o nome é escrito por quem cadastra, que pode não ser o
 * dono do email, e viraria um recado de golpe dentro de um email com o nosso remetente.
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
    // Cadastro com senha desligado (inclusive pela rota /api/auth/sign-up/email): a conta nasce pelo link.
    disableSignUp: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    // Trocou a senha: derruba as outras sessões, caso alguém estivesse usando a senha antiga.
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await enviarEmail({
        para: user.email,
        assunto: "Jabuti: criar uma senha nova",
        texto: [
          "Olá.",
          "",
          "Recebemos um pedido para criar uma senha nova para a sua conta no Jabuti. Para escolher a senha, abra o link:",
          url,
          "",
          "O link vale por 1 hora. Se não foi você, ignore este email: nada muda na sua conta.",
        ].join("\n"),
      });
    },
  },
  emailVerification: {
    // Contas antigas, de antes do cadastro pelo link, que ainda não confirmaram: tentou entrar com a senha,
    // recebe o link de confirmação de novo.
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await enviarEmail({
        para: user.email,
        assunto: "Jabuti: confirme seu email",
        texto: [
          "Olá.",
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
  /**
   * Limite de tentativas nas rotas /api/auth/*, contado no banco: guardado na memória, cada instância do
   * servidor teria a sua contagem e o limite não valeria de verdade. Os formulários do portal chamam o
   * Better Auth por dentro (Server Actions), onde este limite não roda; eles têm o próprio (lib/limite.ts).
   */
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 15 * 60, max: 10 },
      "/sign-in/magic-link": { window: 10 * 60, max: 5 },
      "/request-password-reset": { window: 10 * 60, max: 5 },
      "/send-verification-email": { window: 10 * 60, max: 5 },
      "/reset-password": { window: 10 * 60, max: 10 },
    },
  },
  hooks: {
    // Quem cadastrou um email e nunca confirmou impede o dono de entrar pelo Google com ele (o Better Auth
    // não junta conta confirmada com não confirmada). Antes de cada login, esses cadastros vencidos saem.
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/social" && ctx.path !== "/sign-in/magic-link") return;
      await db.user
        .deleteMany({ where: { emailVerified: false, createdAt: { lt: new Date(Date.now() - CADASTRO_ABANDONADO_MS) } } })
        .catch((erro) => console.error("[auth] falha ao limpar cadastros não confirmados:", erro));
    }),
  },
  plugins: [
    magicLink({
      expiresIn: UMA_HORA,
      // O token fica no banco só como hash: quem lesse a tabela não conseguiria entrar na conta de ninguém.
      storeToken: "hashed",
      sendMagicLink: async ({ email, url }) => {
        const jaTemConta = await db.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true } });
        await enviarEmail(jaTemConta ? emailDeEntrada(email, url) : emailDeBoasVindas(email, url));
      },
    }),
    // Deve ser o último plugin: permite que Server Actions gravem os cookies de sessão.
    nextCookies(),
  ],
});

function emailDeBoasVindas(para: string, url: string) {
  return {
    para,
    assunto: "Boas-vindas ao Jabuti: ative sua conta",
    texto: [
      "Olá, boas-vindas ao Jabuti!",
      "",
      "Para criar sua conta e já entrar, abra o link:",
      url,
      "",
      "Com a conta você fixa políticos, partidos e bancadas para acompanhar de perto. Não precisa de senha:",
      "sempre que quiser entrar, peça um link novo. Se preferir uma senha, crie em \"Esqueci minha senha\".",
      "",
      "O link vale por 1 hora e funciona uma vez só. Se você não pediu para criar uma conta, ignore este email.",
    ].join("\n"),
  };
}

function emailDeEntrada(para: string, url: string) {
  return {
    para,
    assunto: "Jabuti: seu link para entrar",
    texto: [
      "Olá.",
      "",
      "Você já tem conta no Jabuti com este email. Para entrar, abra o link:",
      url,
      "",
      "O link vale por 1 hora e funciona uma vez só. Se não foi você, ignore este email: ninguém entra sem ele.",
    ].join("\n"),
  };
}

export type Session = typeof auth.$Infer.Session;
