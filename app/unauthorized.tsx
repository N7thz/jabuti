import { LockIcon } from "lucide-react";

import { BotaoEntrar } from "@/components/auth-buttons";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";

export default function Unauthorized() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 items-center px-4 py-16 xs:px-6">
      <Empty className="animate-enter rounded-lg border bg-card shadow-soft">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LockIcon aria-hidden="true" />
          </EmptyMedia>
          <h1 className="text-2xl font-bold">Faça login para continuar</h1>
          <EmptyDescription>Esta ação precisa de uma conta. Entre com o Google para seguir.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <BotaoEntrar />
        </EmptyContent>
      </Empty>
    </div>
  );
}
