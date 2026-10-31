"use client";

import { Controller, type FieldValues, type Path, type UseFormReturn } from "react-hook-form";

import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** Opção da lista: [valor na URL, texto mostrado]. Valor "" é a opção "todos" (o campo sai da URL). */
export type OpcaoSelect = readonly [valor: string | number, texto: string];

/**
 * Lista de opções do shadcn (Select do Base UI) ligada ao react-hook-form. Fica dentro do <Field> de cada
 * formulário, que cuida do rótulo e do erro. O `name` faz o Base UI criar um input escondido, então o
 * `<form method="get">` continua enviando o valor. O Base UI usa `null` para "nada escolhido"; aqui ele
 * vira "", que é o que os schemas dos filtros esperam.
 */
export function CampoSelect<T extends FieldValues>({
  form,
  nome,
  id,
  opcoes,
  invalido,
  descritoPor,
  className,
}: {
  form: UseFormReturn<T, unknown, FieldValues>;
  nome: Path<T>;
  /** Liga o <FieldLabel htmlFor> ao botão da lista. */
  id: string;
  opcoes: readonly OpcaoSelect[];
  invalido?: boolean;
  /** id do texto de erro, para o leitor de tela ler junto com o campo. */
  descritoPor?: string;
  className?: string;
}) {
  const itens = opcoes.map(([valor, texto]) => ({ value: valor === "" ? null : String(valor), label: texto }));

  return (
    <Controller
      control={form.control}
      name={nome}
      render={({ field }) => (
        <Select
          name={field.name}
          items={itens}
          value={field.value ? String(field.value) : null}
          onValueChange={(valor) => field.onChange(valor ?? "")}
        >
          <SelectTrigger
            id={id}
            ref={field.ref}
            onBlur={field.onBlur}
            className={cn("w-full", className)}
            aria-invalid={invalido ? true : undefined}
            aria-describedby={descritoPor}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {itens.map((item) => (
                <SelectItem key={item.value ?? ""} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      )}
    />
  );
}
