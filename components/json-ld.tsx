import { type JsonLd as Dados, serializarJsonLd } from "@/lib/seo/json-ld";

/** Dados estruturados da página para buscadores. Não aparece na tela nem para leitores de tela. */
export function JsonLd({ dados }: { dados: Dados | Dados[] }) {
  return (
    // JSON serializado com o "<" escapado (serializarJsonLd): um "</script>" nos dados não fecha a tag.
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializarJsonLd(dados) }}
    />
  );
}
