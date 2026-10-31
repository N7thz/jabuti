"use client";

import { SearchIcon } from "lucide-react";

import { CampoTexto } from "@/components/form/campo-texto";
import { CampoSelect } from "@/components/form/campo-select";
import { BotaoFiltro } from "@/components/form/botao-filtro";
import { useFiltroForm } from "@/components/form/use-filtro-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { mascaraNome } from "@/lib/filtros/mascaras";
import { UFS } from "@/lib/ufs";

import { filtrosParlamentares, linkParlamentares } from "./filtros";

type Valores = {
  nome?: string | null;
  casa?: string | null;
  uf?: string | null;
  partido?: string | null;
  fixados?: string | null;
};

export function FiltrosForm({
  valores = {},
  erros = {},
  partidos = [],
  logado = false,
}: {
  valores?: Valores;
  erros?: Record<string, string>;
  /** Siglas dos partidos com parlamentar em exercício, em ordem alfabética. */
  partidos?: string[];
  /** Mostra o filtro "Só os fixados" (os fixados são por usuário). */
  logado?: boolean;
}) {
  const { form, onSubmit, acao, pendente } = useFiltroForm(filtrosParlamentares, {
    defaultValues: {
      nome: valores.nome ?? "",
      casa: valores.casa ?? "",
      uf: valores.uf ?? "",
      partido: valores.partido ?? "",
      fixados: valores.fixados ?? "",
    },
    acao: "/parlamentares",
    link: linkParlamentares,
  });
  const erro = (campo: "casa" | "uf" | "partido" | "fixados") => form.formState.errors[campo]?.message?.toString() ?? erros[campo];

  return (
    <form
      method="get"
      action={acao}
      onSubmit={onSubmit}
      aria-busy={pendente || undefined}
      noValidate
      role="search"
      aria-label="Filtrar parlamentares"
      className="grid gap-4 sm:grid-cols-2 sm:items-start lg:grid-cols-3 xl:grid-cols-[minmax(0,1fr)_repeat(var(--selects),10rem)_auto]"
      style={{ "--selects": logado ? 4 : 3 } as React.CSSProperties}
    >
      <CampoTexto
        form={form}
        nome="nome"
        rotulo="Nome"
        ajuda="Pode ser parte do nome; acentos e minúsculas são ajustados sozinhos."
        placeholder="Ex.: MARIA"
        mascara={mascaraNome}
        icone={<SearchIcon aria-hidden="true" />}
        erroServidor={erros.nome}
      />
      {(
        [
          {
            campo: "casa",
            rotulo: "Casa",
            opcoes: [
              ["", "Câmara e Senado"],
              ["camara", "Câmara"],
              ["senado", "Senado"],
            ],
          },
          { campo: "uf", rotulo: "Estado", opcoes: [["", "Todos"], ...Object.entries(UFS)] },
          { campo: "partido", rotulo: "Partido", opcoes: [["", "Todos"], ...partidos.map((p) => [p, p] as const)] },
          ...(logado
            ? [
                {
                  campo: "fixados",
                  rotulo: "Mostrar",
                  opcoes: [
                    ["", "Todos"],
                    ["1", "Só os fixados"],
                  ],
                } as const,
              ]
            : []),
        ] as const
      ).map(({ campo, rotulo, opcoes }) => (
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
      <BotaoFiltro pendente={pendente} className="sm:mt-7">
        Filtrar
      </BotaoFiltro>
    </form>
  );
}
