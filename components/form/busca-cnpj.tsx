"use client";

import { SearchIcon } from "lucide-react";

import { CampoTexto } from "@/components/form/campo-texto";
import { useFiltroForm } from "@/components/form/use-filtro-form";
import { Button } from "@/components/ui/button";
import { buscaCnpjSchema, linkBuscaCnpj } from "@/lib/filtros/formularios";
import { mascaraCnpj } from "@/lib/filtros/mascaras";

/** Busca por CNPJ: mostra a máscara 00.000.000/0000-00 e envia só os 14 dígitos para a API. */
export function BuscaCnpj({ valor = "", erroServidor }: { valor?: string; erroServidor?: string }) {
  const { form, onSubmit } = useFiltroForm(buscaCnpjSchema, {
    defaultValues: { cnpj: mascaraCnpj(valor) },
    acao: "/",
    link: linkBuscaCnpj,
  });

  return (
    <form
      role="search"
      aria-label="Consultar empresa por CNPJ"
      method="get"
      action="/"
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-3 sm:flex-row sm:items-start"
    >
      <div className="flex-1">
        <CampoTexto
          form={form}
          nome="cnpj"
          rotulo="CNPJ da empresa"
          ajuda="Digite só os números; a pontuação aparece sozinha."
          placeholder="00.000.000/0001-91"
          inputMode="numeric"
          mascara={mascaraCnpj}
          icone={<SearchIcon aria-hidden="true" />}
          erroServidor={form.formState.isSubmitted ? undefined : erroServidor}
        />
      </div>
      <Button type="submit" size="lg" className="sm:mt-7">
        Consultar
      </Button>
    </form>
  );
}
