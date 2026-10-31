"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { useForm, type DefaultValues, type FieldValues } from "react-hook-form";
import type { z } from "zod";

/** Espera depois da última tecla antes de filtrar: evita uma consulta por letra. */
const ESPERA_PADRAO = 400;

/**
 * Formulário de filtro com react-hook-form + zod que continua sendo um `<form method="get">`:
 * sem JavaScript o navegador envia os campos e o servidor valida com o mesmo schema.
 * Com JavaScript a validação roda antes, o foco vai para o primeiro erro e a URL é montada
 * pelo serializer do nuqs da página, com os valores já no formato da API (ex.: CNPJ só com
 * dígitos). Campos vazios saem da URL e a paginação volta para o início.
 *
 * Com JavaScript o resultado também acompanha o preenchimento: um tempo depois da última mudança
 * a URL é trocada (replace, para o "voltar" não passar letra por letra). Valor ainda inválido
 * (ex.: CNPJ pela metade) não filtra nem mostra erro; o erro só aparece ao enviar.
 */
export function useFiltroForm<S extends z.ZodObject>(
  schema: S,
  {
    defaultValues,
    acao,
    link,
    esperar = ESPERA_PADRAO,
  }: {
    defaultValues: DefaultValues<z.input<S> & FieldValues>;
    acao?: string;
    /** Serializer do nuqs (`createSerializer`) com as chaves da URL desta página. */
    link: (base: string, valores: never) => string;
    /** Milissegundos depois da última mudança para filtrar sozinho; `false` só filtra ao enviar. */
    esperar?: number | false;
  },
) {
  const router = useRouter();
  const pathname = usePathname();
  const destino = acao ?? pathname;
  const [pendente, startTransition] = useTransition();

  const form = useForm<z.input<S> & FieldValues, unknown, z.output<S> & FieldValues>({
    resolver: zodResolver(schema as never),
    defaultValues,
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });

  useEffect(() => {
    if (esperar === false) return;
    // Última URL aplicada: não navega de novo para a mesma consulta (ex.: digitou e apagou a letra).
    const inicial = schema.safeParse(form.getValues());
    let ultima = inicial.success ? link(destino, inicial.data as never) : null;

    let espera: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = form.subscribe({
      formState: { values: true },
      callback: ({ values: valores }) => {
        clearTimeout(espera);
        espera = setTimeout(() => {
          const lido = schema.safeParse(valores);
          if (!lido.success) return;
          const url = link(destino, lido.data as never);
          if (url === ultima) return;
          ultima = url;
          startTransition(() => router.replace(url, { scroll: false }));
        }, esperar);
      },
    });
    return () => {
      unsubscribe();
      clearTimeout(espera);
    };
  }, [form, schema, link, destino, esperar, router]);

  const onSubmit = form.handleSubmit((valores) => {
    startTransition(() => router.push(link(destino, valores as never), { scroll: false }));
  });

  return { form, onSubmit, acao: destino, pendente };
}
