import { ArrowLeftIcon, ShieldAlertIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { SituacaoPix, SobreEmendasPix } from "@/components/emendas-pix/tabela-pix";
import { reaisDeCentavos } from "@/components/emendas/valores";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Termo } from "@/components/termo";
import { Skeleton } from "@/components/ui/skeleton";
import { getMunicipioPorNome } from "@/lib/emendas/queries";
import { formatarData } from "@/lib/format/datas";
import { municipioDoBeneficiario } from "@/lib/transferegov/beneficiario";
import { getEmendaPix, getExecucaoEmendaPix } from "@/lib/transferegov/queries";
import { areasDaEmendaPix, situacaoPlanoTrabalho } from "@/lib/transferegov/rotulos";
import type { IdTermo } from "@/lib/glossario";
import { isUf } from "@/lib/ufs";

const idDaUrl = async (params: PageProps<"/emendas-pix/[id]">["params"]) => {
  const { id } = await params;
  return /^\d{1,10}$/.test(id) ? Number(id) : null;
};

export async function generateMetadata({ params }: PageProps<"/emendas-pix/[id]">): Promise<Metadata> {
  const id = await idDaUrl(params);
  const emenda = id ? await getEmendaPix(id) : null;
  return {
    title: emenda
      ? `Emenda Pix de ${emenda.autor} para ${emenda.beneficiario} · Jabuti`
      : "Emenda Pix · Jabuti",
  };
}

export default function EmendaPixPage({ params }: PageProps<"/emendas-pix/[id]">) {
  return (
    <div data-secao="orcamento" className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 xs:px-6 py-[clamp(2rem,5vw,4rem)]">
      <Suspense
        fallback={
          <div role="status" aria-label="Carregando emenda" className="flex flex-col gap-4">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-14 w-96 max-w-full" />
            <Skeleton className="h-32" />
            <Skeleton className="h-64" />
          </div>
        }
      >
        {idDaUrl(params).then((id) => (
          <EmendaPix id={id} />
        ))}
      </Suspense>
    </div>
  );
}

async function EmendaPix({ id }: { id: number | null }) {
  const emenda = id ? await getEmendaPix(id) : null;
  if (!emenda) notFound();

  const nomeMunicipio = municipioDoBeneficiario(emenda.beneficiario);
  const [execucao, municipio] = await Promise.all([
    getExecucaoEmendaPix(emenda.id),
    nomeMunicipio && isUf(emenda.uf) ? getMunicipioPorNome(emenda.uf, nomeMunicipio) : null,
  ]);
  const declarada = execucao.execucaoDeclarada;

  const valores: [string, IdTermo | null, number | null, React.ReactNode][] = [
    [
      "Valor da emenda",
      null,
      emenda.total,
      <>
        {reaisDeCentavos(emenda.custeio)} para custeio e {reaisDeCentavos(emenda.investimento)} para investimento (
        <Termo id="custeio-investimento">qual a diferença?</Termo>).
      </>,
    ],
    ["Empenhado", "empenho", execucao.empenhado, "Reservado no orçamento federal para o repasse."],
    [
      "Executado (declarado)",
      "plano-de-trabalho",
      declarada?.executado ?? null,
      declarada
        ? `Informado por quem recebeu em ${formatarData(declarada.data)}; faltam ${reaisDeCentavos(declarada.pendente)}.`
        : "Quem recebeu ainda não enviou relatório de gestão.",
    ],
  ];

  return (
    <>
      {municipio && (
        <Link
          href={`/estados/${municipio.uf}/${municipio.ibge}`}
          className="inline-flex h-10 w-fit items-center gap-2 rounded-lg text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          {municipio.nome} ({municipio.uf})
        </Link>
      )}

      <header className="flex flex-col gap-3 animate-enter">
        <p className="text-sm font-medium tracking-wide text-secao uppercase">Emenda Pix · {emenda.ano}</p>
        <h1 className="text-[clamp(2rem,4vw,3rem)] leading-tight font-bold">{emenda.beneficiario}</h1>
        <p className="flex flex-wrap items-center gap-2 text-lg text-muted-foreground">
          De {emenda.autor} · <span className="font-mono text-base">Emenda {emenda.codigoEmenda}</span>
          <SituacaoPix situacao={emenda.situacao} />
        </p>
        <SobreEmendasPix />
      </header>

      {emenda.impedimento && (
        <Alert variant="destructive">
          <ShieldAlertIcon aria-hidden="true" />
          <AlertTitle>Repasse impedido</AlertTitle>
          <AlertDescription>{emenda.impedimento}</AlertDescription>
        </Alert>
      )}

      <section aria-label="Valores" className="@container">
        <dl className="grid gap-3 @2xl:grid-cols-3">
          {valores.map(([titulo, termo, valor, explicacao]) => (
            <div key={titulo} className="@container flex flex-col gap-1 rounded-lg border bg-card p-4 shadow-soft">
              <dt className="text-sm font-medium text-muted-foreground">{termo ? <Termo id={termo}>{titulo}</Termo> : titulo}</dt>
              <dd className="font-mono text-xl font-bold tabular-nums [overflow-wrap:anywhere] @2xs:text-2xl">
                {valor === null ? "—" : reaisDeCentavos(valor)}
              </dd>
              <dd className="text-sm text-muted-foreground">{explicacao}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="destino" className="flex flex-col gap-4">
        <h2 id="destino" className="text-xl font-bold">
          Em que o dinheiro deve ser usado
        </h2>
        {areasDaEmendaPix(emenda.areas).length > 0 && (
          <p>
            <span className="text-muted-foreground"><Termo id="funcao-governo">Áreas</Termo>: </span>
            {areasDaEmendaPix(emenda.areas).join(", ")}
          </p>
        )}
        {execucao.planoTrabalho && (
          <p>
            <span className="text-muted-foreground"><Termo id="plano-de-trabalho">Plano de trabalho</Termo>: </span>
            {situacaoPlanoTrabalho(execucao.planoTrabalho.situacao)}
            {execucao.planoTrabalho.inicio && (
              <>
                {" "}
                · execução de {formatarData(execucao.planoTrabalho.inicio)} a {formatarData(execucao.planoTrabalho.fim)}
              </>
            )}
          </p>
        )}

        {execucao.executores.length === 0 ? (
          <p className="rounded-lg border bg-card p-4 text-muted-foreground">
            Quem recebeu ainda não informou quem vai executar (o <Termo id="executor">executor</Termo>) nem o objeto do
            gasto.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {execucao.executores.map((executor) => (
              <Card key={executor.cnpj}>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">{executor.nome}</CardTitle>
                  <CardDescription>
                    {reaisDeCentavos(executor.total)} · CNPJ <span className="font-mono">{executor.cnpj}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {executor.objeto && <p>{executor.objeto}</p>}
                  {executor.metas.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <h3 className="text-sm font-semibold">Metas</h3>
                      <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
                        {executor.metas.map((meta, i) => (
                          <li key={i}>
                            {meta.nome}
                            {meta.quantidade != null && meta.unidade && (
                              <span className="text-muted-foreground">
                                {" "}
                                ({meta.quantidade.toLocaleString("pt-BR")} {meta.unidade.toLowerCase()})
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <p className="text-sm text-muted-foreground">
        Fonte: Transferegov, módulo de Transferências Especiais (plano de ação {emenda.codigo}). Os valores executados são
        declarados por quem recebeu o dinheiro.
      </p>
    </>
  );
}
