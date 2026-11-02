"use client";

import { ArrowLeftIcon, ArrowRightIcon, CodeIcon, ExternalLinkIcon, HeartHandshakeIcon, QrCodeIcon } from "lucide-react";
import Link from "next/link";
import { createContext, useCallback, useContext, useState } from "react";

import { PainelPix } from "@/components/apoio/painel-pix";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ApoioPublico } from "@/lib/apoio/config";
import { cn } from "@/lib/utils";

type Tela = "inicio" | "pix";

type Abrir = (e: React.MouseEvent<HTMLAnchorElement>) => void;

const ApoioContexto = createContext<Abrir | null>(null);

/**
 * Handler para o onClick de um link para /apoie: abre o dialog "Apoie o Jabuti" em vez de navegar.
 * Sem JavaScript, fora do provider, ou com Ctrl/Cmd/Shift+clique, o link segue para a página.
 */
export function useAbrirApoio(): Abrir {
  return useContext(ApoioContexto) ?? (() => {});
}

/**
 * Dono do dialog "Apoie o Jabuti", montado no layout fora da sidebar: no celular a sidebar fecha ao
 * abrir o dialog, e um dialog dentro dela sumiria junto.
 */
export function ApoioProvider({ apoio, children }: { apoio: ApoioPublico; children: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const [tela, setTela] = useState<Tela>("inicio");

  const abrir = useCallback<Abrir>((e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    setTela("inicio");
    setAberto(true);
  }, []);

  return (
    <ApoioContexto value={abrir}>
      {children}
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
          {tela === "inicio" ? <Inicio apoio={apoio} irParaPix={() => setTela("pix")} fechar={() => setAberto(false)} /> : null}
          {tela === "pix" && apoio.pix ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Doar por Pix</DialogTitle>
                <DialogDescription>
                  Qualquer valor ajuda. O dinheiro vai direto para a conta de {apoio.pix.nome}, sem intermediário.
                </DialogDescription>
              </DialogHeader>
              <PainelPix pix={apoio.pix} />
              <Button type="button" variant="ghost" className="w-fit" onClick={() => setTela("inicio")}>
                <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
                Outras formas de apoiar
              </Button>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </ApoioContexto>
  );
}

function Inicio({ apoio, irParaPix, fechar }: { apoio: ApoioPublico; irParaPix: () => void; fechar: () => void }) {
  const financeiro = apoio.pix !== null || apoio.links.length > 0;
  const opcao = "flex min-h-11 w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-accent outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <>
      <DialogHeader>
        <div className="flex size-11 items-center justify-center rounded-full bg-secao-suave text-secao" aria-hidden="true">
          <HeartHandshakeIcon />
        </div>
        <DialogTitle className="text-xl font-bold">Apoie o Jabuti</DialogTitle>
        <DialogDescription>
          O portal é gratuito, sem anúncios e de código aberto. Doações pagam o servidor, o banco de dados e o domínio, e
          dão tempo para trazer mais dados públicos.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-2">
        {apoio.pix && (
          <button type="button" className={opcao} onClick={irParaPix}>
            <QrCodeIcon aria-hidden="true" className="size-5 shrink-0 text-secao" />
            <span className="flex flex-1 flex-col">
              <span className="font-semibold">Doar por Pix</span>
              <span className="text-sm text-muted-foreground">QR Code ou copia e cola, no valor que você quiser</span>
            </span>
            <ArrowRightIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          </button>
        )}
        {apoio.links.map((l) => (
          <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className={opcao}>
            <HeartHandshakeIcon aria-hidden="true" className="size-5 shrink-0 text-secao" />
            <span className="flex flex-1 flex-col">
              <span className="font-semibold">
                {l.nome}
                <span className="sr-only"> (abre em nova aba)</span>
              </span>
              <span className="text-sm text-muted-foreground">{l.descricao}</span>
            </span>
            <ExternalLinkIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          </a>
        ))}
        {!financeiro && (
          <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
            As doações em dinheiro ainda não estão abertas. Enquanto isso, dá para ajudar de outros jeitos:
          </p>
        )}
        <a href={apoio.repositorio} target="_blank" rel="noreferrer" className={opcao}>
          <CodeIcon aria-hidden="true" className="size-5 shrink-0 text-secao" />
          <span className="flex flex-1 flex-col">
            <span className="font-semibold">
              Contribuir no GitHub
              <span className="sr-only"> (abre em nova aba)</span>
            </span>
            <span className="text-sm text-muted-foreground">Código, textos do glossário, testes de acessibilidade</span>
          </span>
          <ExternalLinkIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        </a>
      </div>

      <Link href="/apoie" onClick={fechar} className={cn(buttonVariants({ variant: "link" }), "w-fit px-0")}>
        Para onde vai o dinheiro e outras formas de ajudar
        <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
      </Link>
    </>
  );
}
