"use client";

import { SearchIcon } from "lucide-react";

import { CampoTexto } from "@/components/form/campo-texto";
import { CampoSelect } from "@/components/form/campo-select";
import { BotaoFiltro } from "@/components/form/botao-filtro";
import { useFiltroForm } from "@/components/form/use-filtro-form";
import { mascaraNome } from "@/lib/filtros/mascaras";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";

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
  const { form, onSubmit, acao, pendente } = useFiltroForm(filtrosOrcamento, {
    defaultValues: { ano: String(valores.ano ?? anos[0]), autor: valores.autor ?? "" },
    acao: "/orcamento",
    link: linkOrcamento,
    // A API só acha o nome completo: espera mais para não buscar no meio da palavra.
    esperar: 900,
  });
  const erroAno = form.formState.errors.ano?.message?.toString() ?? erros.ano;

  return (
    <form
      method="get"
      action={acao}
      onSubmit={onSubmit}
      aria-busy={pendente || undefined}
      noValidate
      role="search"
      aria-label="Filtrar emendas"
      className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-start"
    >
      <Field data-invalid={erroAno ? true : undefined}>
        <FieldLabel htmlFor="ano">Ano</FieldLabel>
        <CampoSelect
          form={form}
          nome="ano"
          id="ano"
          opcoes={anos.map((a) => [a, String(a)] as const)}
          invalido={Boolean(erroAno)}
          descritoPor={erroAno ? "ano-erro" : undefined}
        />
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
      <BotaoFiltro pendente={pendente} className="sm:mt-7">
        Buscar
      </BotaoFiltro>
    </form>
  );
}
