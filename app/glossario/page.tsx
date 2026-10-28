import { BookOpenIcon } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { Paginacao } from "@/components/paginacao";
import { RolarAoMudar } from "@/components/rolar-ao-mudar";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { lerFiltros } from "@/lib/filtros/schemas";
import { GLOSSARIO, TEMAS, type Tema, type Verbete } from "@/lib/glossario";

import { filtrosGlossario, lerUrlGlossario, linkGlossario, navegacaoGlossario } from "./filtros";
import { FiltrosForm } from "./filtros-form";

export const metadata: Metadata = {
  title: "Entenda os termos · Jabuti",
  description: "O que significam empenho, emenda Pix, cota parlamentar, fundo eleitoral, inabilitação no TCU e outros termos do portal.",
};

const ORDEM = Object.keys(TEMAS) as Tema[];
const POR_PAGINA = 12;

const semAcento = (valor: string) =>
  valor.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export default function GlossarioPage({ searchParams }: PageProps<"/glossario">) {
  return (
    <div data-secao="glossario" className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 xs:px-6 py-[clamp(2rem,5vw,4rem)]">
      <header className="flex flex-col gap-3 animate-enter">
        <p className="text-sm font-medium tracking-wide text-secao uppercase">Glossário</p>
        <h1 className="text-[clamp(2rem,4vw,3rem)] leading-tight font-bold">Entenda os termos</h1>
        <p className="max-w-[65ch] text-lg text-muted-foreground">
          O dinheiro público passa por etapas e tem nomes próprios. Aqui estão, em linguagem direta, os conceitos que
          aparecem no portal e por que eles importam na hora de acompanhar quem você elegeu.
        </p>
      </header>

      <div className="rounded-2xl border bg-card p-4 shadow-soft animate-enter sm:p-6" style={{ "--stagger": 1 } as React.CSSProperties}>
        <Suspense fallback={<FiltrosForm />}>
          {searchParams.then((params) => (
            // Sem JS o navegador envia o formulário cru; o servidor valida com o mesmo schema e devolve os erros.
            <FiltrosForm valores={lerUrlGlossario(params)} erros={lerFiltros(filtrosGlossario, params).erros} />
          ))}
        </Suspense>
      </div>

      <Suspense fallback={<ListaSkeleton />}>
        <Lista searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function ListaSkeleton() {
  return (
    <div role="status" aria-label="Carregando termos" className="flex flex-col gap-4">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
  );
}

/** Rótulo do grupo de um verbete: o tema ou a letra inicial (sem acento: "Órgão" fica no O). */
const grupoDe = (v: Verbete, agrupar: "tema" | "alfabetica") =>
  agrupar === "tema" ? v.tema : semAcento(v.termo)[0].toUpperCase();

async function Lista({ searchParams }: Pick<PageProps<"/glossario">, "searchParams">) {
  const params = await searchParams;
  // Filtro inválido: o erro aparece no formulário e a lista vem completa.
  const { busca, tema, agrupar = "tema" } = lerFiltros(filtrosGlossario, params).valores ?? {};
  const navegacao = lerFiltros(navegacaoGlossario, params).valores ?? {};
  const termoBuscado = busca ? semAcento(busca) : "";

  const lista = (GLOSSARIO as readonly Verbete[])
    .filter(
      (v) =>
        (!tema || v.tema === tema) &&
        (!termoBuscado || semAcento(`${v.termo} ${v.curto}`).includes(termoBuscado)),
    )
    .toSorted((a, b) =>
      agrupar === "tema"
        ? ORDEM.indexOf(a.tema) - ORDEM.indexOf(b.tema)
        : a.termo.localeCompare(b.termo, "pt-BR", { sensitivity: "base" }),
    );

  if (lista.length === 0) {
    return (
      <Empty className="rounded-lg border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BookOpenIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Nenhum termo encontrado</EmptyTitle>
          <EmptyDescription>Tente outra palavra ou escolha &ldquo;Todos os temas&rdquo;.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const totalPaginas = Math.ceil(lista.length / POR_PAGINA);
  // Link de outra página do portal (?termo=empenho#empenho): abre na página que contém o termo.
  const indiceTermo = navegacao.termo ? lista.findIndex((v) => v.id === navegacao.termo) : -1;
  const paginaPedida = navegacao.pagina ?? (indiceTermo >= 0 ? Math.floor(indiceTermo / POR_PAGINA) + 1 : 1);
  const pagina = Math.min(paginaPedida, totalPaginas);
  const inicio = (pagina - 1) * POR_PAGINA;
  const daPagina = lista.slice(inicio, inicio + POR_PAGINA);
  // O termo só serve para achar a página; ao paginar ele sai da URL e os filtros ficam.
  const link = (p: number) => linkGlossario("/glossario", { ...lerUrlGlossario(params), termo: null, pagina: p });

  const grupos = Map.groupBy(daPagina, (v) => grupoDe(v, agrupar));

  return (
    <section id="termos" aria-labelledby="resultado" className="flex scroll-mt-24 flex-col gap-8">
      <RolarAoMudar alvo="termos" chave={`${busca ?? ""}|${tema ?? ""}|${agrupar}|${pagina}`} />
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b pb-3">
        <h2 id="resultado" className="text-lg font-semibold" aria-live="polite">
          {lista.length} {lista.length === 1 ? "termo" : "termos"}
          {totalPaginas > 1 && (
            <span className="font-normal text-muted-foreground">
              {" "}
              · página {pagina} de {totalPaginas}
            </span>
          )}
        </h2>
        <p className="text-sm text-muted-foreground">
          {agrupar === "tema" ? "Agrupados por tema" : "Em ordem alfabética"}
        </p>
      </div>

      {[...grupos].map(([grupo, verbetes]) => {
        const titulo = agrupar === "tema" ? TEMAS[grupo as Tema].titulo : grupo;
        // O grupo pode ter começado na página anterior.
        const continua = inicio > 0 && grupoDe(lista[inicio - 1], agrupar) === grupo && grupo === grupoDe(daPagina[0], agrupar);
        return (
          <section key={grupo} aria-labelledby={`grupo-${grupo}`} className="flex flex-col gap-6">
            <div className="flex flex-col gap-1 border-b pb-3">
              <h3 id={`grupo-${grupo}`} className="text-2xl font-bold">
                {titulo}
                {continua && <span className="ml-2 text-base font-normal text-muted-foreground">(continuação)</span>}
              </h3>
              {agrupar === "tema" && <p className="text-muted-foreground">{TEMAS[grupo as Tema].descricao}</p>}
            </div>

            {verbetes.map((v) => (
              <article
                key={v.id}
                id={v.id}
                aria-labelledby={`termo-${v.id}`}
                className="flex scroll-mt-24 flex-col gap-2 target:rounded-lg target:bg-accent target:p-4"
              >
                <h4 id={`termo-${v.id}`} className="text-lg font-semibold">
                  {v.termo}
                </h4>
                {agrupar === "alfabetica" && (
                  <p className="text-sm text-muted-foreground">{TEMAS[v.tema].titulo}</p>
                )}
                <p className="font-medium">{v.curto}</p>
                {v.explicacao.map((paragrafo, i) => (
                  <p key={i} className="max-w-[70ch] text-muted-foreground">
                    {paragrafo}
                  </p>
                ))}
                {v.importancia && (
                  <p className="max-w-[70ch] border-l-2 border-primary pl-3">
                    <span className="font-semibold">Por que importa: </span>
                    {v.importancia}
                  </p>
                )}
              </article>
            ))}
          </section>
        );
      })}

      <Paginacao pagina={pagina} total={totalPaginas} href={link} scroll={false} />
    </section>
  );
}
