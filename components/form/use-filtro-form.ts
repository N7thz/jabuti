"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { usePathname, useRouter } from "next/navigation";
import { useForm, type DefaultValues, type FieldValues } from "react-hook-form";
import type { z } from "zod";

/**
 * Formulário de filtro com react-hook-form + zod que continua sendo um `<form method="get">`:
 * sem JavaScript o navegador envia os campos e o servidor valida com o mesmo schema.
 * Com JavaScript a validação roda antes, o foco vai para o primeiro erro e a URL é montada
 * pelo serializer do nuqs da página, com os valores já no formato da API (ex.: CNPJ só com
 * dígitos). Campos vazios saem da URL e a paginação volta para o início.
 */
export function useFiltroForm<S extends z.ZodObject>(
  schema: S,
  {
    defaultValues,
    acao,
    link,
  }: {
    defaultValues: DefaultValues<z.input<S> & FieldValues>;
    acao?: string;
    /** Serializer do nuqs (`createSerializer`) com as chaves da URL desta página. */
    link: (base: string, valores: never) => string;
  },
) {
  const router = useRouter();
  const pathname = usePathname();
  const destino = acao ?? pathname;

  const form = useForm<z.input<S> & FieldValues, unknown, z.output<S> & FieldValues>({
    resolver: zodResolver(schema as never),
    defaultValues,
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });

  const onSubmit = form.handleSubmit((valores) => {
    router.push(link(destino, valores as never), { scroll: false });
  });

  return { form, onSubmit, acao: destino };
}
