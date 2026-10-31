"use client";

import { useFormStatus } from "react-dom";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";

import { type AcaoConta, CONFIRMACOES } from "./confirmacoes";

/**
 * Botão de "Sair" ou "Excluir conta" que pede confirmação num diálogo. O botão é um link para
 * `?confirmar=<acao>`: sem JavaScript ele abre o painel de confirmação da própria página; com JavaScript
 * o clique só abre o diálogo. Confirmar envia um <form> para a Server Action com `confirmo=sim`.
 */
export function BotaoAcaoConta({ acao }: { acao: AcaoConta }) {
  const c = CONFIRMACOES[acao];

  return (
    <AlertDialog>
      <AlertDialogTrigger
        nativeButton={false}
        render={
          <a
            href={`/configuracoes?confirmar=${acao}#conta`}
            className={buttonVariants({ variant: c.variante })}
            onClick={(evento) => evento.preventDefault()}
          />
        }
      >
        <c.Icone data-icon="inline-start" aria-hidden="true" />
        {c.rotulo}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form action={c.acao} className="contents">
          <input type="hidden" name="confirmo" value="sim" />
          <AlertDialogHeader>
            <AlertDialogTitle>{c.titulo}</AlertDialogTitle>
            <AlertDialogDescription>{c.descricao}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Confirmar variante={c.variante}>{c.confirmar}</Confirmar>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Confirmar({ variante, children }: { variante: "outline" | "destructive"; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <AlertDialogAction type="submit" variant={variante === "outline" ? "default" : variante} disabled={pending} aria-busy={pending || undefined}>
      {pending ? "Aguarde…" : children}
    </AlertDialogAction>
  );
}
