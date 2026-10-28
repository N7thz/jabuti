import { createLoader, createSerializer, parseAsInteger, parseAsString } from "nuqs/server";
import { z } from "zod";

import { ano, nomeAutor, opcional, pagina } from "@/lib/filtros/schemas";

export const PRIMEIRO_ANO = 2015;

/** Filtros de /orcamento. `autor` já sai como o filtro `nomeAutor` do Portal espera. */
export const filtrosOrcamento = z.object({
  ano: opcional(ano(PRIMEIRO_ANO, new Date().getFullYear())),
  autor: opcional(nomeAutor),
  pagina: opcional(pagina),
});

/** Chaves da URL compartilhável (nuqs); a validação continua no zod acima. */
const url = { ano: parseAsInteger, autor: parseAsString, pagina: parseAsInteger };
export const lerUrlOrcamento = createLoader(url);
export const linkOrcamento = createSerializer(url);
