import { createLoader, createSerializer, parseAsInteger, parseAsString } from "nuqs/server";
import { z } from "zod";

import { ano, opcional } from "@/lib/filtros/schemas";

const chave = z.string().regex(/^(camara|senado)-\d{1,10}$/, "Escolha um parlamentar da lista.");

/** Filtros de /comparar: dois parlamentares no formato "camara-204379" / "senado-5672" e o ano (sem ano, o corrente). */
export const filtrosComparar = z.object({ a: opcional(chave), b: opcional(chave), ano: opcional(ano(2019)) });

const url = { a: parseAsString, b: parseAsString, ano: parseAsInteger };
export const lerUrlComparar = createLoader(url);
export const linkComparar = createSerializer(url);
