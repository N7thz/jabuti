import { PinIcon, UsersIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { BotoesFixar, type AlvoFixado } from "@/components/fixar";
import { Paginacao } from "@/components/paginacao";
import { hrefParlamentar, ParlamentarItem } from "@/components/parlamentar-item";
import { RolarAoMudar } from "@/components/rolar-ao-mudar";
import { buttonVariants } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { ItemGroup } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { lerFiltros } from "@/lib/filtros/schemas";
import { getFixados } from "@/lib/fixados";
import { listarParlamentares } from "@/lib/parlamentares/queries";
import { normalizarNome } from "@/lib/sync/run";
import { cn } from "@/lib/utils";

import { filtrosParlamentares, lerUrlParlamentares, linkParlamentares, paginaParlamentares } from "./filtros";
import { FiltrosForm } from "./filtros-form";

export const metadata: Metadata = { title: "Parlamentares · Jabuti" };

const POR_PAGINA = 30;

export default function ParlamentaresPage({ searchParams }: PageProps<"/parlamentares">) {
  return (
    <div data-secao="parlamentares" className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 xs:px-6 py-[clamp(2rem,5vw,4rem)]">
      <header className="flex flex-col gap-3 animate-enter">
        <p className="text-sm font-medium tracking-wide text-secao uppercase">Câmara e Senado</p>
        <h1 className="text-[clamp(2rem,4vw,3rem)] leading-tight font-bold">Parlamentares em exercício</h1>
        <p className="max-w-[60ch] text-lg text-muted-foreground">
          Escolha um deputado ou senador para ver gastos da cota, proposições apresentadas e emendas.
        </p>
      </header>

      {/* Atalhos de quem está logado; não aparece para visitantes nem para quem não fixou nada. */}
      <Suspense fallback={null}>
        <PainelFixados />
      </Suspense>

      {/* Filtros num painel próprio, separados visualmente da lista de resultados. */}
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

async function Filtros({ searchParams }: Pick<PageProps<"/parlamentares">, "searchParams">) {
  const [params, todos, fixados] = await Promise.all([searchParams, listarParlamentares(), getFixados()]);
  const partidos = [...new Set(todos.map((p) => p.partido).filter((p): p is string => Boolean(p)))].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
  return (
    // Sem JS o navegador envia o formulário cru; o servidor valida com o mesmo schema e devolve os erros.
    <FiltrosForm
      valores={lerUrlParlamentares(params)}
      erros={lerFiltros(filtrosParlamentares, params).erros}
      partidos={partidos}
      logado={fixados !== null}
    />
  );
}

const chip = cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-full font-medium");

/** Parlamentares, partidos e bancadas fixados: cada um leva direto ao perfil ou à lista filtrada. */
async function PainelFixados() {
  const fixados = await getFixados();
  if (!fixados) return null;
  const { parlamentares, partidos, bancadas } = fixados;
  if (parlamentares.length + partidos.length + bancadas.length === 0) return null;

  const grupos = [
    {
      titulo: "Parlamentares",
      itens: parlamentares.map((f) => {
        const [casa, id] = f.chave.split("-") as ["camara" | "senado", string];
        return { chave: f.chave, rotulo: f.rotulo, href: hrefParlamentar({ casa, id }) };
      }),
    },
    { titulo: "Partidos", itens: partidos.map((f) => ({ ...f, href: linkParlamentares("/parlamentares", { partido: f.chave }) })) },
    { titulo: "Bancadas", itens: bancadas.map((f) => ({ ...f, href: linkParlamentares("/parlamentares", { uf: f.chave }) })) },
  ].filter((g) => g.itens.length > 0);

  return (
    <section aria-labelledby="fixados" className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-soft animate-enter sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 id="fixados" className="inline-flex items-center gap-2 text-lg font-semibold">
          <PinIcon aria-hidden="true" className="size-4 text-secao" />
          Seus fixados
        </h2>
        <Link
          href={linkParlamentares("/parlamentares", { fixados: "1" })}
          className="text-sm text-link underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Ver só os fixados na lista
        </Link>
      </div>
      <div className="flex flex-col gap-3">
        {grupos.map((g) => (
          <div key={g.titulo} className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-4">
            <h3 className="w-28 shrink-0 text-sm text-muted-foreground">{g.titulo}</h3>
            <ul className="flex flex-wrap gap-2">
              {g.itens.map((item) => (
                <li key={item.chave}>
                  <Link href={item.href} className={chip}>
                    {item.rotulo}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function ListaSkeleton() {
  return (
    <div role="status" aria-label="Carregando parlamentares" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 9 }, (_, i) => (
        <Skeleton key={i} className="h-16" />
      ))}
    </div>
  );
}

async function Lista({ searchParams }: Pick<PageProps<"/parlamentares">, "searchParams">) {
  const [params, todos, fixados] = await Promise.all([searchParams, listarParlamentares(), getFixados()]);
  // Filtro inválido: o erro aparece no formulário e a lista vem completa.
  const { nome, casa, uf, partido, fixados: soFixados } = lerFiltros(filtrosParlamentares, params).valores ?? {};
  // "Só os fixados": o parlamentar fixado, ou de um partido ou bancada fixados. Sem login, o filtro não vale.
  const ehFixado = (p: (typeof todos)[number]) =>
    !fixados ||
    fixados.tem("PARLAMENTAR", `${p.casa}-${p.id}`) ||
    (p.partido !== null && fixados.tem("PARTIDO", p.partido)) ||
    (p.uf !== null && fixados.tem("BANCADA", p.uf));
  const lista = todos.filter(
    (p) =>
      (!casa || p.casa === casa) &&
      (!uf || p.uf === uf) &&
      (!partido || p.partido?.toUpperCase() === partido) &&
      (!nome || normalizarNome(p.nome).includes(nome)) &&
      (!soFixados || ehFixado(p)),
  );
  // Partido ou bancada filtrados viram atalho fixável (o botão só aparece para quem está logado).
  const alvos: AlvoFixado[] = [];
  const siglaPartido = partido ? todos.find((p) => p.partido?.toUpperCase() === partido)?.partido : null;
  if (siglaPartido) alvos.push({ tipo: "PARTIDO", chave: siglaPartido, rotulo: siglaPartido, nome: `partido ${siglaPartido}` });
  if (uf) alvos.push({ tipo: "BANCADA", chave: uf, rotulo: `Bancada de ${uf}`, nome: `bancada de ${uf}` });

  if (lista.length === 0) {
    return (
      <Empty className="rounded-lg border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UsersIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Ninguém encontrado</EmptyTitle>
          <EmptyDescription>
            {soFixados && fixados
              ? "Nada que você fixou combina com esses filtros. Fixe parlamentares, partidos ou bancadas no perfil de cada um."
              : "Nenhum parlamentar em exercício com esses filtros."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const deputados = lista.filter((p) => p.casa === "camara").length;
  const totalPaginas = Math.ceil(lista.length / POR_PAGINA);
  const pagina = Math.min(lerFiltros(paginaParlamentares, params).valores?.pagina ?? 1, totalPaginas);
  const inicio = (pagina - 1) * POR_PAGINA;
  // Mantém os filtros como vieram na URL, para o formulário continuar mostrando os mesmos valores.
  const link = (p: number) => linkParlamentares("/parlamentares", { ...lerUrlParlamentares(params), pagina: p });

  return (
    <section id="resultados" aria-labelledby="resultado" className="flex scroll-mt-24 flex-col gap-4">
      <RolarAoMudar alvo="resultados" chave={`${nome ?? ""}|${casa ?? ""}|${uf ?? ""}|${partido ?? ""}|${soFixados ?? ""}|${pagina}`} />
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b pb-3">
        <h2 id="resultado" className="text-lg font-semibold" aria-live="polite">
          {lista.length} {lista.length === 1 ? "parlamentar" : "parlamentares"}
          {totalPaginas > 1 && (
            <span className="font-normal text-muted-foreground">
              {" "}
              · página {pagina} de {totalPaginas}
            </span>
          )}
        </h2>
        <p className="text-sm text-muted-foreground">
          {deputados} na Câmara · {lista.length - deputados} no Senado
        </p>
      </div>
      {alvos.length > 0 && <BotoesFixar alvos={alvos} fixados={fixados} />}
      <ItemGroup className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {lista.slice(inicio, inicio + POR_PAGINA).map((p) => (
          <ParlamentarItem key={`${p.casa}-${p.id}`} parlamentar={p} />
        ))}
      </ItemGroup>
      <Paginacao pagina={pagina} total={totalPaginas} href={link} scroll={false} />
    </section>
  );
}
