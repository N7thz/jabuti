"use client";

import { z } from "zod";

import { CampoSelect } from "@/components/form/campo-select";
import { useFiltroForm } from "@/components/form/use-filtro-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { linkAno } from "@/lib/filtros/formularios";
import { ano as campoAno } from "@/lib/filtros/schemas";

/**
 * Filtro de ano das emendas. Continua um `<form method="get">` (funciona sem JavaScript) e,
 * com JavaScript, valida o ano com zod antes de navegar. O ano fica na URL, dá para compartilhar.
 */
export function SeletorAno({ anos, ano, acao }: { anos: number[]; ano: number; acao: string }) {
  const schema = z.object({ ano: campoAno(Math.min(...anos), Math.max(...anos)) });
  const { form, onSubmit } = useFiltroForm(schema, { defaultValues: { ano: String(ano) }, acao, link: linkAno });
  const erro = form.formState.errors.ano?.message?.toString();

  return (
    <form method="get" action={acao} onSubmit={onSubmit} noValidate className="flex flex-wrap items-end gap-2">
      <Field data-invalid={erro ? true : undefined} className="w-auto">
        <FieldLabel htmlFor="ano">Ano do orçamento</FieldLabel>
        <CampoSelect
          form={form}
          nome="ano"
          id="ano"
          className="w-32"
          opcoes={anos.map((a) => [a, String(a)] as const)}
          invalido={Boolean(erro)}
          descritoPor={erro ? "ano-erro" : undefined}
        />
        {erro && <FieldError id="ano-erro">{erro}</FieldError>}
      </Field>
      <Button type="submit" variant="outline" className="h-10" disabled={form.formState.isSubmitting}>
        Ver ano
      </Button>
    </form>
  );
}
