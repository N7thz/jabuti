import "server-only";

import { headers } from "next/headers";
import { unauthorized } from "next/navigation";

import { auth } from "./auth";

/** Sessão atual ou `null` para visitantes. O login é opcional no app. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Para ações que exigem login (Server Actions, Route Handlers, páginas):
 * devolve a sessão ou interrompe com 401 (renderiza `app/unauthorized.tsx`).
 *
 *   "use server";
 *   export async function salvarFavorito(cnpj: string) {
 *     const { user } = await requireSession();
 *     ...
 *   }
 */
export async function requireSession() {
  const session = await getSession();
  if (!session) unauthorized();
  return session;
}
