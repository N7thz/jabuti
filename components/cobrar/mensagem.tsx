"use client";

import { CheckIcon, CopyIcon, MailIcon, PhoneIcon } from "lucide-react";
import { useId, useState, useSyncExternalStore } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { linkEmail } from "@/lib/cobrar/texto";
import { cn } from "@/lib/utils";

const semAssinatura = () => () => {};

/**
 * A mensagem editável e os botões de envio. Sem JavaScript o texto e o link do email (com o texto
 * original) continuam funcionando; com JavaScript o link acompanha o que a pessoa editou e entra o "copiar".
 * O portal não envia nem guarda nada: o email sai do aplicativo da própria pessoa.
 */
export function Mensagem({
  textoInicial,
  assunto,
  email,
  telefone,
  nome,
}: {
  textoInicial: string;
  assunto: string;
  email: string | null;
  telefone: { exibir: string; href: string } | null;
  nome: string;
}) {
  const id = useId();
  const pronto = useSyncExternalStore(semAssinatura, () => true, () => false);
  const [texto, setTexto] = useState(textoInicial);
  const [aviso, setAviso] = useState("");
  const mailto = linkEmail(email, assunto, texto);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setAviso("Texto copiado. Cole no aplicativo de email ou no formulário de contato do gabinete.");
    } catch {
      setAviso("Não deu para copiar automaticamente. Selecione o texto e copie.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-md border bg-muted/40 px-3 py-2">
        <span className="font-medium">Assunto:</span> {assunto}
      </p>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-texto`} className="font-medium">
          Sua mensagem <span className="font-normal text-muted-foreground">(pode editar à vontade)</span>
        </label>
        <Textarea
          id={`${id}-texto`}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setAviso("");
          }}
          rows={14}
          aria-describedby={`${id}-dica`}
          className="min-h-80 text-base leading-relaxed"
        />
        <p id={`${id}-dica`} className="text-sm text-muted-foreground">
          Troque [seu nome] e [sua cidade e estado] pelos seus dados: mensagens assinadas costumam ter resposta.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {mailto ? (
          <a href={mailto} className={cn(buttonVariants({ size: "lg" }), "min-h-11")}>
            <MailIcon data-icon="inline-start" aria-hidden="true" />
            Abrir no email<span className="sr-only"> para {nome}</span>
          </a>
        ) : (
          <p className="text-sm text-muted-foreground">A casa não publica um email para este gabinete.</p>
        )}
        {/* Só depois de hidratar: sem JavaScript o botão não faria nada. */}
        {pronto && (
          <Button type="button" variant="outline" size="lg" className="min-h-11" onClick={copiar}>
            {aviso.startsWith("Texto copiado") ? (
              <CheckIcon data-icon="inline-start" aria-hidden="true" />
            ) : (
              <CopyIcon data-icon="inline-start" aria-hidden="true" />
            )}
            Copiar texto
          </Button>
        )}
        {telefone && (
          <a href={telefone.href} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "min-h-11")}>
            <PhoneIcon data-icon="inline-start" aria-hidden="true" />
            Ligar: {telefone.exibir}
          </a>
        )}
      </div>
      <p role="status" className="min-h-5 text-sm">
        {aviso}
      </p>
      {!pronto && (
        <p className="text-sm text-muted-foreground">
          O botão de email leva o texto como foi gerado. Se você editar, copie o texto editado e cole no email.
        </p>
      )}
    </div>
  );
}
