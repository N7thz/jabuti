"use client";

import { CampoSelect } from "@/components/form/campo-select";
import { BotaoFiltro } from "@/components/form/botao-filtro";
import { useFiltroForm } from "@/components/form/use-filtro-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";

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
  const { form, onSubmit, acao, pendente } = useFiltroForm(filtrosRankingCota, {
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
      aria-busy={pendente || undefined}
      noValidate
      role="search"
      aria-label="Filtrar ranking da cota"
      className="grid gap-4 md:grid-cols-[8rem_12rem_minmax(0,1fr)_auto] md:items-start"
    >
      {(
        [
          ["ano", "Ano", anos.map((a) => [String(a), String(a)] as const)],
          ["casa", "Casa", [["", "Câmara e Senado"], ["camara", "Câmara"], ["senado", "Senado"]]],
          ["categoria", "Tipo de gasto", [["", "Todos os gastos"], ...categorias.map((c) => [c, c] as const)]],
        ] as const
      ).map(([campo, rotulo, opcoes]) => (
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
      <BotaoFiltro pendente={pendente} className="md:mt-7">
        Ver ranking
      </BotaoFiltro>
    </form>
  );
}
