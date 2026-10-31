import { ScrollTextIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { AvisoFonte } from "@/components/aviso-fonte";
import { Paginacao } from "@/components/paginacao";
import { RolarAoMudar } from "@/components/rolar-ao-mudar";
import { Termo } from "@/components/termo";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { type Falha, fontesQueFalharam, tentar } from "@/lib/erros";
import { lerFiltros } from "@/lib/filtros/schemas";
import { formatarData } from "@/lib/format/datas";
import { TIPOS_DE_LEI } from "@/lib/leis/etapas";
import {
  DIAS_DECIDIDOS,
  DIAS_NOVOS,
  getAguardandoSancao,
  getDecididosRecentes,
  getLeisRecentes,
  getNovosNaCamara,
  getNovosNoSenado,
  getProntosParaVotar,
  LIMITE_NOVOS_CAMARA,
  type Projeto,
} from "@/lib/leis/queries";
import { metadados } from "@/lib/metadados";
import { normalizarNome } from "@/lib/sync/run";
import { cn } from "@/lib/utils";

import { ETAPA_PADRAO, ETAPAS, filtrosLeis, lerUrlLeis, linkLeis, paginaLeis, type Etapa } from "./filtros";
import { FiltrosForm } from "./filtros-form";

export const metadata = metadados({
  titulo: "Leis e projetos · Jabuti",
  descricao:
    "As últimas leis publicadas e os projetos em cada etapa do Congresso: apresentados, prontos para votar, votados e esperando sanção.",
});

const POR_PAGINA = 20;
const SENADO = "o Senado";
const CAMARA = "a Câmara dos Deputados";

const ETAPA: Record<
  Etapa,
  {
    rotulo: string;
    /** Uma linha no passo da navegação. */
    resumo: string;
    /** Rótulo da data de cada item (a data muda de sentido em cada etapa). */
    rotuloData: string | null;
    vazio: string;
    buscar: () => Promise<{ projetos: Projeto[]; falhas: Falha[] }>;
  }
> = {
  novos: {
    rotulo: "Apresentados",
    resumo: "Acabaram de chegar ao Congresso",
    rotuloData: "Apresentado em",
    vazio: "Nenhum projeto de lei apresentado no período.",
    buscar: async () => {
      const [senado, camara] = await Promise.all([tentar(SENADO, getNovosNoSenado), tentar(CAMARA, getNovosNaCamara)]);
      const projetos = [...(senado.ok ? senado.dados : []), ...(camara.ok ? camara.dados : [])];
      projetos.sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""));
      return { projetos, falhas: fontesQueFalharam(senado, camara) };
    },
  },
  plenario: {
    rotulo: "Prontos para votar",
    resumo: "Esperam o Plenário do Senado",
    rotuloData: "Nessa situação desde",
    vazio: "Nenhum projeto de lei pronto para o Plenário do Senado agora.",
    buscar: () => doSenado(getProntosParaVotar),
  },
  decididos: {
    rotulo: "Votados",
    resumo: `Decisões do Senado em ${DIAS_DECIDIDOS} dias`,
    rotuloData: "Decidido em",
    vazio: `Nenhum projeto de lei votado no Senado nos últimos ${DIAS_DECIDIDOS} dias.`,
    buscar: () => doSenado(getDecididosRecentes),
  },
  sancao: {
    rotulo: "Esperando sanção",
    resumo: "Aprovados, nas mãos do presidente",
    rotuloData: "Enviado em",
    vazio: "Nenhum projeto enviado pelo Senado está esperando sanção ou promulgação agora.",
    buscar: () => doSenado(getAguardandoSancao),
  },
  leis: {
    rotulo: "Viraram lei",
    resumo: "Leis publicadas neste ano e no anterior",
    rotuloData: null,
    vazio: "Nenhuma lei encontrada no período.",
    buscar: () => doSenado(getLeisRecentes),
  },
};

async function doSenado(consulta: () => Promise<Projeto[]>) {
  const r = await tentar(SENADO, consulta);
  return { projetos: r.ok ? r.dados : [], falhas: fontesQueFalharam(r) };
}

/** Explicação da etapa aberta, com os termos que ela usa. */
function DescricaoEtapa({ etapa }: { etapa: Etapa }) {
  switch (etapa) {
    case "novos":
      return (
        <>
          Projetos apresentados no Senado nos últimos {DIAS_NOVOS} dias e os {LIMITE_NOVOS_CAMARA} mais recentes da Câmara. O
          próximo passo é a análise nas <Termo id="comissao">comissões</Termo>, que pode levar meses ou anos.
        </>
      );
    case "plenario":
      return (
        <>
          Projetos que já passaram pelas comissões do Senado e esperam o voto do <Termo id="plenario">Plenário</Termo>. Quem
          decide quando entram na pauta é o presidente da casa, então alguns esperam muito tempo.
        </>
      );
    case "decididos":
      return (
        <>
          Decisões do Senado nos últimos {DIAS_DECIDIDOS} dias, no Plenário ou numa comissão com{" "}
          <Termo id="decisao-terminativa">decisão terminativa</Termo>. Aprovado numa casa, o projeto segue para a outra
          revisar (<Termo id="casa-revisora">casa revisora</Termo>).
        </>
      );
    case "sancao":
      return (
        <>
          Aprovados pela Câmara e pelo Senado e enviados pelo Senado ao presidente da República, que pode dar a{" "}
          <Termo id="sancao">sanção</Termo> ou o <Termo id="veto">veto</Termo>, ou à <Termo id="promulgacao">promulgação</Termo>.
          Projetos cuja última votação foi na Câmara são enviados por ela e não aparecem aqui.
        </>
      );
    case "leis":
      return (
        <>
          Leis, <Termo id="lei-complementar">leis complementares</Termo> e emendas à Constituição deste ano e do anterior, da
          mais nova para a mais antiga, com o projeto que deu origem a cada uma.
        </>
      );
  }
}

export default function LeisPage({ searchParams }: PageProps<"/leis">) {
  return (
    <div data-secao="parlamentares" className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 xs:px-6 py-[clamp(2rem,5vw,4rem)]">
      <header className="flex flex-col gap-3 animate-enter">
        <p className="text-sm font-medium tracking-wide text-secao uppercase">Câmara e Senado</p>
        <h1 className="text-[clamp(2rem,4vw,3rem)] leading-tight font-bold">Leis e projetos</h1>
        <p className="max-w-[65ch] text-lg text-muted-foreground">
          Um <Termo id="projeto-de-lei">projeto de lei</Termo> passa por várias etapas até virar lei. Escolha uma etapa para ver
          os projetos que estão nela agora e as leis mais recentes.
        </p>
      </header>

      {/* Sem searchParams a navegação sai no HTML estático com a etapa padrão marcada. */}
      <Suspense fallback={<NavEtapas />}>
        <NavEtapasDaUrl searchParams={searchParams} />
      </Suspense>

      <div className="rounded-2xl border bg-card p-4 shadow-soft animate-enter sm:p-6" style={{ "--stagger": 1 } as React.CSSProperties}>
        <Suspense fallback={<FiltrosForm />}>
          <Filtros searchParams={searchParams} />
        </Suspense>
      </div>

      <Suspense fallback={<ListaSkeleton />}>
        <Lista searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function etapaDe(params: Awaited<PageProps<"/leis">["searchParams"]>): Etapa {
  return lerFiltros(filtrosLeis.pick({ etapa: true }), params).valores?.etapa ?? ETAPA_PADRAO;
}

async function NavEtapasDaUrl({ searchParams }: Pick<PageProps<"/leis">, "searchParams">) {
  const params = await searchParams;
  return <NavEtapas atual={etapaDe(params)} busca={lerUrlLeis(params).busca} />;
}

/** O caminho até a lei, na ordem: cada passo é um link que abre a lista daquela etapa. */
function NavEtapas({ atual = ETAPA_PADRAO, busca = null }: { atual?: Etapa; busca?: string | null }) {
  return (
    <nav aria-label="Etapas até virar lei">
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {ETAPAS.map((etapa, i) => {
          const ativa = etapa === atual;
          return (
            <li key={etapa} className="flex">
              <Link
                href={linkLeis("/leis", { etapa: etapa === ETAPA_PADRAO ? null : etapa, busca })}
                scroll={false}
                aria-current={ativa ? "page" : undefined}
                className={cn(
                  "flex w-full flex-col gap-0.5 rounded-xl border bg-card px-4 py-3 outline-none transition-colors hover:bg-secao-suave focus-visible:ring-2 focus-visible:ring-ring",
                  ativa && "border-secao bg-secao-suave ring-1 ring-secao",
                )}
              >
                <span className="text-xs font-medium text-muted-foreground">Etapa {i + 1}</span>
                <span className="font-semibold">{ETAPA[etapa].rotulo}</span>
                <span className="text-sm text-muted-foreground">{ETAPA[etapa].resumo}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

async function Filtros({ searchParams }: Pick<PageProps<"/leis">, "searchParams">) {
  const params = await searchParams;
  // Sem JS o navegador envia o formulário cru; o servidor valida com o mesmo schema e devolve os erros.
  return <FiltrosForm valores={lerUrlLeis(params)} erros={lerFiltros(filtrosLeis, params).erros} />;
}

function ListaSkeleton() {
  return (
    <div role="status" aria-label="Carregando projetos" className="flex flex-col gap-3">
      <Skeleton className="h-10 w-72" />
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
  );
}

async function Lista({ searchParams }: Pick<PageProps<"/leis">, "searchParams">) {
  const params = await searchParams;
  const etapa = etapaDe(params);
  const info = ETAPA[etapa];
  const { projetos: todos, falhas } = await info.buscar();
  // Busca inválida: o erro aparece no formulário e a lista vem completa.
  const busca = lerFiltros(filtrosLeis, params).valores?.busca;
  const lista = busca
    ? todos.filter((p) => normalizarNome(`${p.identificacao} ${p.ementa} ${p.autoria ?? ""}`).includes(busca))
    : todos;

  const titulo = (
    <div className="flex flex-col gap-2">
      <h2 id="resultado" className="text-2xl font-bold">
        {info.rotulo}
      </h2>
      <p className="max-w-[75ch] text-muted-foreground">
        <DescricaoEtapa etapa={etapa} />
      </p>
    </div>
  );
  const aviso = (
    <AvisoFonte
      fontes={falhas}
      consequencia={
        todos.length === 0
          ? "Sem essa fonte, não há como mostrar os projetos desta etapa agora."
          : "A lista mostra só os projetos da outra casa."
      }
    />
  );

  // Fonte fora do ar não é "nenhum projeto": mostra só o aviso.
  if (todos.length === 0 && falhas.length > 0) {
    return (
      <section aria-labelledby="resultado" className="flex flex-col gap-4">
        {titulo}
        {aviso}
      </section>
    );
  }

  const totalPaginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const pagina = Math.min(lerFiltros(paginaLeis, params).valores?.pagina ?? 1, totalPaginas);
  const inicio = (pagina - 1) * POR_PAGINA;
  const link = (p: number) => linkLeis("/leis", { ...lerUrlLeis(params), pagina: p });
  const nome = etapa === "leis" ? (lista.length === 1 ? "lei" : "leis") : lista.length === 1 ? "projeto" : "projetos";

  return (
    <section id="resultados" aria-labelledby="resultado" className="flex scroll-mt-24 flex-col gap-4">
      <RolarAoMudar alvo="resultados" chave={`${etapa}|${busca ?? ""}|${pagina}`} />
      {titulo}
      {aviso}
      <p className="border-b pb-3 font-semibold" aria-live="polite">
        {lista.length.toLocaleString("pt-BR")} {nome}
        {busca && <span className="font-normal text-muted-foreground"> com a busca &ldquo;{lerUrlLeis(params).busca}&rdquo;</span>}
        {totalPaginas > 1 && (
          <span className="font-normal text-muted-foreground">
            {" "}
            · página {pagina} de {totalPaginas}
          </span>
        )}
      </p>

      {lista.length === 0 ? (
        <Empty className="rounded-lg border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ScrollTextIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Nada encontrado</EmptyTitle>
            <EmptyDescription>{busca ? "Nenhum item desta etapa combina com a busca. Tente outra palavra." : info.vazio}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {lista.slice(inicio, inicio + POR_PAGINA).map((p) => (
            <li key={p.chave} className="flex">
              <ProjetoItem projeto={p} rotuloData={info.rotuloData} />
            </li>
          ))}
        </ul>
      )}
      <Paginacao pagina={pagina} total={totalPaginas} href={link} scroll={false} />
    </section>
  );
}

const TOM_DECISAO = { aprovado: "success", rejeitado: "destructive", neutro: "secondary" } as const;

function ProjetoItem({ projeto: p, rotuloData }: { projeto: Projeto; rotuloData: string | null }) {
  const casa = p.casa === "camara" ? "Câmara" : "Senado";
  const detalhes: [string, React.ReactNode][] = [];
  if (p.situacao && !p.norma) detalhes.push(["Situação", p.situacao]);
  if (rotuloData && p.data) detalhes.push([rotuloData, formatarData(p.data)]);
  if (p.origem) detalhes.push(["Origem", p.origem]);
  if (p.autoria) detalhes.push(["Autoria", p.autoria]);

  return (
    <article className="flex w-full flex-col gap-3 rounded-xl border bg-card p-4 shadow-soft">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-lg font-semibold">
          {p.url ? (
            <a
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="text-link underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {p.identificacao}
              <span className="sr-only"> (abre o site do {casa} em nova aba)</span>
            </a>
          ) : (
            p.identificacao
          )}
        </h3>
        <span className="text-sm text-muted-foreground">{TIPOS_DE_LEI[p.sigla]?.nome ?? p.sigla}</span>
      </div>

      {p.norma && (
        <p className="flex flex-wrap items-center gap-2 font-semibold">
          {p.norma}
          {p.comVeto && <Badge variant="outline">Com veto parcial</Badge>}
        </p>
      )}
      {p.decisao && (
        <p>
          <Badge variant={TOM_DECISAO[p.decisao.tom]}>{p.decisao.texto}</Badge>
        </p>
      )}

      <p className="line-clamp-4">{p.ementa}</p>

      {detalhes.length > 0 && (
        <dl className="mt-auto grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
          {detalhes.map(([rotulo, valor]) => (
            <div key={rotulo} className="contents">
              <dt className="text-muted-foreground">{rotulo}</dt>
              <dd className="line-clamp-2">{valor}</dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  );
}
