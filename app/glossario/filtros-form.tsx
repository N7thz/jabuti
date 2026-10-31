"use client";

import { SearchIcon } from "lucide-react";

import { CampoTexto } from "@/components/form/campo-texto";
import { CampoSelect } from "@/components/form/campo-select";
import { BotaoFiltro } from "@/components/form/botao-filtro";
import { useFiltroForm } from "@/components/form/use-filtro-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { TEMAS } from "@/lib/glossario";

import { AGRUPAMENTOS, filtrosGlossario, linkGlossario } from "./filtros";

type Valores = { busca?: string | null; tema?: string | null; agrupar?: string | null };

export function FiltrosForm({ valores = {}, erros = {} }: { valores?: Valores; erros?: Record<string, string> }) {
  const { form, onSubmit, acao, pendente } = useFiltroForm(filtrosGlossario, {
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
      aria-busy={pendente || undefined}
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
          { campo: "tema", rotulo: "Tema", opcoes: [["", "Todos os temas"], ...Object.entries(TEMAS).map(([id, t]) => [id, t.titulo] as const)] },
          { campo: "agrupar", rotulo: "Agrupar", opcoes: Object.entries(AGRUPAMENTOS) },
        ] as const
      ).map(({ campo, rotulo, opcoes }) => (
        <Field key={campo} data-invalid={erro(campo) ? true : undefined}>
          <FieldLabel htmlFor={campo}>{rotulo}</FieldLabel>
          <CampoSelect
            form={form}
            nome={campo}
            id={campo}
            opcoes={opcoes}
            invalido={Boolean(erro(campo))}
            descritoPor={erro(campo) ? `${campo}-erro` : undefined}
          />
          {erro(campo) && <FieldError id={`${campo}-erro`}>{erro(campo)}</FieldError>}
        </Field>
      ))}
      <BotaoFiltro pendente={pendente} className="sm:mt-7">
        Filtrar
      </BotaoFiltro>
    </form>
  );
}
