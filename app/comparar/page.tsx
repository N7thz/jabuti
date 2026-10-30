import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AvisoFonte } from "@/components/aviso-fonte";
import { Compartilhar } from "@/components/compartilhar";
import { ErroSecao } from "@/components/erro-secao";
import { Tabela, TBody, Td, Th, THead, Tr } from "@/components/emendas/tabela";
import { reaisDeCentavos } from "@/components/emendas/valores";
import { iniciais } from "@/components/parlamentar-item";
import { porcentagem } from "@/components/resumo-parlamentar";
import { Termo } from "@/components/termo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { lerFiltros } from "@/lib/filtros/schemas";
import { getConcordancia, getResumoComparavel, type ResumoComparavel } from "@/lib/parlamentares/comparacao";
import { listarParlamentares } from "@/lib/parlamentares/queries";

import { filtrosComparar, lerUrlComparar, linkComparar } from "./filtros";
import { FiltrosForm } from "./filtros-form";

export const metadata: Metadata = {
  title: "Comparar parlamentares · Jabuti",
  description: "Presença, gastos da cota, proposições, emendas e votos de dois parlamentares lado a lado.",
};

export default function CompararPage({ searchParams }: PageProps<"/comparar">) {
  return (
    <div data-secao="parlamentares" className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 xs:px-6 py-[clamp(2rem,5vw,4rem)]">
      <header className="flex flex-col gap-3 animate-enter">
        <p className="text-sm font-medium tracking-wide text-secao uppercase">Parlamentares</p>
        <h1 className="text-[clamp(2rem,4vw,3rem)] leading-tight font-bold">Comparar dois parlamentares</h1>
        <p className="max-w-[65ch] text-lg text-muted-foreground">
          Veja lado a lado a presença, o gasto da cota, as proposições e as emendas do ano. Entre dois deputados ou dois
          senadores, mostramos também quantas vezes votaram igual.
        </p>
      </header>

      <Suspense fallback={<Skeleton className="h-20" />}>
        <Filtros searchParams={searchParams} />
      </Suspense>

      {/* Se a consulta falhar, o formulário continua na tela para tentar outra combinação. */}
      <ErroSecao titulo="Comparação" fonte="das APIs da Câmara, do Senado e do Portal da Transparência">
        <Suspense
          fallback={
            <div role="status" aria-label="Carregando comparação" className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
              <Skeleton className="h-80 md:col-span-2" />
            </div>
          }
        >
          <Resultado searchParams={searchParams} />
        </Suspense>
      </ErroSecao>
    </div>
  );
}

async function Filtros({ searchParams }: Pick<PageProps<"/comparar">, "searchParams">) {
  const [params, { lista: todos, indisponiveis }] = await Promise.all([searchParams, listarParlamentares()]);
  const opcao = (p: (typeof todos)[number]) => ({
    chave: `${p.casa}-${p.id}`,
    rotulo: `${p.nome} (${p.partido ?? "sem partido"}/${p.uf ?? "—"})`,
  });
  return (
    <>
      <AvisoFonte fontes={indisponiveis} consequencia="A lista de escolha está incompleta." />
      <FiltrosForm
        deputados={todos.filter((p) => p.casa === "camara").map(opcao)}
        senadores={todos.filter((p) => p.casa === "senado").map(opcao)}
        valores={lerUrlComparar(params)}
        erros={lerFiltros(filtrosComparar, params).erros}
      />
    </>
  );
}

async function Resultado({ searchParams }: Pick<PageProps<"/comparar">, "searchParams">) {
  const { valores } = lerFiltros(filtrosComparar, await searchParams);
  if (!valores?.a || !valores.b) {
    return <p className="text-muted-foreground">Escolha os dois parlamentares acima e toque em Comparar.</p>;
  }
  if (valores.a === valores.b) {
    return <p className="rounded-lg border bg-card p-4">Escolha dois parlamentares diferentes.</p>;
  }

  const [a, b] = await Promise.all([getResumoComparavel(valores.a), getResumoComparavel(valores.b)]);
  if (!a || !b) {
    return (
      <p className="rounded-lg border bg-card p-4">
        Não encontramos {!a && !b ? "nenhum dos dois parlamentares" : "um dos parlamentares"} nas APIs oficiais. Escolha de
        novo na lista.
      </p>
    );
  }
  const votos = await getConcordancia(a, b);

  const linhas: { rotulo: React.ReactNode; valor: (p: ResumoComparavel) => React.ReactNode }[] = [
    {
      rotulo: <Termo id="presenca">Presença</Termo>,
      valor: (p) => (
        <>
          <strong>{porcentagem(p.presenca.parte, p.presenca.total)}</strong>
          <span className="block text-xs text-muted-foreground">
            {p.presenca.parte} de {p.presenca.total} {p.presenca.base}
          </span>
        </>
      ),
    },
    { rotulo: <Termo id="cota-parlamentar">Gasto da cota</Termo>, valor: (p) => reaisDeCentavos(p.cota) },
    { rotulo: <Termo id="proposicao">Proposições em 12 meses</Termo>, valor: (p) => p.proposicoes },
    {
      rotulo: <Termo id="empenho">Emendas empenhadas</Termo>,
      valor: (p) => (
        <>
          {reaisDeCentavos(p.emendas.empenhado)}
          <span className="block text-xs text-muted-foreground">
            {p.emendas.quantidade} emendas · {reaisDeCentavos(p.emendas.pago)} pagos
          </span>
        </>
      ),
    },
  ];

  const pctIguais = votos && votos.comuns ? porcentagem(votos.iguais, votos.comuns) : null;

  return (
    <section aria-labelledby="comparacao" className="flex flex-col gap-6">
      <h2 id="comparacao" className="sr-only" aria-live="polite">
        Comparação entre {a.nome} e {b.nome}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {[a, b].map((p) => (
          <div key={p.chave} className="flex items-center gap-4 rounded-lg border bg-card p-4">
            <Avatar className="size-16">
              {p.fotoUrl && <AvatarImage src={p.fotoUrl} alt="" />}
              <AvatarFallback>{iniciais(p.nome)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <Link href={p.perfil} className="text-lg font-bold text-link underline">
                {p.nome}
              </Link>
              <span className="text-sm text-muted-foreground">
                {p.cargo} · {p.partido ?? "sem partido"}
                {p.uf && `/${p.uf}`}
              </span>
            </div>
          </div>
        ))}
      </div>

      <Tabela legenda={`Indicadores de ${a.ano} lado a lado`}>
        <THead>
          <Tr>
            <Th>Indicador ({a.ano})</Th>
            <Th numero>{a.nome}</Th>
            <Th numero>{b.nome}</Th>
          </Tr>
        </THead>
        <TBody>
          {linhas.map((l, i) => (
            <Tr key={i}>
              <Th scope="row" className="font-normal">
                {l.rotulo}
              </Th>
              <Td numero rotulo={a.nome}>
                {l.valor(a)}
              </Td>
              <Td numero rotulo={b.nome}>
                {l.valor(b)}
              </Td>
            </Tr>
          ))}
        </TBody>
      </Tabela>

      <div className="rounded-lg border bg-card p-4">
        <h3 className="font-semibold">Votaram igual?</h3>
        {!votos ? (
          <p className="text-muted-foreground">
            Um é deputado e o outro é senador: eles votam em casas diferentes, então não dá para comparar os votos.
          </p>
        ) : votos.comuns === 0 ? (
          <p className="text-muted-foreground">Ainda não há votações nominais em que os dois tenham votado sim, não ou abstenção.</p>
        ) : (
          <p>
            Nas <strong>{votos.comuns}</strong> <Termo id="votacao-nominal">votações nominais</Termo> em que os dois tomaram
            posição, votaram igual em <strong>{votos.iguais}</strong> ({pctIguais}) e diferente em{" "}
            <strong>{votos.comuns - votos.iguais}</strong>.
            <span className="block text-sm text-muted-foreground">
              Ausências e votos secretos ficam fora: não dá para saber se concordaram.
            </span>
          </p>
        )}
      </div>

      <Compartilhar
        caminho={linkComparar("/comparar", { a: a.chave, b: b.chave })}
        texto={`${a.nome} × ${b.nome} em ${a.ano}: presença de ${porcentagem(a.presenca.parte, a.presenca.total)} contra ${porcentagem(
          b.presenca.parte,
          b.presenca.total,
        )}; cota de ${reaisDeCentavos(a.cota)} contra ${reaisDeCentavos(b.cota)}.${pctIguais ? ` Votaram igual em ${pctIguais} das vezes.` : ""}`}
      />
    </section>
  );
}
