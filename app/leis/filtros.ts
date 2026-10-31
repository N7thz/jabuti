import { createLoader, createSerializer, parseAsInteger, parseAsString } from "nuqs/server";
import { z } from "zod";

import { opcional, pagina } from "@/lib/filtros/schemas";
import { normalizarNome } from "@/lib/sync/run";

/** Etapas do caminho de um projeto até virar lei, na ordem em que acontecem. */
export const ETAPAS = ["novos", "plenario", "decididos", "sancao", "leis"] as const;
export type Etapa = (typeof ETAPAS)[number];
export const ETAPA_PADRAO: Etapa = "leis";

/** Filtros de /leis; o mesmo schema valida o formulário e os `searchParams` no servidor. */
export const filtrosLeis = z.object({
  etapa: opcional(z.enum(ETAPAS, { error: "Escolha uma das etapas." })),
  // Comparada sem acento e em maiúsculas com a ementa, a identificação e a autoria.
  busca: opcional(
    z
      .string()
      .trim()
      .min(3, "Digite pelo menos 3 letras.")
      .max(80, "Use no máximo 80 letras.")
      .transform(normalizarNome),
  ),
});

/** Lida à parte para a paginação continuar valendo quando a busca é inválida (a lista vem completa). */
export const paginaLeis = z.object({ pagina: opcional(pagina) });

/** Chaves da URL compartilhável (nuqs). Texto cru: quem valida é o zod acima. */
const url = {
  etapa: parseAsString,
  busca: parseAsString,
  pagina: parseAsInteger,
};
export const lerUrlLeis = createLoader(url);
export const linkLeis = createSerializer(url);
