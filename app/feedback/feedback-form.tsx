"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheckIcon, PaperclipIcon, SendIcon } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useId, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { CampoSelect } from "@/components/form/campo-select";
import { CampoTexto } from "@/components/form/campo-texto";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ASSUNTOS,
  emMB,
  feedbackSchema,
  LIMITE_ANEXOS,
  TIPOS_ANEXO,
  type CampoDeTexto,
  type CampoFeedback,
  type Feedback,
  type FeedbackEntrada,
} from "@/lib/feedback/schema";

import { enviarFeedbackAction, type EstadoFeedback } from "./actions";

type Valores = Partial<Record<CampoDeTexto, string>>;

/** Cada envio bem-sucedido troca a `key` e monta um formulário novo, com o estado da ação zerado. */
export function FeedbackForm({ valores = {} }: { valores?: Valores }) {
  const [rodada, setRodada] = useState(0);
  return <Formulario key={rodada} valores={valores} onNova={() => setRodada((r) => r + 1)} />;
}

function Formulario({ valores, onNova }: { valores: Valores; onNova: () => void }) {
  const [estado, acao, enviando] = useActionState<EstadoFeedback, FormData>(enviarFeedbackAction, { status: "inicial" });
  const preenchido = estado.status === "erro" ? estado.valores : valores;
  const erros = estado.status === "erro" ? (estado.erros ?? {}) : {};
  const id = useId();

  const form = useForm<FeedbackEntrada, unknown, Feedback>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      assunto: (preenchido.assunto as FeedbackEntrada["assunto"]) || "sugestao",
      nome: preenchido.nome ?? "",
      email: preenchido.email ?? "",
      mensagem: preenchido.mensagem ?? "",
      pagina: preenchido.pagina ?? "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });
  const anexos = useWatch({ control: form.control, name: "anexos" });
  const escolhidos = typeof FileList !== "undefined" && anexos instanceof FileList ? Array.from(anexos) : [];
  const erro = (campo: CampoFeedback) => form.formState.errors[campo]?.message?.toString() ?? erros[campo];

  if (estado.status === "enviado") {
    return (
      <Alert role="status">
        <CircleCheckIcon aria-hidden="true" />
        <AlertTitle className="font-semibold">Mensagem enviada. Obrigado!</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-3">
          <p>Lemos tudo o que chega. Se precisar de mais detalhes, respondemos no email que você informou.</p>
          {/* Sem JavaScript o link recarrega a página; com ele, o onNova limpa o formulário na hora. */}
          <Button variant="outline" size="sm" render={<Link href="/feedback" onClick={onNova} />}>
            Enviar outra mensagem
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form
      action={acao}
      noValidate
      aria-label="Enviar feedback"
      // Com JavaScript, valida antes no navegador e só chama a ação se estiver tudo certo.
      onSubmit={(evento) => {
        const elemento = evento.currentTarget;
        void form.handleSubmit(() => startTransition(() => acao(new FormData(elemento))))(evento);
      }}
      className="flex flex-col gap-5"
    >
      {estado.status === "erro" && estado.mensagem && (
        <Alert variant="destructive">
          <AlertTitle>{estado.mensagem}</AlertTitle>
        </Alert>
      )}

      <Field data-invalid={erro("assunto") ? true : undefined}>
        <FieldLabel htmlFor={`${id}-assunto`}>Assunto</FieldLabel>
        <CampoSelect
          form={form}
          nome="assunto"
          id={`${id}-assunto`}
          opcoes={Object.entries(ASSUNTOS)}
          invalido={Boolean(erro("assunto"))}
          descritoPor={erro("assunto") ? `${id}-assunto-erro` : undefined}
        />
        {erro("assunto") && <FieldError id={`${id}-assunto-erro`}>{erro("assunto")}</FieldError>}
      </Field>

      <Field data-invalid={erro("mensagem") ? true : undefined}>
        <FieldLabel htmlFor={`${id}-mensagem`}>Mensagem</FieldLabel>
        <Textarea
          id={`${id}-mensagem`}
          rows={6}
          className="min-h-36"
          aria-invalid={erro("mensagem") ? true : undefined}
          aria-describedby={[`${id}-mensagem-ajuda`, erro("mensagem") && `${id}-mensagem-erro`].filter(Boolean).join(" ")}
          {...form.register("mensagem")}
        />
        <FieldDescription id={`${id}-mensagem-ajuda`}>
          Conte o que pode melhorar, o que não funcionou ou que dado está errado. Se for sobre um político ou uma
          cidade, diga qual.
        </FieldDescription>
        {erro("mensagem") && <FieldError id={`${id}-mensagem-erro`}>{erro("mensagem")}</FieldError>}
      </Field>

      <Field data-invalid={erro("anexos") ? true : undefined}>
        <FieldLabel htmlFor={`${id}-anexos`}>Anexos (opcional)</FieldLabel>
        <Input
          id={`${id}-anexos`}
          type="file"
          multiple
          accept={Object.keys(TIPOS_ANEXO).join(",")}
          className="h-auto py-2"
          aria-invalid={erro("anexos") ? true : undefined}
          aria-describedby={[`${id}-anexos-ajuda`, erro("anexos") && `${id}-anexos-erro`].filter(Boolean).join(" ")}
          {...form.register("anexos")}
        />
        <FieldDescription id={`${id}-anexos-ajuda`}>
          Prints da tela ou documentos que ajudem a entender. Até {LIMITE_ANEXOS.quantidade} arquivos (
          {Object.values(TIPOS_ANEXO).join(", ")}), com até {emMB(LIMITE_ANEXOS.porArquivo)} cada e{" "}
          {emMB(LIMITE_ANEXOS.total)} no total. Para mandar vários, segure Ctrl (ou Command no Mac) ao escolher.
        </FieldDescription>
        {escolhidos.length > 0 && (
          <ul aria-label="Arquivos escolhidos" className="flex flex-col gap-1 text-sm">
            {escolhidos.map((arquivo) => (
              <li key={`${arquivo.name}-${arquivo.size}`} className="flex min-w-0 items-center gap-2">
                <PaperclipIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{arquivo.name}</span>
                <span className="shrink-0 font-mono text-muted-foreground">{emMB(arquivo.size)}</span>
              </li>
            ))}
          </ul>
        )}
        {erro("anexos") && <FieldError id={`${id}-anexos-erro`}>{erro("anexos")}</FieldError>}
      </Field>

      <div className="grid gap-5 sm:grid-cols-2 sm:items-start">
        <CampoTexto form={form} nome="nome" rotulo="Seu nome (opcional)" autoComplete="name" erroServidor={erros.nome} />
        <CampoTexto
          form={form}
          nome="email"
          rotulo="Seu email"
          ajuda="Usado só para responder a você."
          type="email"
          inputMode="email"
          autoComplete="email"
          erroServidor={erros.email}
        />
      </div>

      <input type="hidden" {...form.register("pagina")} />

      {/* Armadilha para robôs: escondida de quem enxerga e do leitor de tela; só robô preenche. */}
      <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
        <label>
          Não preencha este campo
          <input type="text" name="site" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <Button type="submit" size="lg" className="self-start" disabled={enviando}>
        <SendIcon data-icon="inline-start" aria-hidden="true" />
        {enviando ? "Enviando…" : "Enviar mensagem"}
      </Button>
    </form>
  );
}
