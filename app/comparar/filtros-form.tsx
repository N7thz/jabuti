"use client";

import { Controller } from "react-hook-form";

import { useFiltroForm } from "@/components/form/use-filtro-form";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
} from "@/components/ui/combobox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from "@/components/ui/native-select";

import { filtrosComparar, linkComparar } from "./filtros";

export interface OpcaoParlamentar {
  chave: string;
  rotulo: string;
}

// Busca sem diferença de acento nem de maiúscula: "joao" acha "João".
const normalizar = (texto: string) => texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

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

  // O base-ui só reconhece um grupo pela chave `items`; com outro nome o filtro recebe o grupo inteiro.
  const grupos = [
    { titulo: "Deputados", items: deputados },
    { titulo: "Senadores", items: senadores },
  ];
  const porChave = new Map([...deputados, ...senadores].map((p) => [p.chave, p]));

  return (
    <form
      method="get"
      action={acao}
      onSubmit={onSubmit}
      noValidate
      aria-label="Escolher parlamentares para comparar"
      className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-start"
    >
      {/* Sem JavaScript a lista com busca não abre: some, e no lugar dela entra o <select> nativo de cada campo. */}
      <noscript>
        <style>{"[data-combobox-parlamentar]{display:none}"}</style>
      </noscript>
      {(
        [
          ["a", "Primeiro parlamentar"],
          ["b", "Segundo parlamentar"],
        ] as const
      ).map(([campo, rotulo]) => (
        <Field key={campo} data-invalid={erro(campo) ? true : undefined}>
          <FieldLabel htmlFor={campo}>{rotulo}</FieldLabel>
          {/* Vem antes da busca para o rótulo apontar para ele quando não há JavaScript. É o único campo com
              `name`: com JavaScript o envio é feito pelo onSubmit, que lê o valor do react-hook-form. */}
          <noscript>
            <NativeSelect id={campo} name={campo} defaultValue={valores[campo] ?? ""} className="w-full">
              <NativeSelectOption value="">Escolha…</NativeSelectOption>
              {grupos.map((g) => (
                <NativeSelectOptGroup key={g.titulo} label={g.titulo}>
                  {g.items.map((p) => (
                    <NativeSelectOption key={p.chave} value={p.chave}>
                      {p.rotulo}
                    </NativeSelectOption>
                  ))}
                </NativeSelectOptGroup>
              ))}
            </NativeSelect>
          </noscript>
          {/* Lista com busca: são quase 600 nomes. */}
          <div data-combobox-parlamentar>
            <Controller
              control={form.control}
              name={campo}
              render={({ field }) => (
                <Combobox
                  items={grupos}
                  value={porChave.get(String(field.value ?? "")) ?? null}
                  onValueChange={(p: OpcaoParlamentar | null) => field.onChange(p?.chave ?? "")}
                  itemToStringLabel={(p: OpcaoParlamentar) => p.rotulo}
                  itemToStringValue={(p: OpcaoParlamentar) => p.chave}
                  isItemEqualToValue={(p: OpcaoParlamentar, v: OpcaoParlamentar) => p.chave === v.chave}
                  filter={(p: OpcaoParlamentar, busca: string) => normalizar(p.rotulo).includes(normalizar(busca))}
                >
                  <ComboboxInput
                    id={campo}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    placeholder="Digite um nome…"
                    rotuloAbrir="Mostrar todos os parlamentares"
                    className="h-10 w-full bg-card"
                    aria-invalid={erro(campo) ? true : undefined}
                    aria-describedby={erro(campo) ? `${campo}-erro` : undefined}
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>Nenhum parlamentar com esse nome.</ComboboxEmpty>
                    <ComboboxList>
                      {(grupo: (typeof grupos)[number], i: number) => (
                        <ComboboxGroup key={grupo.titulo} items={grupo.items}>
                          <ComboboxLabel>{grupo.titulo}</ComboboxLabel>
                          <ComboboxCollection>
                            {(p: OpcaoParlamentar) => (
                              <ComboboxItem key={p.chave} value={p}>
                                {p.rotulo}
                              </ComboboxItem>
                            )}
                          </ComboboxCollection>
                          {i < grupos.length - 1 && <ComboboxSeparator />}
                        </ComboboxGroup>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              )}
            />
          </div>
          {erro(campo) && <FieldError id={`${campo}-erro`}>{erro(campo)}</FieldError>}
        </Field>
      ))}
      <Button type="submit" size="lg" className="md:mt-7" disabled={form.formState.isSubmitting}>
        Comparar
      </Button>
    </form>
  );
}
