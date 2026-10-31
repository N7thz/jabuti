"use client";

import { LogInIcon, LogOutIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth-client";

/**
 * Leva a /entrar (Google ou email e senha), guardando a página atual em `?de=` para voltar a ela depois.
 * `compacto`: abaixo de 640px mostra só o ícone e "Entrar".
 */
export function BotaoEntrar({ compacto = false }: { compacto?: boolean }) {
  const pathname = usePathname();
  const href = pathname === "/entrar" || pathname === "/" ? "/entrar" : `/entrar?de=${encodeURIComponent(pathname)}`;
  return (
    <Button variant="outline" render={<Link href={href} />}>
      <LogInIcon data-icon="inline-start" aria-hidden="true" />
      Entrar{!compacto && " ou criar conta"}
    </Button>
  );
}

/**
 * Entra pelo Google. `destino`: para onde voltar depois (padrão: a página atual).
 * `compacto`: abaixo de 640px mostra só "Entrar"; o nome acessível continua "Entrar com Google".
 */
export function SignInButton({
  label = "Entrar com Google",
  compacto = false,
  destino,
}: {
  label?: string;
  compacto?: boolean;
  destino?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={() =>
        startTransition(async () => {
          await authClient.signIn.social({
            provider: "google",
            callbackURL: destino ?? window.location.pathname + window.location.search,
          });
        })
      }
    >
      <LogInIcon data-icon="inline-start" aria-hidden="true" />
      {pending ? (
        "Redirecionando…"
      ) : compacto ? (
        <span>
          Entrar<span className="max-sm:sr-only"> com Google</span>
        </span>
      ) : (
        label
      )}
    </Button>
  );
}

type AccountMenuProps = {
  user: { name: string; email: string; image?: string | null };
};

export function AccountMenu({ user }: AccountMenuProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="rounded-full" aria-label={`Conta de ${user.name}`} />}
      >
        <Avatar>
          {user.image && <AvatarImage src={user.image} alt="" referrerPolicy="no-referrer" />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col">
            <span className="truncate text-foreground">{user.name}</span>
            <span className="truncate font-normal">{user.email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await authClient.signOut();
                router.refresh();
              })
            }
          >
            <LogOutIcon aria-hidden="true" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
