"use client";

import { useFiltroForm } from "@/components/form/use-filtro-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

import { filtrosRankingCota, linkRankingCota } from "./filtros";

export function FiltrosForm({
  anos,
  categorias,
  valores = {},
  erros = {},
}: {
  anos: number[];
  categorias: string[];
  valores?: { ano?: number | null; casa?: string | null; categoria?: string | null };
  erros?: Record<string, string>;
}) {
  const { form, onSubmit, acao } = useFiltroForm(filtrosRankingCota, {
    defaultValues: {
      ano: String(valores.ano ?? anos[0] ?? ""),
      casa: valores.casa ?? "",
      categoria: valores.categoria ?? "",
    },
    acao: "/rankings/cota",
    link: linkRankingCota,
  });
  const erro = (campo: "ano" | "casa" | "categoria") =>
    form.formState.errors[campo]?.message?.toString() ?? erros[campo];

  return (
    <form
      method="get"
      action={acao}
      onSubmit={onSubmit}
      noValidate
      role="search"
      aria-label="Filtrar ranking da cota"
      className="grid gap-4 md:grid-cols-[8rem_12rem_minmax(0,1fr)_auto] md:items-start"
    >
      {(
        [
          ["ano", "Ano", anos.map((a) => [String(a), String(a)])],
          ["casa", "Casa", [["", "Câmara e Senado"], ["camara", "Câmara"], ["senado", "Senado"]]],
          ["categoria", "Tipo de gasto", [["", "Todos os gastos"], ...categorias.map((c) => [c, c])]],
        ] as const
      ).map(([campo, rotulo, opcoes]) => (
        <Field key={campo} data-invalid={erro(campo) ? true : undefined}>
          <FieldLabel htmlFor={campo}>{rotulo}</FieldLabel>
          <NativeSelect
            id={campo}
            className="w-full"
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
      <Button type="submit" size="lg" className="md:mt-7" disabled={form.formState.isSubmitting}>
        Ver ranking
      </Button>
    </form>
  );
}
