"use client";

import { SearchIcon } from "lucide-react";

import { CampoTexto } from "@/components/form/campo-texto";
import { useFiltroForm } from "@/components/form/use-filtro-form";
import { mascaraNome } from "@/lib/filtros/mascaras";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

import { filtrosOrcamento, linkOrcamento } from "./filtros";

export function FiltrosForm({
  anos,
  valores = {},
  erros = {},
}: {
  anos: number[];
  valores?: { ano?: number | null; autor?: string | null };
  erros?: Record<string, string>;
}) {
  const { form, onSubmit, acao } = useFiltroForm(filtrosOrcamento, {
    defaultValues: { ano: String(valores.ano ?? anos[0]), autor: valores.autor ?? "" },
    acao: "/orcamento",
    link: linkOrcamento,
  });
  const erroAno = form.formState.errors.ano?.message?.toString() ?? erros.ano;

  return (
    <form
      method="get"
      action={acao}
      onSubmit={onSubmit}
      noValidate
      role="search"
      aria-label="Filtrar emendas"
      className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-start"
    >
      <Field data-invalid={erroAno ? true : undefined}>
        <FieldLabel htmlFor="ano">Ano</FieldLabel>
        <NativeSelect
          id="ano"
          aria-invalid={erroAno ? true : undefined}
          aria-describedby={erroAno ? "ano-erro" : undefined}
          {...form.register("ano")}
        >
          {anos.map((a) => (
            <NativeSelectOption key={a} value={a}>
              {a}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {erroAno && <FieldError id="ano-erro">{erroAno}</FieldError>}
      </Field>
      <CampoTexto
        form={form}
        nome="autor"
        rotulo="Autor"
        ajuda="Nome parlamentar completo; a busca não aceita parte do nome."
        placeholder="Ex.: GENERAL GIRAO"
        mascara={mascaraNome}
        icone={<SearchIcon aria-hidden="true" />}
        erroServidor={erros.autor}
      />
      <Button type="submit" size="lg" className="sm:mt-7" disabled={form.formState.isSubmitting}>
        Buscar
      </Button>
    </form>
  );
}
