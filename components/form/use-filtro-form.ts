"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useTransition } from "react";
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
 *
 * O formulário também acompanha a URL quando ela muda por fora (link do menu, chip, voltar/avançar).
 * Com `cacheComponents` o Next guarda a página escondida num `<Activity>` em vez de desmontá-la, então
 * o estado do react-hook-form sobrevive à navegação: sem essa sincronia, quem saía de
 * "/parlamentares?casa=senado" e voltava pelo menu via "Senado" no formulário com a URL e a lista sem filtro.
 * `defaultValues` vem do servidor, lido da URL atual; quando muda para uma URL que não foi este formulário que
 * pediu, o formulário volta a mostrar o que está na URL.
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

  /** URL que os valores levam, no mesmo formato das navegações deste formulário; `null` se inválidos. */
  const urlDe = (valores: unknown) => {
    const lido = schema.safeParse(valores);
    return lido.success ? link(destino, lido.data as never) : null;
  };
  // Última URL aplicada: não navega de novo para a mesma consulta (ex.: digitou e apagou a letra).
  const ultima = useRef<string | null>(null);
  // URLs pedidas por este formulário que o servidor ainda não devolveu, em ordem.
  const pedidas = useRef<string[]>([]);
  const navegar = (url: string, modo: "replace" | "push") => {
    if (url !== ultima.current) pedidas.current.push(url);
    ultima.current = url;
    startTransition(() => router[modo](url, { scroll: false }));
  };

  // Valores da URL atual, lidos pelo servidor. Comparados como texto: o objeto é novo a cada renderização.
  const daUrl = JSON.stringify(defaultValues);
  const vistos = useRef(daUrl);
  const sincronizar = useEffectEvent((valores: typeof defaultValues) => {
    const url = urlDe(valores);
    // Resposta de uma navegação deste formulário (talvez de uma letra atrás): não mexe no que a pessoa digita.
    const i = url === null ? -1 : pedidas.current.indexOf(url);
    if (i >= 0) {
      pedidas.current.splice(0, i + 1);
      return;
    }
    // A URL mudou por fora: o formulário passa a mostrar os filtros que valem de fato.
    pedidas.current = [];
    ultima.current = url;
    form.reset(valores);
  });
  useEffect(() => {
    if (daUrl === vistos.current) return;
    vistos.current = daUrl;
    sincronizar(JSON.parse(daUrl));
  }, [daUrl]);

  const filtrar = useEffectEvent((valores: unknown) => {
    const url = urlDe(valores);
    if (url === null || url === ultima.current) return;
    navegar(url, "replace");
  });
  const lembrarAtual = useEffectEvent(() => {
    ultima.current = urlDe(form.getValues());
  });
  useEffect(() => {
    if (esperar === false) return;
    lembrarAtual();

    let espera: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = form.subscribe({
      formState: { values: true },
      callback: ({ values: valores }) => {
        clearTimeout(espera);
        espera = setTimeout(() => filtrar(valores), esperar);
      },
    });
    return () => {
      unsubscribe();
      clearTimeout(espera);
    };
  }, [form, esperar]);

  const onSubmit = (evento: React.FormEvent<HTMLFormElement>) =>
    form.handleSubmit((valores) => navegar(link(destino, valores as never), "push"))(evento);

  return { form, onSubmit, acao: destino, pendente };
}
