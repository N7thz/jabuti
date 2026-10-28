import { z } from "zod";

import { normalizarNome } from "@/lib/sync/run";
import { UFS, type SiglaUf } from "@/lib/ufs";

import { cnpjValido, cpfValido, soDigitos } from "./mascaras";

// Campos de filtro com a validação e a normalização que cada API espera.
// O mesmo schema roda no navegador (react-hook-form) e no servidor (lendo `searchParams`),
// então o filtro funciona igual com ou sem JavaScript.

/** `searchParams` pode trazer string, lista ou nada; os campos trabalham sempre com string. */
const texto = z.preprocess((v) => (Array.isArray(v) ? v[0] : v) ?? "", z.string());

/** Só dígitos, como o Portal da Transparência pede (`cnpj=12345678000190`). */
export const cnpj = texto
  .transform(soDigitos)
  .refine((v) => v.length === 14, "O CNPJ tem 14 dígitos.")
  .refine(cnpjValido, "CNPJ inválido. Confira os números digitados.");

export const cpf = texto
  .transform(soDigitos)
  .refine((v) => v.length === 11, "O CPF tem 11 dígitos.")
  .refine(cpfValido, "CPF inválido. Confira os números digitados.");

export const cpfCnpj = texto
  .transform(soDigitos)
  .refine((v) => v.length === 11 || v.length === 14, "Digite um CPF (11 dígitos) ou CNPJ (14 dígitos).")
  .refine((v) => (v.length === 11 ? cpfValido(v) : cnpjValido(v)), "Número inválido. Confira os dígitos.");

/** Ano do orçamento entre o primeiro ano com dados e o próximo ano. */
export const ano = (min = 2014, max = new Date().getFullYear() + 1) =>
  texto
    .transform(soDigitos)
    .refine((v) => v.length === 4, "Digite o ano com 4 dígitos.")
    .transform(Number)
    .refine((v) => v >= min && v <= max, `Escolha um ano entre ${min} e ${max}.`);

export const uf = texto
  .transform((v) => v.trim().toUpperCase())
  .refine((v): v is SiglaUf => v in UFS, "Escolha um estado da lista.");

/** Código IBGE de município: 7 dígitos. */
export const ibge = texto
  .transform(soDigitos)
  .refine((v) => v.length === 7, "O código IBGE tem 7 dígitos.")
  .transform(Number);

/**
 * Nome parlamentar para o filtro `nomeAutor` do Portal, que só encontra o nome exato
 * em maiúsculas e sem acento ("General Girão" → "GENERAL GIRAO").
 */
export const nomeAutor = texto
  .transform((v) => v.trim())
  .refine((v) => v.length >= 3, "Digite pelo menos 3 letras do nome.")
  .transform(normalizarNome);

export const pagina = texto
  .transform(soDigitos)
  .transform((v) => (v ? Number(v) : 1))
  .refine((v) => v >= 1, "Página inválida.");

/** Torna um campo opcional: vazio vira `undefined` em vez de erro. */
export const opcional = <T extends z.ZodType>(campo: T) =>
  z.preprocess((v) => {
    const valor = Array.isArray(v) ? v[0] : v;
    return valor === undefined || valor === null || String(valor).trim() === "" ? undefined : valor;
  }, campo.optional());

type Params = Record<string, string | string[] | undefined>;

/**
 * Lê `searchParams` no servidor com o mesmo schema do formulário.
 * Devolve os valores válidos e os erros por campo, para mostrar a mensagem mesmo sem JavaScript.
 */
export function lerFiltros<S extends z.ZodObject>(schema: S, params: Params) {
  const resultado = schema.safeParse(params);
  if (resultado.success) return { valores: resultado.data as z.output<S>, erros: {} as Record<string, string> };

  const erros: Record<string, string> = {};
  for (const issue of resultado.error.issues) {
    const campo = String(issue.path[0] ?? "");
    erros[campo] ??= issue.message;
  }
  return { valores: null, erros };
}
