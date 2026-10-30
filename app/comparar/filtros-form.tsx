"use client";

import { useFiltroForm } from "@/components/form/use-filtro-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from "@/components/ui/native-select";

import { filtrosComparar, linkComparar } from "./filtros";

export interface OpcaoParlamentar {
  chave: string;
  rotulo: string;
}

export function FiltrosForm({
  deputados,
  senadores,
  valores = {},
  erros = {},
}: {
  deputados: OpcaoParlamentar[];
  senadores: OpcaoParlamentar[];
  valores?: { a?: string | null; b?: string | null };
  erros?: Record<string, string>;
}) {
  const { form, onSubmit, acao } = useFiltroForm(filtrosComparar, {
    defaultValues: { a: valores.a ?? "", b: valores.b ?? "" },
    acao: "/comparar",
    link: linkComparar,
  });
  const erro = (campo: "a" | "b") => form.formState.errors[campo]?.message?.toString() ?? erros[campo];

  return (
    <form
      method="get"
      action={acao}
      onSubmit={onSubmit}
      noValidate
      aria-label="Escolher parlamentares para comparar"
      className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-start"
    >
      {(
        [
          ["a", "Primeiro parlamentar"],
          ["b", "Segundo parlamentar"],
        ] as const
      ).map(([campo, rotulo]) => (
        <Field key={campo} data-invalid={erro(campo) ? true : undefined}>
          <FieldLabel htmlFor={campo}>{rotulo}</FieldLabel>
          <NativeSelect
            id={campo}
            className="w-full"
            aria-invalid={erro(campo) ? true : undefined}
            aria-describedby={erro(campo) ? `${campo}-erro` : undefined}
            {...form.register(campo)}
          >
            <NativeSelectOption value="">Escolha…</NativeSelectOption>
            <NativeSelectOptGroup label="Deputados">
              {deputados.map((p) => (
                <NativeSelectOption key={p.chave} value={p.chave}>
                  {p.rotulo}
                </NativeSelectOption>
              ))}
            </NativeSelectOptGroup>
            <NativeSelectOptGroup label="Senadores">
              {senadores.map((p) => (
                <NativeSelectOption key={p.chave} value={p.chave}>
                  {p.rotulo}
                </NativeSelectOption>
              ))}
            </NativeSelectOptGroup>
          </NativeSelect>
          {erro(campo) && <FieldError id={`${campo}-erro`}>{erro(campo)}</FieldError>}
        </Field>
      ))}
      <Button type="submit" size="lg" className="md:mt-7" disabled={form.formState.isSubmitting}>
        Comparar
      </Button>
    </form>
  );
}
