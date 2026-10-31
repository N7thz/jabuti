"use client";

import { SearchIcon } from "lucide-react";

import { CampoTexto } from "@/components/form/campo-texto";
import { BotaoFiltro } from "@/components/form/botao-filtro";
import { useFiltroForm } from "@/components/form/use-filtro-form";

import { filtrosLeis, linkLeis } from "./filtros";

export function FiltrosForm({
  valores = {},
  erros = {},
}: {
  valores?: { etapa?: string | null; busca?: string | null };
  erros?: Record<string, string>;
}) {
  const { form, onSubmit, acao, pendente } = useFiltroForm(filtrosLeis, {
    defaultValues: { etapa: valores.etapa ?? "", busca: valores.busca ?? "" },
    acao: "/leis",
    link: linkLeis,
  });

  return (
    <form
      method="get"
      action={acao}
      onSubmit={onSubmit}
      aria-busy={pendente || undefined}
      noValidate
      role="search"
      aria-label="Buscar projetos e leis"
      className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
    >
      {/* A busca vale para a etapa aberta; sem JS o campo oculto mantém a etapa na URL. */}
      <input type="hidden" {...form.register("etapa")} />
      <CampoTexto
        form={form}
        nome="busca"
        rotulo="Buscar por assunto, número ou autor"
        ajuda="Procura no resumo do projeto (ementa), no número e no nome de quem apresentou."
        placeholder="Ex.: aposentadoria, PL 1769, Fulano"
        icone={<SearchIcon aria-hidden="true" />}
        erroServidor={erros.busca}
      />
      <BotaoFiltro pendente={pendente} className="sm:mt-7">
        Buscar
      </BotaoFiltro>
    </form>
  );
}
