import { ArrowLeftIcon } from "lucide-react";
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
import { metadados } from "@/lib/metadados";

export const metadata = metadados({
  titulo: "Orçamento federal (LOA) · Jabuti",
  descricao: "Quanto a Lei Orçamentária Anual autorizou o governo federal a gastar, em cada área, e quanto já foi executado.",
});

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

      <section aria-labelledby="como-funciona" className="flex flex-col gap-3">
        <h2 id="como-funciona" className="text-xl font-bold">
          Como o dinheiro sai do orçamento
        </h2>
        <ol className="flex max-w-[75ch] list-decimal flex-col gap-3 pl-6 marker:font-bold marker:text-secao">
          <li>
            <strong>Regras do ano.</strong> A <Termo id="ldo">Lei de Diretrizes Orçamentárias (LDO)</Termo> define as
            metas e as prioridades do ano seguinte. O <Termo id="arcabouco-fiscal">arcabouço fiscal</Termo> põe um limite
            para o crescimento do gasto total.
          </li>
          <li>
            <strong>A lei do orçamento.</strong> O governo manda a proposta da LOA até 31 de agosto. O Congresso muda o
            texto, inclusive com as <Termo id="emenda">emendas parlamentares</Termo>, e aprova. Depois o presidente
            sanciona a lei.
          </li>
          <li>
            <strong>Ajustes durante o ano.</strong> A <Termo id="dotacao">dotação</Termo> pode subir ou descer com novas
            leis e decretos. Se a arrecadação ficar abaixo do previsto, o governo faz um{" "}
            <Termo id="contingenciamento">contingenciamento</Termo> e segura parte do gasto.
          </li>
          <li>
            <strong>Três etapas para cada real.</strong> Primeiro vem o <Termo id="empenho">empenho</Termo>, que reserva o
            dinheiro para um contrato ou uma compra. Depois vem a <Termo id="liquidacao">liquidação</Termo>, quando o
            governo confere a entrega. Por fim vem o <Termo id="pagamento">pagamento</Termo>, quando o dinheiro sai do
            cofre.
          </li>
          <li>
            <strong>Virada do ano.</strong> O que foi empenhado e ainda não foi pago vira &ldquo;restos a pagar&rdquo;.
            Essa dívida passa para o ano seguinte e por isso parte do que se paga em um ano vem do orçamento anterior.
          </li>
        </ol>
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

      <Pisos loa={loa} />

      <p className="text-sm text-muted-foreground">
        Fonte: Relatório Resumido da Execução Orçamentária da União ({mesesDoBimestre(loa.bimestre)} de {loa.ano}), no
        SICONFI do Tesouro Nacional. Valores sem as operações entre órgãos do próprio governo (intraorçamentárias).
      </p>
    </>
  );
}

type DadosLoa = NonNullable<Awaited<ReturnType<typeof getLoaUniao>>>;

/** Pisos da Constituição para a União. Só o da saúde tem base (a RCL) nos dados abertos do SICONFI. */
function Pisos({ loa }: { loa: DadosLoa }) {
  const saude = loa.funcoes.find((f) => f.funcao === "Saúde");
  const educacao = loa.funcoes.find((f) => f.funcao === "Educação");
  const pisoSaude = Math.round(loa.rcl.prevista * 0.15);

  return (
    <section aria-labelledby="pisos" className="flex flex-col gap-3">
      <h2 id="pisos" className="text-xl font-bold">
        <Termo id="piso-constitucional">Pisos constitucionais</Termo>
      </h2>
      <p className="max-w-[75ch] text-muted-foreground">
        A Constituição obriga o governo federal a gastar um valor mínimo em algumas áreas, calculado sobre o que ele
        arrecada. De 2018 a 2023, com o teto de gastos, esses mínimos ficaram congelados e só eram corrigidos pela
        inflação. Desde 2024 eles voltaram a seguir as porcentagens abaixo.
      </p>
      <ul className="grid gap-3 lg:grid-cols-2">
        <li className="flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-soft">
          <h3 className="font-bold">Saúde: 15% da receita corrente líquida</h3>
          <p className="text-sm text-muted-foreground">Constituição, art. 198, § 2º</p>
          {loa.rcl.prevista > 0 && (
            <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[auto_1fr]">
              <dt className="text-sm text-muted-foreground">
                <Termo id="receita-corrente-liquida">Receita corrente líquida</Termo> prevista
              </dt>
              <dd className="font-mono tabular-nums">{reaisDeCentavos(loa.rcl.prevista)}</dd>
              <dt className="text-sm text-muted-foreground">Mínimo para a saúde (15%)</dt>
              <dd className="font-mono font-bold tabular-nums">{reaisDeCentavos(pisoSaude)}</dd>
              {saude && (
                <>
                  <dt className="text-sm text-muted-foreground">Autorizado na área Saúde</dt>
                  <dd className="font-mono tabular-nums">{reaisDeCentavos(saude.atualizada)}</dd>
                  <dt className="text-sm text-muted-foreground">Empenhado até agora</dt>
                  <dd className="font-mono tabular-nums">
                    {reaisDeCentavos(saude.empenhado)}{" "}
                    <span className="font-sans text-sm text-muted-foreground">({parte(saude.empenhado, pisoSaude)} do mínimo)</span>
                  </dd>
                </>
              )}
            </dl>
          )}
          <p className="text-sm">
            O piso é cumprido pelo valor empenhado até dezembro. A conta oficial segue a Lei Complementar 141/2012, que
            define o que vale como gasto em saúde, então a área Saúde da tabela é só uma aproximação.
          </p>
        </li>
        <li className="flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-soft">
          <h3 className="font-bold">Educação: 18% da receita de impostos</h3>
          <p className="text-sm text-muted-foreground">Constituição, art. 212</p>
          <p>
            A União deve aplicar ao menos 18% do que arrecada com impostos na manutenção e no desenvolvimento do ensino.
            A conta usa o que sobra depois dos repasses obrigatórios a estados e municípios.
          </p>
          {educacao && (
            <p className="text-sm">
              Para {loa.ano}, a área Educação tem <strong className="font-mono">{reaisDeCentavos(educacao.atualizada)}</strong>{" "}
              autorizados. O cálculo oficial do piso não está nos dados abertos do SICONFI. Ele sai no relatório
              bimestral completo do Tesouro.
            </p>
          )}
        </li>
        <li className="flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-soft">
          <h3 className="font-bold">Fundeb: complemento da União</h3>
          <p className="text-sm text-muted-foreground">Constituição, art. 212-A</p>
          <p>
            Estados e municípios formam um fundo para pagar a educação básica. A União completa esse fundo com dinheiro
            próprio. Desde 2026 o complemento é de pelo menos 23% do total que estados e municípios colocam nele.
          </p>
        </li>
        <li className="flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-soft">
          <h3 className="font-bold">Emendas que o governo é obrigado a pagar</h3>
          <p className="text-sm text-muted-foreground">Constituição, art. 166, §§ 9º a 12</p>
          <p>
            As <Termo id="emenda-individual">emendas individuais</Termo> somam 2% da receita corrente líquida do ano
            anterior, e metade delas tem que ir para a saúde. As <Termo id="emenda-bancada">emendas de bancada</Termo>{" "}
            somam 1%. O governo só pode deixar de pagar por impedimento técnico ou em um contingenciamento, e na mesma
            proporção do resto do orçamento.
          </p>
        </li>
      </ul>
    </section>
  );
}
