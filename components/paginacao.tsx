import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface PaginacaoProps {
  pagina: number;
  /** Link de cada página, com os filtros atuais preservados. */
  href: (pagina: number) => string;
  /** Total de páginas, quando conhecido. */
  total?: number;
  /** Sem `total` (a API não informa), diz se existe próxima página. */
  temProxima?: boolean;
  /** `false` mantém a rolagem ao trocar de página (quem rola é a própria página, ex.: RolarAoMudar). */
  scroll?: boolean;
}

/** Páginas visíveis: a primeira, a última e as vizinhas da atual; `null` marca o salto. */
export function paginasVisiveis(pagina: number, total: number) {
  const paginas: (number | null)[] = [];
  for (let p = 1; p <= total; p++) {
    if (p === 1 || p === total || Math.abs(p - pagina) <= 1) paginas.push(p);
    else if (paginas.at(-1) !== null) paginas.push(null);
  }
  return paginas;
}

export function Paginacao({ pagina, href, total, temProxima, scroll }: PaginacaoProps) {
  const proxima = total ? pagina < total : temProxima;
  // Sem total conhecido, mostra até a página atual (+1 se houver próxima).
  const paginas = paginasVisiveis(pagina, total ?? (proxima ? pagina + 1 : pagina));

  if (pagina === 1 && !proxima) return null;

  return (
    <Pagination>
      <PaginationContent className="flex-wrap justify-center">
        {pagina > 1 && (
          <PaginationItem>
            <PaginationPrevious href={href(pagina - 1)} scroll={scroll} />
          </PaginationItem>
        )}
        {paginas.map((p, i) =>
          p === null ? (
            <PaginationItem key={`salto-${i}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={p}>
              <PaginationLink href={href(p)} scroll={scroll} isActive={p === pagina} aria-label={`Página ${p}`}>
                {p}
              </PaginationLink>
            </PaginationItem>
          ),
        )}
        {proxima && (
          <PaginationItem>
            <PaginationNext href={href(pagina + 1)} scroll={scroll} />
          </PaginationItem>
        )}
      </PaginationContent>
    </Pagination>
  );
}
