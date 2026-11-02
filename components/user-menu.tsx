import { SincronizarPreferencias } from "@/components/sincronizar-preferencias";
import { donoDa } from "@/lib/fixados";
import { getPerfil } from "@/lib/meu/perfil";
import { lerPreferenciasDaConta } from "@/lib/meu/preferencias";
import { getSession } from "@/lib/session";

import { AccountMenu, BotaoEntrar } from "./auth-buttons";

export async function UserMenu() {
  const session = await getSession();

  if (!session) return <BotaoEntrar compacto />;

  const { name, email, image } = session.user;
  // Se o banco falhar, o menu da conta aparece do mesmo jeito; só as preferências não sincronizam agora.
  const perfil = await getPerfil(donoDa(session)).catch(() => undefined);
  return (
    <>
      <AccountMenu user={{ name, email, image }} />
      {perfil !== undefined && <SincronizarPreferencias daConta={lerPreferenciasDaConta(perfil?.preferencias)} />}
    </>
  );
}
