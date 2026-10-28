import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PixMunicipio, PixSkeleton } from "@/components/emendas-pix/pix-municipio";
import { SobreOsDados } from "@/components/emendas/emendas-estado";
import { ContasEnte, ContasEnteSkeleton } from "@/components/fiscalizacao/contas-ente";
import { SeletorAno } from "@/components/emendas/seletor-ano";
import { Tabela, TBody, Td, Th, THead, Tr } from "@/components/emendas/tabela";
import { reaisDeCentavos, ResumoValores } from "@/components/emendas/valores";
import { TipoEmenda } from "@/components/emendas/tipo-emenda";
import { Termo } from "@/components/termo";
import { Skeleton } from "@/components/ui/skeleton";
import { linkAno } from "@/lib/filtros/formularios";
import { getAnosEmendas, getEmendasMunicipio, getMunicipio, getUltimaSyncEmendas } from "@/lib/emendas/queries";
import { anoEscolhido } from "@/lib/emendas/rotulos";
import { isUf, UFS } from "@/lib/ufs";

async function municipioDaUrl(params: PageProps<"/estados/[uf]/[ibge]">["params"]) {
  const { uf, ibge } = await params;
  const codigo = Number(ibge);
  if (!isUf(uf) || !/^\d{7}$/.test(ibge)) return null;
  return getMunicipio(uf, codigo);
}

export async function generateMetadata({ params }: PageProps<"/estados/[uf]/[ibge]">): Promise<Metadata> {
  const municipio = await municipioDaUrl(params);
  return {
    title: municipio
      ? `Emendas para ${municipio.nome} (${municipio.uf}) · Jabuti`
      : "Cidade · Jabuti",
  };
}

export default function CidadePage({ params, searchParams }: PageProps<"/estados/[uf]/[ibge]">) {
  return (
    <div data-secao="cidades" className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 xs:px-6 py-[clamp(2rem,5vw,4rem)]">
      <Suspense
        fallback={
          <div role="status" aria-label="Carregando emendas da cidade" className="flex flex-col gap-4">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-14 w-96 max-w-full" />
            <Skeleton className="h-32" />
            <Skeleton className="h-96" />
          </div>
        }
      >
        {searchParams.then(({ ano }) => (
          <Cidade params={params} anoUrl={ano} />
        ))}
      </Suspense>
    </div>
  );
}

async function Cidade({
  params,
  anoUrl,
}: {
  params: PageProps<"/estados/[uf]/[ibge]">["params"];
  anoUrl?: string | string[];
}) {
  const municipio = await municipioDaUrl(params);
  if (!municipio) notFound();

  const anos = await getAnosEmendas();
  const ano = anoEscolhido(anoUrl, anos);
  const [dados, atualizadoEm] = await Promise.all([
    ano ? getEmendasMunicipio(municipio.ibge, ano) : null,
    getUltimaSyncEmendas(),
  ]);

  return (
    <>
      <Link
        href={linkAno(`/estados/${municipio.uf}`, { ano })}
        className="inline-flex h-10 w-fit items-center gap-2 rounded-lg text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        {UFS[municipio.uf]}
      </Link>

      <header className="flex flex-col gap-3 animate-enter">
        <p className="text-sm font-medium tracking-wide text-secao uppercase">Emendas parlamentares</p>
        <h1 className="text-[clamp(2rem,4vw,3rem)] leading-tight font-bold">
          {municipio.nome} <span className="text-muted-foreground">({municipio.uf})</span>
        </h1>
        <p className="max-w-[65ch] text-lg text-muted-foreground">
          Quanto deputados e senadores destinaram em <Termo id="emenda">emendas</Termo> para a cidade e quanto desse
          dinheiro já foi <Termo id="pagamento">pago</Termo>.
        </p>
        {municipio.populacao && (
          <p className="text-sm text-muted-foreground">
            {municipio.populacao.toLocaleString("pt-BR")} habitantes (estimativa do IBGE para {municipio.populacaoAno})
          </p>
        )}
      </header>

      {!ano || !dados ? (
        <p className="text-muted-foreground">As emendas ainda não foram carregadas. Volte em breve.</p>
      ) : (
        <>
          <SeletorAno anos={anos} ano={ano} acao={`/estados/${municipio.uf}/${municipio.ibge}`} />
          <ResumoValores totais={dados.totais} quantidade={dados.quantidade} />
          {municipio.populacao && dados.totais.pago > 0 && (
            <p>
              Isso dá <strong className="font-mono">{reaisDeCentavos(Math.round(dados.totais.pago / municipio.populacao))}</strong>{" "}
              pagos por habitante em {ano}.
            </p>
          )}

          {dados.emendas.length === 0 ? (
            <p className="rounded-lg border bg-card p-4">
              Nenhuma emenda destinada diretamente a {municipio.nome} em {ano}. A cidade ainda pode receber recursos de
              emendas feitas para o estado ou para vários locais.
            </p>
          ) : (
            <section aria-labelledby="lista-emendas" className="flex flex-col gap-3">
              <h2 id="lista-emendas" className="text-xl font-bold">
                Emendas de {ano}
              </h2>
              <Tabela legenda={`Emendas de ${ano} para ${municipio.nome}, da maior para a menor em valor pago`}>
                <THead>
                  <Tr>
                    <Th>Autor</Th>
                    <Th>Área</Th>
                    <Th>Tipo</Th>
                    <Th numero>Empenhado</Th>
                    <Th numero>Liquidado</Th>
                    <Th numero>Pago</Th>
                  </Tr>
                </THead>
                <TBody>
                  {dados.emendas.map((e) => (
                    <Tr key={e.codigo}>
                      <Th scope="row" className="font-normal">
                        <span className="block font-medium">{e.autorNome}</span>
                        <span className="block font-mono text-xs text-muted-foreground">Emenda {e.codigoEmenda}</span>
                      </Th>
                      <Td rotulo="Área">
                        {e.funcao ?? "Não informada"}
                        {e.subfuncao && <span className="block text-xs text-muted-foreground">{e.subfuncao}</span>}
                      </Td>
                      <Td rotulo="Tipo">
                        <TipoEmenda tipo={e.tipo} />
                      </Td>
                      <Td numero rotulo="Empenhado">{reaisDeCentavos(e.totais.empenhado)}</Td>
                      <Td numero rotulo="Liquidado">{reaisDeCentavos(e.totais.liquidado)}</Td>
                      <Td numero rotulo="Pago">{reaisDeCentavos(e.totais.pago)}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Tabela>
            </section>
          )}

          {/* Fontes ao vivo (Transferegov e Tesouro): cada uma carrega no seu tempo sem segurar a página. */}
          <Suspense fallback={<PixSkeleton />}>
            <PixMunicipio municipio={municipio} ano={ano} />
          </Suspense>
          <Suspense fallback={<ContasEnteSkeleton />}>
            <ContasEnte
              idEnte={municipio.ibge}
              nome={municipio.nome}
              ano={ano}
              emendasPagas={{ ano, valor: dados.totais.pago }}
            />
          </Suspense>
        </>
      )}

      <SobreOsDados atualizadoEm={atualizadoEm} />
    </>
  );
}
