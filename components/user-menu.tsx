import { getSession } from "@/lib/session";

import { AccountMenu, SignInButton } from "./auth-buttons";

export async function UserMenu() {
  const session = await getSession();

  if (!session) return <SignInButton compacto />;

  const { name, email, image } = session.user;
  return <AccountMenu user={{ name, email, image }} />;
}
