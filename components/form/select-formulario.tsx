"use client";

import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import type { OpcaoSelect } from "./campo-select";

/**
 * Select do shadcn para formulários simples, sem react-hook-form (Server Actions e `<form method="get">`).
 * O `name` faz o Base UI criar um input escondido, então o formulário envia o valor como faria um <select>.
 * O `placeholder` aparece enquanto nada foi escolhido e não é uma opção da lista.
 */
export function SelectFormulario({
  id,
  name,
  opcoes,
  placeholder,
  defaultValue,
  required,
  className,
}: {
  /** Liga o <label htmlFor> ao botão da lista. */
  id: string;
  name: string;
  opcoes: readonly OpcaoSelect[];
  placeholder: string;
  defaultValue?: string;
  required?: boolean;
  className?: string;
}) {
  const itens = opcoes.map(([valor, texto]) => ({ value: String(valor), label: texto }));

  return (
    <Select name={name} items={itens} defaultValue={defaultValue || null} required={required}>
      <SelectTrigger id={id} className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {itens.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
