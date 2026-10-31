import { getSession } from "@/lib/session";

import { AccountMenu, BotaoEntrar } from "./auth-buttons";

export async function UserMenu() {
  const session = await getSession();

  if (!session) return <BotaoEntrar compacto />;

  const { name, email, image } = session.user;
  return <AccountMenu user={{ name, email, image }} />;
}
