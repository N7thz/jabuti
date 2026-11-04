import { ehAdmin } from "@/lib/admin";
import { getSession } from "@/lib/session";

import { GrupoAdmin } from "./grupo-admin";

/**
 * Grupo "Admin" da sidebar, só para quem está em ADMIN_EMAILS com o email confirmado (lib/admin.ts).
 * Lê a sessão: fica sempre dentro de <Suspense> no layout e nunca em "use cache".
 */
export async function SidebarAdmin() {
  const sessao = await getSession();
  if (!ehAdmin(sessao)) return null;
  return <GrupoAdmin />;
}
