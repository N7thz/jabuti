import { BellIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { contarNaoLidas } from "@/lib/seguidos";
import { getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

/**
 * Sino do cabeçalho com o número de notificações não lidas; leva para /notificacoes.
 * Só aparece para quem está logado. Lê a sessão: use dentro de `<Suspense>`.
 */
export async function SinoNotificacoes() {
  if (!(await getSession())) return null;
  const naoLidas = await contarNaoLidas();
  const rotulo = naoLidas === 0 ? "Notificações" : `Notificações, ${naoLidas} não ${naoLidas === 1 ? "lida" : "lidas"}`;

  return (
    <Link href="/notificacoes" aria-label={rotulo} title={rotulo} className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative size-10")}>
      <BellIcon aria-hidden="true" />
      {naoLidas > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] leading-4 font-bold text-primary-foreground"
        >
          {naoLidas > 99 ? "99+" : naoLidas}
        </span>
      )}
    </Link>
  );
}
