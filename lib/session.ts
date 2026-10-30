import "server-only";

import { headers } from "next/headers";
import { unauthorized } from "next/navigation";
import { connection } from "next/server";

import { auth } from "./auth";

/** Sessão atual ou `null` para visitantes. O login é opcional no app. */
export async function getSession() {
  // A sessão é de cada visita: espera a requisição antes do Better Auth rodar. Sem isso, no pré-render
  // parcial (prefetch) os headers já estão disponíveis e o `new Date()` interno dele bloqueia a rota.
  await connection();
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
