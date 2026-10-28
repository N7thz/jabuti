import { createLoader, createSerializer, parseAsInteger, parseAsString } from "nuqs/server";
import { z } from "zod";

import { opcional, pagina, uf } from "@/lib/filtros/schemas";
import { normalizarNome } from "@/lib/sync/run";

/** Filtros de /parlamentares; o mesmo schema valida o formulário e os `searchParams` no servidor. */
export const filtrosParlamentares = z.object({
  // Mesmo formato dos nomes nas APIs: maiúsculas, sem acento ("Acácio" → "ACACIO").
  nome: opcional(z.string().trim().max(80, "Use no máximo 80 letras.").transform(normalizarNome)),
  casa: opcional(z.enum(["camara", "senado"], { error: "Escolha Câmara ou Senado." })),
  uf: opcional(uf),
  // Sigla como vem das APIs ("PL", "PCdoB" → comparada em maiúsculas).
  partido: opcional(
    z
      .string()
      .trim()
      .regex(/^[\p{L}\d ]{1,20}$/u, "Escolha um partido da lista.")
      .transform((v) => v.toUpperCase()),
  ),
  /** "1": só parlamentares fixados, ou de partido/bancada fixados (precisa de login). */
  fixados: opcional(z.enum(["1"], { error: "Opção inválida." })),
});

/** Lida à parte para a paginação continuar valendo quando um filtro é inválido (a lista vem completa). */
export const paginaParlamentares = z.object({ pagina: opcional(pagina) });

export type FiltrosParlamentares = z.output<typeof filtrosParlamentares>;

/**
 * Chaves da URL compartilhável (nuqs). Texto cru de propósito: quem valida é o zod acima,
 * e o formulário precisa mostrar de volta o valor inválido junto com o erro.
 */
const url = {
  nome: parseAsString,
  casa: parseAsString,
  uf: parseAsString,
  partido: parseAsString,
  fixados: parseAsString,
  pagina: parseAsInteger,
};
export const lerUrlParlamentares = createLoader(url);
export const linkParlamentares = createSerializer(url);
