import "server-only";

import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

/**
 * Better Auth sem banco de dados (modo stateless): a sessão vive num cookie JWE
 * assinado com BETTER_AUTH_SECRET e é renovada automaticamente enquanto o usuário usa o app.
 * Para guardar dados por usuário (favoritos, histórico…), adicione `database` aqui.
 */
export const auth = betterAuth({
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  // Deve ser o último plugin: permite que Server Actions gravem os cookies de sessão.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
