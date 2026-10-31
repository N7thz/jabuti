import Link from "next/link";
import { Suspense } from "react";

import { BaixarCsv } from "@/components/baixar-csv";
import { ErroSecao } from "@/components/erro-secao";
import { Tabela, TBody, Td, Th, THead, Tr } from "@/components/emendas/tabela";
import { reaisDeCentavos } from "@/components/emendas/valores";
import { Termo } from "@/components/termo";
import { Skeleton } from "@/components/ui/skeleton";
import { lerFiltros } from "@/lib/filtros/schemas";
import { getOpcoesCota, getRankingCota, LIMITE_RANKING } from "@/lib/rankings/queries";
import { linkParlamentar } from "@/lib/votacoes/queries";

import { filtrosRankingCota, lerUrlRankingCota, linkRankingCota } from "./filtros";
import { FiltrosForm } from "./filtros-form";
import { metadados } from "@/lib/metadados";

export const metadata = metadados({
  titulo: "Ranking da cota parlamentar · Jabuti",
  descricao: "Quem mais gastou da cota parlamentar, no total e por tipo de gasto.",
});

export default function RankingCotaPage({ searchParams }: PageProps<"/rankings/cota">) {
  return (
    <div data-secao="parlamentares" className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 xs:px-6 py-[clamp(2rem,5vw,4rem)]">
      <header className="flex flex-col gap-3 animate-enter">
        <p className="text-sm font-medium tracking-wide text-secao uppercase">Rankings</p>
        <h1 className="text-[clamp(2rem,4vw,3rem)] leading-tight font-bold">Quem mais gasta da cota</h1>
        <p className="max-w-[65ch] text-lg text-muted-foreground">
          A <Termo id="cota-parlamentar">cota parlamentar</Termo> reembolsa passagens, combustível, aluguel de escritório,
          divulgação e outros gastos do mandato. Escolha um tipo de gasto para ver quem mais usou o dinheiro com ele.
        </p>
      </header>

      {/* O fallback é o próprio formulário com as opções (em cache): vai no HTML estático e funciona sem JavaScript. */}
      <Suspense fallback={<Filtros />}>
        <Filtros searchParams={searchParams} />
      </Suspense>

      {/* Se a consulta falhar, o formulário continua na tela para tentar outra combinação. */}
      <ErroSecao titulo="Ranking" fonte="do banco do portal">
        <Suspense
          fallback={
            <div role="status" aria-label="Carregando ranking" className="flex flex-col gap-3">
              <Skeleton className="h-12" />
              <Skeleton className="h-96" />
            </div>
          }
        >
          <Resultado searchParams={searchParams} />
        </Suspense>
      </ErroSecao>
    </div>
  );
}

async function Filtros({ searchParams }: Partial<Pick<PageProps<"/rankings/cota">, "searchParams">>) {
  const [params, opcoes] = await Promise.all([searchParams ?? {}, getOpcoesCota()]);
  return (
    <FiltrosForm
      anos={opcoes.anos}
      categorias={opcoes.categorias}
      valores={lerUrlRankingCota(params)}
      erros={lerFiltros(filtrosRankingCota, params).erros}
    />
  );
}

async function Resultado({ searchParams }: Pick<PageProps<"/rankings/cota">, "searchParams">) {
  const [params, opcoes] = await Promise.all([searchParams, getOpcoesCota()]);
  const { valores } = lerFiltros(filtrosRankingCota, params);
  if (!valores) return null;

  if (opcoes.anos.length === 0) {
    return <p className="rounded-lg border bg-card p-4">Os gastos da cota ainda não foram carregados. Volte em breve.</p>;
  }

  const ano = valores.ano ?? opcoes.anos[0];
  // Categoria fora da lista vira "todos os gastos" em vez de um ranking vazio.
  const categoria = valores.categoria && opcoes.categorias.includes(valores.categoria) ? valores.categoria : undefined;
  const casa = valores.casa === "camara" ? "CAMARA" : valores.casa === "senado" ? "SENADO" : undefined;
  const ranking = await getRankingCota({ ano, casa, categoria });
  const descricao = `${categoria ? `“${categoria}”` : "todos os gastos"} em ${ano}${
    casa ? ` · ${casa === "CAMARA" ? "Câmara" : "Senado"}` : ""
  }`;

  return (
    <section aria-labelledby="resultado" className="flex flex-col gap-4">
      <h2 id="resultado" className="text-xl font-bold" aria-live="polite">
        Ranking: {descricao}
      </h2>
      <p>
        <strong className="font-mono">{reaisDeCentavos(ranking.total)}</strong> em {ranking.lancamentos.toLocaleString("pt-BR")}{" "}
        reembolsos de {ranking.parlamentares} parlamentares. A tabela mostra os {Math.min(LIMITE_RANKING, ranking.linhas.length)} que
        mais gastaram.
      </p>
      {ranking.linhas.length > 0 && (
        <>
          <BaixarCsv href={linkRankingCota("/api/csv/ranking-cota", { ano, casa: valores.casa, categoria })} rotulo="Baixar o ranking" />
          <Tabela legenda={`Parlamentares que mais gastaram: ${descricao}`}>
            <THead>
              <Tr>
                <Th numero>Posição</Th>
                <Th>Parlamentar</Th>
                <Th numero>Reembolsos</Th>
                <Th numero>Total</Th>
              </Tr>
            </THead>
            <TBody>
              {ranking.linhas.map((l) => (
                <Tr key={`${l.casa}-${l.idExterno}`}>
                  <Td numero rotulo="Posição">
                    {l.posicao}º
                  </Td>
                  <Th scope="row" className="font-normal">
                    <Link href={linkParlamentar(l.casa, l.idExterno)} className="font-medium text-link underline">
                      {l.nome}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      {l.casa === "CAMARA" ? "Deputado(a)" : "Senador(a)"} · {l.partido ?? "sem partido"}
                      {l.uf && `/${l.uf}`}
                    </span>
                  </Th>
                  <Td numero rotulo="Reembolsos">
                    {l.lancamentos}
                  </Td>
                  <Td numero rotulo="Total">
                    {reaisDeCentavos(l.total)}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Tabela>
        </>
      )}
      <details className="rounded-lg border bg-card px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium">Como calculamos</summary>
        <div className="mt-2 flex max-w-[75ch] flex-col gap-2 text-muted-foreground">
          <p>
            Somamos os valores reembolsados de cada parlamentar no ano, com os dados da Câmara (CEAP) e do Senado (CEAPS)
            carregados no portal. Cada casa usa nomes próprios para os tipos de gasto, por isso as categorias aparecem
            separadas no filtro.
          </p>
          <p>
            Gastar muito não é, sozinho, irregular: quem mora longe de Brasília gasta mais com passagens, por exemplo. O
            ranking serve para saber onde olhar com mais atenção.
          </p>
        </div>
      </details>
    </section>
  );
}
