"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheckIcon, PlusIcon } from "lucide-react";
import { startTransition, useActionState, useEffect, useId } from "react";
import { type FieldValues, type Resolver, useForm } from "react-hook-form";

import { CampoTexto } from "@/components/form/campo-texto";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { apoiadorSchema } from "@/lib/apoio/schema-apoiador";

import { adicionarApoiador, type EstadoApoiador } from "./actions";

/**
 * Adicionar um nome ao mural. Com JavaScript valida antes no navegador; sem ele, posta direto na Server
 * Action e a página volta com os erros e o nome digitado.
 */
export function FormularioApoiador() {
  const [estado, acao, enviando] = useActionState<EstadoApoiador, FormData>(adicionarApoiador, { status: "inicial" });
  const erros = estado.status === "erro" ? estado.erros : {};
  const idAutorizado = useId();

  const form = useForm<FieldValues>({
    resolver: zodResolver(apoiadorSchema) as unknown as Resolver<FieldValues>,
    defaultValues: { nome: estado.status === "erro" ? estado.valores.nome : "", autorizado: false },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });

  // Nome salvo: limpa o formulário para o próximo.
  useEffect(() => {
    if (estado.status === "ok") form.reset({ nome: "", autorizado: false });
  }, [estado, form]);

  const erroAutorizado = form.formState.errors.autorizado?.message?.toString() ?? erros.autorizado;

  return (
    <form
      action={acao}
      noValidate
      aria-label="Adicionar apoiador ao mural"
      onSubmit={(evento) => {
        const elemento = evento.currentTarget;
        void form.handleSubmit(() => startTransition(() => acao(new FormData(elemento))))(evento);
      }}
      className="flex flex-col gap-5"
    >
      {estado.status === "ok" && (
        <Alert role="status">
          <CircleCheckIcon aria-hidden="true" />
          <AlertTitle>{estado.nome} entrou no mural.</AlertTitle>
        </Alert>
      )}

      <CampoTexto
        form={form}
        nome="nome"
        rotulo="Nome no mural"
        ajuda="Do jeito que a pessoa pediu para aparecer: nome completo, só o primeiro nome, apelido ou empresa. Até 60 caracteres."
        maxLength={60}
        autoComplete="off"
        erroServidor={erros.nome}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor={idAutorizado} className="flex min-h-11 items-center gap-3">
          <input
            id={idAutorizado}
            type="checkbox"
            value="sim"
            className="size-4"
            aria-invalid={erroAutorizado ? true : undefined}
            aria-describedby={erroAutorizado ? `${idAutorizado}-erro` : undefined}
            {...form.register("autorizado")}
          />
          A pessoa autorizou mostrar este nome em público.
        </label>
        {erroAutorizado && (
          <p id={`${idAutorizado}-erro`} role="alert" className="text-sm text-destructive">
            {erroAutorizado}
          </p>
        )}
      </div>

      <Button type="submit" className="w-fit" disabled={enviando}>
        <PlusIcon data-icon="inline-start" aria-hidden="true" />
        {enviando ? "Adicionando…" : "Adicionar ao mural"}
      </Button>
    </form>
  );
}
