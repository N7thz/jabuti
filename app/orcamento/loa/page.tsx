import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Tabela, TBody, Td, Th, THead, Tr } from "@/components/emendas/tabela";
import { reaisDeCentavos } from "@/components/emendas/valores";
import { Termo } from "@/components/termo";
import { Skeleton } from "@/components/ui/skeleton";
import { getTotaisEmendasAno } from "@/lib/emendas/queries";
import type { IdTermo } from "@/lib/glossario";
import { getLoaUniao } from "@/lib/siconfi/queries";
import { mesesDoBimestre } from "@/lib/siconfi/rreo";

export const metadata: Metadata = {
  title: "Orçamento federal (LOA) · Portal da Transparência",
  description: "Quanto a Lei Orçamentária Anual autorizou o governo federal a gastar, em cada área, e quanto já foi executado.",
};

const percentual = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 });
const parte = (valor: number, total: number) => (total > 0 ? percentual.format(valor / total) : "—");

// Áreas que não são gasto com serviço direto e confundem a comparação sem explicação.
const TERMO_DA_AREA: Record<string, IdTermo> = {
  "Encargos Especiais": "encargos-especiais",
  "Reserva de Contingência": "reserva-contingencia",
};

export default function LoaPage() {
  return (
    <div data-secao="orcamento" className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 xs:px-6 py-[clamp(2rem,5vw,4rem)]">
      <Link
        href="/orcamento"
        className="inline-flex h-10 w-fit items-center gap-2 rounded-lg text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        Emendas parlamentares
      </Link>
      <Suspense
        fallback={
          <div role="status" aria-label="Carregando o orçamento federal" className="flex flex-col gap-4">
            <Skeleton className="h-14 w-96 max-w-full" />
            <Skeleton className="h-32" />
            <Skeleton className="h-96" />
          </div>
        }
      >
        <Loa />
      </Suspense>
    </div>
  );
}

async function Loa() {
  const loa = await getLoaUniao();
  if (!loa) {
    return <p className="text-muted-foreground">O Tesouro Nacional ainda não publicou os relatórios do orçamento deste ano.</p>;
  }
  const emendas = await getTotaisEmendasAno(loa.ano);
  const ateQuando = loa.bimestre === 6 ? `o fim de ${loa.ano}` : `${mesesDoBimestre(loa.bimestre)} de ${loa.ano}`;

  const numeros: [string, IdTermo, number, React.ReactNode][] = [
    [
      "Autorizado para gastar",
      "dotacao",
      loa.despesaAutorizada,
      <>A LOA aprovou {reaisDeCentavos(loa.despesaInicial)}; o valor muda com os ajustes feitos durante o ano.</>,
    ],
    ["Já pago", "pagamento", loa.pago, <>{parte(loa.pago, loa.despesaAutorizada)} do autorizado, até {ateQuando}.</>],
    [
      "Já arrecadado",
      "receita",
      loa.receitaArrecadada,
      <>
        {parte(loa.receitaArrecadada, loa.receitaPrevista)} dos {reaisDeCentavos(loa.receitaPrevista)} previstos para o ano.
      </>,
    ],
  ];

  return (
    <>
      <header className="flex flex-col gap-3 animate-enter">
        <p className="text-sm font-medium tracking-wide text-secao uppercase">Orçamento federal · {loa.ano}</p>
        <h1 className="text-[clamp(2rem,4vw,3rem)] leading-tight font-bold">Quanto o governo federal pode gastar e onde</h1>
        <p className="max-w-[65ch] text-lg text-muted-foreground">
          A <Termo id="orcamento">Lei Orçamentária Anual (LOA)</Termo> diz quanto o governo pode gastar em cada área.
          Aqui está o que ela autorizou para {loa.ano} e quanto já saiu do papel.
        </p>
        <p className="text-sm text-muted-foreground">
          Dados até {ateQuando}, do <Termo id="rreo">relatório bimestral do Tesouro Nacional</Termo>.
        </p>
      </header>

      <section aria-label="Resumo do orçamento" className="@container flex flex-col gap-3">
        <dl className="grid gap-3 @2xl:grid-cols-3">
          {numeros.map(([titulo, termo, valor, explicacao]) => (
            <div key={titulo} className="@container flex flex-col gap-1 rounded-lg border bg-card p-4 shadow-soft">
              <dt className="text-sm font-medium text-muted-foreground">
                <Termo id={termo}>{titulo}</Termo>
              </dt>
              <dd className="font-mono text-xl font-bold tabular-nums [overflow-wrap:anywhere] @2xs:text-2xl">
                {reaisDeCentavos(valor)}
              </dd>
              <dd className="text-sm text-muted-foreground">{explicacao}</dd>
            </div>
          ))}
        </dl>
        <p className="max-w-[75ch]">
          Desse total autorizado, {reaisDeCentavos(loa.juros)} são para os juros da dívida. Fora dele, a LOA ainda prevê{" "}
          {reaisDeCentavos(loa.refinanciamento)} de <Termo id="refinanciamento-divida">refinanciamento da dívida</Termo>,
          que troca dívida antiga por nova e não é gasto com serviços.
        </p>
        {emendas.quantidade > 0 && (
          <p className="max-w-[75ch]">
            As <Link href="/orcamento" className="text-link underline underline-offset-4">emendas parlamentares</Link> de{" "}
            {loa.ano} somam <strong className="font-mono">{reaisDeCentavos(emendas.empenhado)}</strong> empenhados,{" "}
            {parte(emendas.empenhado, loa.despesaAutorizada)} do que o orçamento autoriza.
          </p>
        )}
      </section>

      <section aria-labelledby="areas" className="flex flex-col gap-3">
        <h2 id="areas" className="text-xl font-bold">
          Por <Termo id="funcao-governo">área</Termo>
        </h2>
        <p className="max-w-[75ch] text-muted-foreground">
          Da área com mais dinheiro autorizado para a com menos. A última coluna mostra quanto do autorizado já foi{" "}
          <Termo id="liquidacao">liquidado</Termo>, ou seja, entregue e reconhecido. Pouco antes do fim do ano, um valor
          baixo indica atraso.
        </p>
        <Tabela legenda={`Orçamento federal de ${loa.ano} por área, até ${ateQuando}`}>
          <THead>
            <Tr>
              <Th>Área</Th>
              <Th numero>Autorizado</Th>
              <Th numero>Empenhado</Th>
              <Th numero>Liquidado</Th>
              <Th numero>% liquidado</Th>
            </Tr>
          </THead>
          <TBody>
            {loa.funcoes.map((f) => (
              <Tr key={f.funcao}>
                <Th scope="row" className="font-normal">
                  {TERMO_DA_AREA[f.funcao] ? <Termo id={TERMO_DA_AREA[f.funcao]}>{f.funcao}</Termo> : f.funcao}
                  <span className="block text-xs text-muted-foreground">
                    {parte(f.atualizada, loa.despesaAutorizada)} do orçamento
                  </span>
                </Th>
                <Td numero rotulo="Autorizado">{reaisDeCentavos(f.atualizada)}</Td>
                <Td numero rotulo="Empenhado">{reaisDeCentavos(f.empenhado)}</Td>
                <Td numero rotulo="Liquidado">{reaisDeCentavos(f.liquidado)}</Td>
                <Td numero rotulo="% liquidado">{parte(f.liquidado, f.atualizada)}</Td>
              </Tr>
            ))}
          </TBody>
        </Tabela>
      </section>

      <p className="text-sm text-muted-foreground">
        Fonte: Relatório Resumido da Execução Orçamentária da União ({mesesDoBimestre(loa.bimestre)} de {loa.ano}), no
        SICONFI do Tesouro Nacional. Valores sem as operações entre órgãos do próprio governo (intraorçamentárias).
      </p>
    </>
  );
}
