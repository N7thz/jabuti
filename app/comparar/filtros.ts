import { createLoader, createSerializer, parseAsString } from "nuqs/server";
import { z } from "zod";

import { opcional } from "@/lib/filtros/schemas";

const chave = z.string().regex(/^(camara|senado)-\d{1,10}$/, "Escolha um parlamentar da lista.");

/** Filtros de /comparar: dois parlamentares no formato "camara-204379" / "senado-5672". */
export const filtrosComparar = z.object({ a: opcional(chave), b: opcional(chave) });

const url = { a: parseAsString, b: parseAsString };
export const lerUrlComparar = createLoader(url);
export const linkComparar = createSerializer(url);
