"use client";

import { useId } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";

/**
 * Campo de texto ligado ao react-hook-form, com máscara opcional aplicada durante a digitação.
 * Erro e ajuda ficam ligados ao input por `aria-describedby`, e `aria-invalid` marca o erro
 * para o leitor de tela. O texto do erro é sempre visível: o estado não depende só de cor.
 */
export function CampoTexto<T extends FieldValues>({
  form,
  nome,
  rotulo,
  ajuda,
  mascara,
  icone,
  erroServidor,
  ...props
}: {
  form: UseFormReturn<T, unknown, FieldValues>;
  nome: Path<T>;
  rotulo: string;
  ajuda?: string;
  mascara?: (valor: string) => string;
  icone?: React.ReactNode;
  /** Erro vindo da leitura da URL no servidor (formulário enviado sem JavaScript). */
  erroServidor?: string;
} & Omit<React.ComponentProps<"input">, "name" | "form">) {
  const id = useId();
  const erro = form.formState.errors[nome]?.message?.toString() ?? erroServidor;
  const { onChange, ...registro } = form.register(nome);

  return (
    <Field data-invalid={erro ? true : undefined}>
      <FieldLabel htmlFor={id}>{rotulo}</FieldLabel>
      <InputGroup>
        {icone && <InputGroupAddon>{icone}</InputGroupAddon>}
        <InputGroupInput
          id={id}
          autoComplete="off"
          aria-invalid={erro ? true : undefined}
          aria-describedby={[ajuda && `${id}-ajuda`, erro && `${id}-erro`].filter(Boolean).join(" ") || undefined}
          {...props}
          {...registro}
          onChange={(evento) => {
            if (mascara) evento.target.value = mascara(evento.target.value);
            return onChange(evento);
          }}
        />
      </InputGroup>
      {ajuda && <FieldDescription id={`${id}-ajuda`}>{ajuda}</FieldDescription>}
      {erro && <FieldError id={`${id}-erro`}>{erro}</FieldError>}
    </Field>
  );
}
