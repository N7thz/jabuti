"use client";

import { SearchIcon } from "lucide-react";

import { CampoTexto } from "@/components/form/campo-texto";
import { useFiltroForm } from "@/components/form/use-filtro-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { TEMAS } from "@/lib/glossario";

import { AGRUPAMENTOS, filtrosGlossario, linkGlossario } from "./filtros";

type Valores = { busca?: string | null; tema?: string | null; agrupar?: string | null };

export function FiltrosForm({ valores = {}, erros = {} }: { valores?: Valores; erros?: Record<string, string> }) {
  const { form, onSubmit, acao } = useFiltroForm(filtrosGlossario, {
    defaultValues: { busca: valores.busca ?? "", tema: valores.tema ?? "", agrupar: valores.agrupar ?? "" },
    acao: "/glossario",
    link: linkGlossario,
  });
  const erro = (campo: "tema" | "agrupar") => form.formState.errors[campo]?.message?.toString() ?? erros[campo];

  return (
    <form
      method="get"
      action={acao}
      onSubmit={onSubmit}
      noValidate
      role="search"
      aria-label="Filtrar termos do glossário"
      className="grid gap-4 sm:grid-cols-2 sm:items-start lg:grid-cols-[minmax(0,1fr)_14rem_12rem_auto]"
    >
      <CampoTexto
        form={form}
        nome="busca"
        rotulo="Buscar termo"
        ajuda="Procura no nome e no resumo; acentos não importam."
        placeholder="Ex.: empenho"
        icone={<SearchIcon aria-hidden="true" />}
        erroServidor={erros.busca}
      />
      {(
        [
          { campo: "tema", rotulo: "Tema", opcoes: [["", "Todos os temas"], ...Object.entries(TEMAS).map(([id, t]) => [id, t.titulo])] },
          { campo: "agrupar", rotulo: "Agrupar", opcoes: Object.entries(AGRUPAMENTOS) },
        ] as const
      ).map(({ campo, rotulo, opcoes }) => (
        <Field key={campo} data-invalid={erro(campo) ? true : undefined}>
          <FieldLabel htmlFor={campo}>{rotulo}</FieldLabel>
          <NativeSelect
            id={campo}
            aria-invalid={erro(campo) ? true : undefined}
            aria-describedby={erro(campo) ? `${campo}-erro` : undefined}
            {...form.register(campo)}
          >
            {opcoes.map(([valor, texto]) => (
              <NativeSelectOption key={valor} value={valor}>
                {texto}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {erro(campo) && <FieldError id={`${campo}-erro`}>{erro(campo)}</FieldError>}
        </Field>
      ))}
      <Button type="submit" size="lg" className="sm:mt-7" disabled={form.formState.isSubmitting}>
        Filtrar
      </Button>
    </form>
  );
}
