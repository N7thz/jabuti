import Link from "next/link";
import { Suspense } from "react";

import { AvisoFonte } from "@/components/aviso-fonte";
import { Compartilhar } from "@/components/compartilhar";
import { ErroSecao } from "@/components/erro-secao";
import { reaisDeCentavos } from "@/components/emendas/valores";
import { iniciais } from "@/components/parlamentar-item";
import { porcentagem } from "@/components/resumo-parlamentar";
import { Termo } from "@/components/termo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { lerFiltros } from "@/lib/filtros/schemas";
import { metadados } from "@/lib/metadados";
import { getConcordancia, getResumoComparavel, type ResumoComparavel } from "@/lib/parlamentares/comparacao";
import { getMediasDaCasa, type MediasDaCasa } from "@/lib/parlamentares/medias";
import { listarParlamentares } from "@/lib/parlamentares/queries";

import { filtrosComparar, lerUrlComparar, linkComparar } from "./filtros";
import { FiltrosForm } from "./filtros-form";

export const metadata = metadados({
  titulo: "Comparar parlamentares · Jabuti",
  descricao: "Presença, gastos da cota, proposições, emendas e votos de dois parlamentares lado a lado.",
});

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

      {/* O fallback é o próprio formulário, vazio e com a lista de nomes (em cache): vai no HTML estático e
          funciona sem JavaScript. Com os filtros da URL, a versão preenchida substitui a vazia. */}
      <Suspense fallback={<Filtros />}>
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

async function Filtros({ searchParams }: Partial<Pick<PageProps<"/comparar">, "searchParams">>) {
  const [params, { lista: todos, indisponiveis }] = await Promise.all([searchParams ?? {}, listarParlamentares()]);
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

const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

function Media({ valor, de }: { valor: string | false | null | undefined; de: string }) {
  if (!valor) return null;
  return (
    <span className="block font-sans text-xs text-muted-foreground">
      Média {de}: <span className="font-mono tabular-nums">{valor}</span>
    </span>
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
  // A média é só referência: se o banco falhar, a comparação aparece sem ela.
  const mediaDa = (p: ResumoComparavel) =>
    getMediasDaCasa(p.casa === "camara" ? "CAMARA" : "SENADO", p.ano).catch(() => null);
  const [votos, mediaA, mediaB] = await Promise.all([
    getConcordancia(a, b),
    mediaDa(a),
    a.casa === b.casa ? null : mediaDa(b),
  ]);
  const medias = { [a.chave]: mediaA, [b.chave]: a.casa === b.casa ? mediaA : mediaB };
  const nomeDaCasa = (p: ResumoComparavel) => (p.casa === "camara" ? "dos deputados" : "dos senadores");

  const linhas: {
    rotulo: React.ReactNode;
    valor: (p: ResumoComparavel) => React.ReactNode;
    /** Média da casa no indicador; vazio quando o banco ainda não tem o dado do ano. */
    media: (m: MediasDaCasa) => string | false | null;
  }[] = [
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
      media: (m) => m.presenca && porcentagem(m.presenca.parte, m.presenca.total),
    },
    {
      rotulo: <Termo id="cota-parlamentar">Gasto da cota</Termo>,
      valor: (p) => reaisDeCentavos(p.cota),
      media: (m) => m.cota !== null && reaisDeCentavos(m.cota),
    },
    {
      rotulo: <Termo id="proposicao">Proposições em 12 meses</Termo>,
      valor: (p) => p.proposicoes,
      media: (m) => m.proposicoes !== null && decimal.format(m.proposicoes),
    },
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
      media: (m) => m.emendas && reaisDeCentavos(m.emendas.empenhado),
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

      {/* Cada indicador tem o nome no centro e um valor embaixo de cada cartão: as duas colunas têm a mesma
          largura e o mesmo espaçamento dos cartões acima, então cada número fica alinhado com quem ele descreve. */}
      <section aria-labelledby="indicadores" className="rounded-lg border bg-card">
        <h3 id="indicadores" className="border-b px-4 py-3 text-center font-semibold">
          Indicadores de {a.ano}
        </h3>
        <dl className="divide-y">
          {linhas.map((l, i) => (
            <div key={i} className="flex flex-col gap-2 py-4">
              <dt className="px-4 text-center text-sm text-muted-foreground">{l.rotulo}</dt>
              <div className="grid grid-cols-2 gap-4">
                {[a, b].map((p) => (
                  <dd key={p.chave} className="px-4 text-center font-mono text-lg tabular-nums">
                    <span className="sr-only">{p.nome}: </span>
                    {l.valor(p)}
                    {/* No celular os cartões ficam empilhados: o nome diz de quem é cada coluna. */}
                    <span aria-hidden="true" className="block font-sans text-xs text-muted-foreground sm:hidden">
                      {p.nome}
                    </span>
                    {/* Casas diferentes: cada coluna mostra a média da sua. */}
                    {a.casa !== b.casa && <Media valor={medias[p.chave] && l.media(medias[p.chave]!)} de={nomeDaCasa(p)} />}
                  </dd>
                ))}
              </div>
              {a.casa === b.casa && (
                <p className="px-4 text-center">
                  <Media valor={mediaA && l.media(mediaA)} de={nomeDaCasa(a)} />
                </p>
              )}
            </div>
          ))}
        </dl>
        {(mediaA || mediaB) && (
          <p className="border-t px-4 py-3 text-center text-xs text-muted-foreground">
            A média é por parlamentar em exercício e sai da nossa cópia dos dados oficiais, atualizada uma vez por dia.
            No gasto da cota, conta só quem lançou algum gasto no ano.
          </p>
        )}
      </section>

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
