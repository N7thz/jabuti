import { createLoader, createSerializer, parseAsInteger, parseAsString } from "nuqs/server";
import { z } from "zod";

import { opcional, pagina } from "@/lib/filtros/schemas";
import { GLOSSARIO, TEMAS, type Tema } from "@/lib/glossario";

const IDS = new Set<string>(GLOSSARIO.map((v) => v.id));

export const AGRUPAMENTOS = { tema: "Por tema", alfabetica: "Ordem alfabética" } as const;

/** Filtros de /glossario; o mesmo schema valida o formulário e os `searchParams` no servidor. */
export const filtrosGlossario = z.object({
  busca: opcional(z.string().trim().max(60, "Use no máximo 60 letras.")),
  tema: opcional(
    z.enum(Object.keys(TEMAS) as [Tema, ...Tema[]], { error: "Escolha um dos temas da lista." }),
  ),
  agrupar: opcional(z.enum(["tema", "alfabetica"], { error: "Escolha por tema ou em ordem alfabética." })),
});

/**
 * Lidos à parte: a página e o termo procurado continuam valendo mesmo com um filtro inválido.
 * `termo` vem dos links do portal (/glossario?termo=empenho#empenho) e abre na página que o contém.
 */
export const navegacaoGlossario = z.object({
  pagina: opcional(pagina),
  termo: opcional(z.string().refine((id) => IDS.has(id))).catch(undefined),
});

/** Chaves da URL compartilhável (nuqs). Texto cru: quem valida é o zod acima. */
const url = {
  busca: parseAsString,
  tema: parseAsString,
  agrupar: parseAsString,
  termo: parseAsString,
  pagina: parseAsInteger,
};
export const lerUrlGlossario = createLoader(url);
export const linkGlossario = createSerializer(url);
