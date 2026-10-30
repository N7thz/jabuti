"use client";

import { CheckIcon, CopyIcon, Share2Icon } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const semAssinatura = () => () => {};

export function CompartilharBotoes({ texto, url }: { texto: string; url: string }) {
  const mensagem = `${texto} ${url}`;
  // No servidor (e na hidratação) fica `false`: não há navigator, e o HTML inicial tem que bater.
  const pronto = useSyncExternalStore(semAssinatura, () => true, () => false);
  const nativo = useSyncExternalStore(semAssinatura, () => typeof navigator.share === "function", () => false);
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(mensagem);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    } catch {
      setCopiado(false);
    }
  }

  const link = cn(buttonVariants({ variant: "outline", size: "sm" }));

  return (
    <div role="group" aria-label="Compartilhar" className="flex flex-wrap items-center gap-2">
      {nativo && (
        <Button size="sm" onClick={() => navigator.share({ text: texto, url }).catch(() => {})}>
          <Share2Icon data-icon="inline-start" aria-hidden="true" />
          Compartilhar
        </Button>
      )}
      <a className={link} href={`https://wa.me/?text=${encodeURIComponent(mensagem)}`} target="_blank" rel="noreferrer">
        WhatsApp<span className="sr-only"> (abre em nova aba)</span>
      </a>
      <a
        className={link}
        href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(texto)}`}
        target="_blank"
        rel="noreferrer"
      >
        Telegram<span className="sr-only"> (abre em nova aba)</span>
      </a>
      <a
        className={link}
        href={`https://bsky.app/intent/compose?text=${encodeURIComponent(mensagem)}`}
        target="_blank"
        rel="noreferrer"
      >
        Bluesky<span className="sr-only"> (abre em nova aba)</span>
      </a>
      {/* Só depois de hidratar: sem JavaScript o botão não faria nada. */}
      {pronto && (
        <Button size="sm" variant="ghost" onClick={copiar}>
          {copiado ? <CheckIcon data-icon="inline-start" aria-hidden="true" /> : <CopyIcon data-icon="inline-start" aria-hidden="true" />}
          {copiado ? "Copiado" : "Copiar texto e link"}
        </Button>
      )}
      <span role="status" className="sr-only">
        {copiado ? "Texto e link copiados" : ""}
      </span>
    </div>
  );
}
