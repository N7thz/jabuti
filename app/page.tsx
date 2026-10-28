import {
  ArrowUpRightIcon,
  BuildingIcon,
  FileTextIcon,
  RotateCcwIcon,
  SearchXIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { BuscaCnpj } from "@/components/form/busca-cnpj";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Termo } from "@/components/termo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { mascaraCnpj } from "@/lib/filtros/mascaras";
import { buscaCnpjSchema } from "@/lib/filtros/formularios";
import { lerFiltros } from "@/lib/filtros/schemas";
import { formatarData } from "@/lib/format/datas";
import { formatarReais, reais } from "@/lib/format/dinheiro";
import { getInidoneidadesTcu } from "@/lib/tcu/queries";
import { cn } from "@/lib/utils";
import {
  getContratosPorFornecedor,
  getPessoaJuridica,
  getSancoesCeis,
  getSancoesCnep,
} from "@/lib/transparencia/queries";

const stagger = (i: number) => ({ "--stagger": i }) as React.CSSProperties;

const INDICADORES = [
  ["possuiContratacao", "Possui contratos"],
  ["participanteLicitacao", "Participou de licitações"],
  ["favorecidoDespesas", "Favorecido em despesas"],
  ["convenios", "Possui convênios"],
  ["favorecidoTransferencias", "Recebeu transferências"],
  ["beneficiadoRenunciaFiscal", "Beneficiado por renúncia fiscal"],
  ["sancionadoCEIS", "Sancionado no CEIS"],
  ["sancionadoCNEP", "Sancionado no CNEP"],
  ["sancionadoCEPIM", "Sancionado no CEPIM"],
] as const;

const FONTES = [
  {
    icon: BuildingIcon,
    title: "Cadastro",
    description: "Razão social e vínculos da empresa com o governo federal.",
    tone: "bg-primary text-primary-foreground",
  },
  {
    icon: ShieldAlertIcon,
    title: "Sanções",
    description: "Registros no CEIS e no CNEP, com órgão sancionador e período.",
    tone: "bg-accent text-accent-foreground",
  },
  {
    icon: FileTextIcon,
    title: "Contratos",
    description: "Contratos com o Poder Executivo Federal, objeto, vigência e valor.",
    tone: "bg-success text-success-foreground",
  },
] as const;

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <div data-secao="empresas" className="mx-auto flex w-full max-w-7xl flex-col gap-[clamp(3rem,6vw,5rem)] px-4 xs:px-6 py-[clamp(2.5rem,6vw,5rem)]">
      {/* Hero do Logoisum sem vídeo: bloco charcoal (tokens escuros via .dark nos dois temas) com SVG estático. */}
      <section
        aria-labelledby="titulo"
        className="dark relative isolate flex flex-col items-center justify-center gap-8 overflow-hidden rounded-2xl bg-card px-5 py-[clamp(3.5rem,9vw,7rem)] text-center text-foreground ring-1 ring-border md:min-h-[calc(90dvh-6rem)]"
      >
        <HeroFundo />
        <div className="flex flex-col items-center gap-5 animate-enter">
          <p className="text-sm font-medium tracking-wide text-secao uppercase">Consulta por CNPJ</p>
          <h1 id="titulo" className="flex max-w-[18ch] flex-col text-[clamp(2.5rem,6vw,5.25rem)] leading-[0.95]">
            <span className="font-bold tracking-[-0.04em]">Quem é a empresa</span>
            <span className="font-serif font-normal tracking-normal italic">e como ela se relaciona com o governo</span>
          </h1>
          <p className="max-w-[52ch] text-lg text-muted-foreground">
            Digite um CNPJ para ver o cadastro, as sanções e os contratos registrados no Portal
            da Transparência.
          </p>
        </div>
        <div className="w-full max-w-xl text-left animate-enter" style={stagger(1)}>
          <Suspense fallback={<BuscaCnpj />}>
            <SearchFromParams searchParams={searchParams} />
          </Suspense>
        </div>
        <Link
          href="/estados"
          className="group inline-flex items-center gap-3 rounded-full bg-accent py-1.5 pr-1.5 pl-5 text-sm font-medium transition-transform duration-200 outline-none animate-enter hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card motion-reduce:hover:scale-100"
          style={stagger(2)}
        >
          Ver emendas por estado
          <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">
            <ArrowUpRightIcon className="size-4" />
          </span>
        </Link>
      </section>

      <section
        aria-labelledby="fontes"
        className="grid items-start gap-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"
      >
        <div className="flex flex-col gap-3 animate-enter">
          <h2 id="fontes" className="text-[clamp(1.75rem,3vw,2.25rem)] leading-tight font-bold">
            O que a consulta <span className="font-serif font-normal italic">mostra</span>
          </h2>
          <p className="max-w-[48ch] text-muted-foreground">
            Três bases do governo federal, cruzadas pelo CNPJ.
          </p>
        </div>

        <Card className="animate-enter" style={stagger(1)}>
          <CardContent>
            <ItemGroup className="gap-1">
              {FONTES.map(({ icon: Icon, title, description, tone }, i) => (
                <Item key={title} className="animate-enter" style={stagger(i + 2)}>
                  <ItemMedia
                    variant="icon"
                    className={cn("size-10 rounded-lg", tone)}
                  >
                    <Icon aria-hidden="true" />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{title}</ItemTitle>
                    <ItemDescription>{description}</ItemDescription>
                  </ItemContent>
                </Item>
              ))}
            </ItemGroup>
          </CardContent>
        </Card>
      </section>

      <Suspense fallback={null}>
        <Resultado searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

/** Linhas de grade e círculos concêntricos no lugar do vídeo do original; só decoração. */
function HeroFundo() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 size-full text-border"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 1200 800"
    >
      <defs>
        <pattern id="hero-grade" width="80" height="80" patternUnits="userSpaceOnUse">
          <path d="M80 0H0V80" fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="1200" height="800" fill="url(#hero-grade)" opacity="0.5" />
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="600" cy="400" r="220" />
        <circle cx="600" cy="400" r="340" />
        <circle cx="600" cy="400" r="460" />
      </g>
    </svg>
  );
}

async function readCnpj(searchParams: PageProps<"/">["searchParams"]) {
  const params = await searchParams;
  const valor = typeof params.cnpj === "string" ? params.cnpj : "";
  if (!valor) return { valor, cnpj: null, erro: undefined };

  // Mesmo schema do formulário: sem JavaScript, a validação e a mensagem são as mesmas.
  const { valores, erros } = lerFiltros(buscaCnpjSchema, params);
  return { valor, cnpj: valores?.cnpj ?? null, erro: erros.cnpj };
}

async function SearchFromParams({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { valor, erro } = await readCnpj(searchParams);
  return <BuscaCnpj valor={valor} erroServidor={erro} />;
}

async function Resultado({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { cnpj } = await readCnpj(searchParams);
  if (!cnpj) return null;

  return (
    <Suspense key={cnpj} fallback={<EmpresaSkeleton />}>
      <Empresa cnpj={cnpj} />
    </Suspense>
  );
}

function EmpresaSkeleton() {
  return (
    <div role="status" aria-label="Carregando dados da empresa" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <Skeleton className="h-96" />
      <div className="flex flex-col gap-6">
        <Skeleton className="h-52" />
        <Skeleton className="h-24" />
      </div>
    </div>
  );
}

async function Empresa({ cnpj }: { cnpj: string }) {
  const [pj, ceis, cnep, tcu, contratos] = await Promise.all([
    getPessoaJuridica(cnpj),
    getSancoesCeis(cnpj),
    getSancoesCnep(cnpj),
    getInidoneidadesTcu(cnpj),
    getContratosPorFornecedor(cnpj),
  ]);

  if (!pj?.razaoSocial) {
    return (
      <Empty className="animate-enter rounded-lg border bg-card shadow-soft">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchXIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Nenhum registro encontrado</EmptyTitle>
          <EmptyDescription>Este CNPJ não aparece nas bases do Portal da Transparência.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" render={<Link href="/" />} nativeButton={false}>
            <RotateCcwIcon data-icon="inline-start" aria-hidden="true" />
            Nova consulta
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  const sancoes = [
    ...ceis.map((s) => ({ ...s, cadastro: "CEIS" })),
    ...cnep.map((s) => ({ ...s, cadastro: "CNEP" })),
  ];
  const totalSancoes = sancoes.length + tcu.length;

  return (
    <section aria-labelledby="empresa" className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <Card className="animate-enter lg:order-last lg:sticky lg:top-24">
        <CardHeader>
          <CardTitle id="empresa" className="text-xl font-bold">
            {pj.razaoSocial}
          </CardTitle>
          <CardDescription>
            {pj.nomeFantasia && <>{pj.nomeFantasia} · </>}
            <span className="font-mono">{mascaraCnpj(cnpj)}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <ul aria-label="Indicadores" className="flex flex-wrap gap-2">
            {INDICADORES.map(([key, label]) => (
              <li key={key}>
                <Badge
                  variant={!pj[key] ? "outline" : key.startsWith("sancionado") ? "destructive" : "success"}
                >
                  <span className="sr-only">{pj[key] ? "Sim: " : "Não: "}</span>
                  {label}
                </Badge>
              </li>
            ))}
          </ul>

          {totalSancoes === 0 ? (
            <Alert>
              <ShieldCheckIcon aria-hidden="true" />
              <AlertTitle>Nenhuma sanção</AlertTitle>
              <AlertDescription>
                Sem registros no <Termo id="ceis">CEIS</Termo>, no <Termo id="cnep">CNEP</Termo> nem na lista de{" "}
                <Termo id="inidoneidade">inidôneos</Termo> do <Termo id="tcu">TCU</Termo>.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <ShieldAlertIcon aria-hidden="true" />
              <AlertTitle>
                {totalSancoes} {totalSancoes === 1 ? "sanção encontrada" : "sanções encontradas"}
              </AlertTitle>
              <AlertDescription>
                <ul className="flex flex-col gap-1">
                  {sancoes.map((s) => (
                    <li key={`${s.cadastro}-${s.id}`}>
                      <strong>
                        <Termo id={s.cadastro === "CEIS" ? "ceis" : "cnep"}>{s.cadastro}</Termo>
                      </strong>{" "}
                      · {s.tipoSancao?.descricaoResumida} —{" "}
                      {s.orgaoSancionador?.nome} ({formatarData(s.dataInicioSancao)} a{" "}
                      {formatarData(s.dataFimSancao)})
                    </li>
                  ))}
                  {tcu.map((s) => (
                    <li key={`TCU-${s.processo}-${s.deliberacao}`}>
                      <strong>
                        <Termo id="tcu">TCU</Termo>
                      </strong>{" "}
                      · Declarada <Termo id="inidoneidade">inidônea</Termo> para licitar — processo{" "}
                      <span className="font-mono">{s.processo}</span> (até {formatarData(s.ate)})
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card className="animate-enter" style={stagger(1)}>
        <CardHeader>
          <CardTitle className="text-xl font-bold">Contratos recentes</CardTitle>
          <CardDescription>
            {contratos.length} {contratos.length === 1 ? "contrato" : "contratos"} com o Poder Executivo Federal
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contratos.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileTextIcon aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>Sem contratos</EmptyTitle>
                <EmptyDescription>Nenhum contrato com o Poder Executivo Federal.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ItemGroup className="gap-3">
              {contratos.map((c, i) => (
                <Item
                  key={c.id}
                  variant="outline"
                  className="animate-enter transition-shadow duration-200 hover:shadow-soft"
                  style={stagger(Math.min(i, 8) + 2)}
                >
                  <ItemContent>
                    <ItemTitle>{c.unidadeGestora?.orgaoVinculado?.nome}</ItemTitle>
                    <ItemDescription className="line-clamp-3">{c.objeto}</ItemDescription>
                    <ItemDescription>
                      Vigência: {formatarData(c.dataInicioVigencia)} a {formatarData(c.dataFimVigencia)}
                    </ItemDescription>
                  </ItemContent>
                  <Badge variant="secondary" className="self-start font-mono">
                    {formatarReais(reais(c.valorFinalCompra ?? c.valorInicialCompra ?? 0))}
                  </Badge>
                </Item>
              ))}
            </ItemGroup>
          )}
        </CardContent>
      </Card>
    </section>
  );
}


