import { createLoader, createSerializer, parseAsInteger, parseAsString } from "nuqs/server";
import { z } from "zod";

import { ano, opcional } from "@/lib/filtros/schemas";

/** Filtros de /rankings/cota. A categoria é validada contra as do banco na página. */
export const filtrosRankingCota = z.object({
  ano: opcional(ano(2008)),
  casa: opcional(z.enum(["camara", "senado"], "Escolha Câmara, Senado ou as duas.")),
  categoria: opcional(z.string().trim().max(300)),
});

const url = { ano: parseAsInteger, casa: parseAsString, categoria: parseAsString };
export const lerUrlRankingCota = createLoader(url);
export const linkRankingCota = createSerializer(url);
