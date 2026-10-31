import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  BookOpenIcon,
  BuildingIcon,
  ChartNoAxesColumnIcon,
  DownloadIcon,
  GitCompareArrowsIcon,
  LandmarkIcon,
  MapIcon,
  PinIcon,
  ScrollTextIcon,
  Share2Icon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";

import { FundoGrade, HeroFundo } from "@/components/hero-fundo";
import { Termo } from "@/components/termo";
import { Card, CardContent } from "@/components/ui/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { metadados } from "@/lib/metadados";

export const metadata = metadados({ titulo: "Jabuti · Acompanhe e cobre os políticos com dados públicos" });

const stagger = (i: number) => ({ "--stagger": i }) as React.CSSProperties;

type Secao = "parlamentares" | "cidades" | "orcamento" | "empresas" | "glossario";

// Cada área do portal com as páginas que ela oferece; a cor vem de data-secao (ver "Cores das seções" no DESIGN.md).
const AREAS: {
  secao: Secao;
  titulo: string;
  pergunta: string;
  paginas: { href: string; titulo: string; descricao: React.ReactNode; icon: typeof UsersIcon }[];
}[] = [
  {
    secao: "parlamentares",
    titulo: "Parlamentares",
    pergunta: "O que o seu deputado ou senador anda fazendo?",
    paginas: [
      {
        href: "/parlamentares",
        titulo: "Perfil de cada parlamentar",
        descricao: (
          <>
            <Termo id="presenca">Presença</Termo> no plenário, como votou, gastos da{" "}
            <Termo id="cota-parlamentar">cota</Termo>, <Termo id="proposicao">proposições</Termo>,{" "}
            <Termo id="emenda">emendas</Termo> e o dinheiro da campanha.
          </>
        ),
        icon: UsersIcon,
      },
      {
        href: "/comparar",
        titulo: "Comparar parlamentares",
        descricao: "Dois nomes lado a lado, com quantas vezes votaram igual.",
        icon: GitCompareArrowsIcon,
      },
      {
        href: "/rankings/cota",
        titulo: "Ranking da cota",
        descricao: "Quem mais gastou da cota no ano, no total ou por tipo de gasto.",
        icon: ChartNoAxesColumnIcon,
      },
      {
        href: "/leis",
        titulo: "Leis e projetos",
        descricao: (
          <>
            As últimas leis e em que etapa está cada <Termo id="projeto-de-lei">projeto</Termo>: votação,{" "}
            <Termo id="sancao">sanção</Termo> ou publicação.
          </>
        ),
        icon: ScrollTextIcon,
      },
    ],
  },
  {
    secao: "cidades",
    titulo: "Estados e cidades",
    pergunta: "Quanto dinheiro chegou onde você mora?",
    paginas: [
      {
        href: "/estados",
        titulo: "Bancada e emendas de cada lugar",
        descricao: (
          <>
            Quem representa cada estado, as emendas que cada cidade recebeu, quanto isso dá por habitante e
            as contas do município no <Termo id="siconfi">Siconfi</Termo>.
          </>
        ),
        icon: MapIcon,
      },
    ],
  },
  {
    secao: "orcamento",
    titulo: "Orçamento e emendas",
    pergunta: "Para onde vai o dinheiro do orçamento federal?",
    paginas: [
      {
        href: "/orcamento",
        titulo: "Emendas no orçamento",
        descricao: (
          <>
            Emendas por ano, autor e destino, inclusive as <Termo id="emenda-pix">emendas Pix</Termo> e quem
            executa o dinheiro.
          </>
        ),
        icon: LandmarkIcon,
      },
      {
        href: "/orcamento/loa",
        titulo: "Lei Orçamentária Anual",
        descricao: "O orçamento aprovado para o ano, dividido pelas áreas do governo.",
        icon: LandmarkIcon,
      },
    ],
  },
  {
    secao: "empresas",
    titulo: "Empresas",
    pergunta: "Essa empresa pode fazer negócio com o governo?",
    paginas: [
      {
        href: "/empresas",
        titulo: "Consulta por CNPJ",
        descricao: (
          <>
            Cadastro, contratos com o governo federal e sanções no <Termo id="ceis">CEIS</Termo>, no{" "}
            <Termo id="cnep">CNEP</Termo> e no <Termo id="tcu">TCU</Termo>.
          </>
        ),
        icon: BuildingIcon,
      },
    ],
  },
  {
    secao: "glossario",
    titulo: "Glossário",
    pergunta: "Não entendeu uma palavra?",
    paginas: [
      {
        href: "/glossario",
        titulo: "Entenda os termos",
        descricao: "Orçamento, Congresso, eleições e fiscalização explicados em linguagem simples.",
        icon: BookOpenIcon,
      },
    ],
  },
];

const RECURSOS = [
  {
    icon: DownloadIcon,
    titulo: "Baixe os dados",
    descricao: (
      <>
        Votos, gastos da cota, ranking e emendas de cada cidade saem em <Termo id="csv">CSV</Termo>, prontos para
        abrir numa planilha.
      </>
    ),
  },
  {
    icon: Share2Icon,
    titulo: "Compartilhe",
    descricao: "Cada página tem um link e uma imagem próprios para mandar no WhatsApp ou nas redes.",
  },
  {
    icon: PinIcon,
    titulo: "Fixe quem você acompanha",
    descricao:
      "Com login Google, opcional, os parlamentares, partidos e bancadas que você escolher viram atalhos e filtros.",
  },
] as const;

const FONTES = [
  ["Portal da Transparência (CGU)", "emendas, empresas, contratos e sanções"],
  ["Câmara dos Deputados e Senado Federal", "parlamentares, votações, presença, despesas e proposições"],
  ["TSE", "candidaturas, bens declarados, receitas de campanha e votos por cidade"],
  ["Transferegov", "emendas Pix e planos de ação"],
  ["Siconfi, do Tesouro Nacional", "contas de estados e municípios"],
  ["TCU", "quem está inabilitado ou declarado inidôneo"],
  ["IBGE", "municípios e população"],
] as const;

export default function Inicio() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 xs:px-6 py-[clamp(1rem,3vw,2rem)]">
      {/* A página inteira fica no bloco charcoal do hero (tokens escuros via .dark nos dois temas), com a grade de fundo do começo ao fim. */}
      <div className="dark relative isolate flex flex-col gap-[clamp(3rem,6vw,5rem)] overflow-hidden rounded-2xl bg-card px-5 pb-[clamp(3rem,6vw,5rem)] text-foreground ring-1 ring-border md:px-[clamp(2rem,4vw,3.5rem)]">
        <FundoGrade />
        <section
          aria-labelledby="titulo"
          className="relative isolate flex flex-col items-center justify-center gap-8 py-[clamp(3.5rem,9vw,7rem)] text-center md:min-h-[calc(90dvh-6rem)]"
        >
          <HeroFundo grade={false} />
          <div className="flex flex-col items-center gap-5 animate-enter">
            <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">Jabuti</p>
            <h1 id="titulo" className="flex max-w-[18ch] flex-col text-[clamp(2.5rem,6vw,5.25rem)] leading-[0.95]">
              <span className="font-bold tracking-[-0.04em]">Jabuti não sobe em árvore</span>
              <span className="font-serif font-normal tracking-normal italic">se está lá, foi mão de gente</span>
            </h1>
            <p className="max-w-[56ch] text-lg text-muted-foreground">
              Veja o que deputados e senadores fazem com o seu voto e com o dinheiro público: emendas, gastos,
              presença, votações e campanhas, tudo com dados oficiais e explicado sem juridiquês.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 animate-enter sm:flex-row" style={stagger(1)}>
            <Link
              href="/parlamentares"
              className="group inline-flex items-center gap-3 rounded-full bg-foreground py-1.5 pr-1.5 pl-5 text-sm font-semibold text-background transition-transform duration-200 outline-none hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card motion-reduce:hover:scale-100"
            >
              Encontrar meu parlamentar
              <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-marca text-marca-foreground">
                <ArrowUpRightIcon className="size-4" />
              </span>
            </Link>
            <Link
              href="/estados"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium transition-transform duration-200 outline-none hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card motion-reduce:hover:scale-100"
            >
              <MapIcon aria-hidden="true" className="size-4" />
              Ver a minha cidade
            </Link>
          </div>
        </section>

        <section aria-labelledby="sobre" className="grid items-start gap-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <h2 data-revelar id="sobre" className="text-[clamp(1.75rem,3vw,2.25rem)] leading-tight font-bold animate-enter">
            Por que <span className="font-serif font-normal italic">Jabuti</span>
          </h2>
          <div data-revelar className="flex max-w-[68ch] flex-col gap-4 text-muted-foreground animate-enter" style={stagger(1)}>
            <p>
              Na política, <Termo id="jabuti">jabuti</Termo> é o trecho enfiado num projeto de lei que não tem nada a
              ver com ele. O portal existe para mostrar quem colocou cada coisa onde está.
            </p>
            <p>
              Os dados já são públicos, mas ficam espalhados por dezenas de sites do governo, cada um com seu
              formato e seu vocabulário. Aqui eles aparecem juntos, por parlamentar, por cidade e por empresa, e
              toda palavra técnica tem uma explicação a um clique.
            </p>
            <p>
              O projeto é aberto: o código é público para qualquer pessoa conferir de onde vem cada número,
              apontar erros e ajudar a melhorar.
            </p>
          </div>
        </section>

        <section aria-labelledby="funcionalidades" className="flex flex-col gap-8">
          <div data-revelar className="flex flex-col gap-3 animate-enter">
            <h2 id="funcionalidades" className="text-[clamp(1.75rem,3vw,2.25rem)] leading-tight font-bold">
              O que dá para <span className="font-serif font-normal italic">consultar</span>
            </h2>
            <p className="max-w-[60ch] text-muted-foreground">
              Cada área responde a uma pergunta. Comece pela que mais importa para você.
            </p>
          </div>

          <ul className="flex flex-col gap-4">
            {AREAS.map((area, i) => (
              <li
                key={area.secao}
                data-revelar
                data-secao={area.secao}
                className="grid gap-4 rounded-lg border border-l-4 border-l-secao bg-card/80 p-5 backdrop-blur-sm shadow-soft animate-enter md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-8 md:p-6"
                style={stagger(i + 1)}
              >
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-medium tracking-wide text-secao uppercase">{area.titulo}</h3>
                  <p className="text-xl leading-snug font-bold">{area.pergunta}</p>
                </div>
                <ItemGroup className="gap-2">
                  {area.paginas.map(({ href, titulo, descricao, icon: Icon }) => (
                    <Item key={href} variant="outline" className="items-start">
                      <ItemMedia variant="icon" className="size-10 rounded-lg bg-secao-suave text-secao">
                        <Icon aria-hidden="true" />
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle>
                          <Link
                            href={href}
                            className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            {titulo}
                          </Link>
                        </ItemTitle>
                        <ItemDescription className="line-clamp-none">{descricao}</ItemDescription>
                      </ItemContent>
                      <ItemActions aria-hidden="true" className="self-center text-muted-foreground">
                        <ArrowRightIcon className="size-4" />
                      </ItemActions>
                    </Item>
                  ))}
                </ItemGroup>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="recursos" className="grid items-start gap-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <Card data-revelar className="bg-card/80 backdrop-blur-sm animate-enter md:order-last">
            <CardContent>
              <h2 id="recursos" className="mb-4 text-xl font-bold">
                Em todas as páginas
              </h2>
              <ItemGroup className="gap-1">
                {RECURSOS.map(({ icon: Icon, titulo, descricao }) => (
                  <Item key={titulo}>
                    <ItemMedia variant="icon" className="size-10 rounded-lg bg-muted text-foreground">
                      <Icon aria-hidden="true" />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{titulo}</ItemTitle>
                      <ItemDescription className="line-clamp-none">{descricao}</ItemDescription>
                    </ItemContent>
                  </Item>
                ))}
              </ItemGroup>
            </CardContent>
          </Card>

          <div data-revelar className="flex flex-col gap-4 animate-enter" style={stagger(1)}>
            <h2 id="dados" className="text-[clamp(1.75rem,3vw,2.25rem)] leading-tight font-bold">
              De onde vêm os <span className="font-serif font-normal italic">dados</span>
            </h2>
            <p className="max-w-[60ch] text-muted-foreground">
              Só fontes oficiais. Sempre que dá, o portal consulta a API do próprio órgão na hora; o banco guarda só o
              que ela não oferece, como rankings e cruzamentos entre fontes.
            </p>
            <dl className="grid gap-3 sm:grid-cols-2">
              {FONTES.map(([nome, oQue]) => (
                <div key={nome} className="flex flex-col gap-0.5 border-t pt-3">
                  <dt className="font-medium">{nome}</dt>
                  <dd className="text-sm text-muted-foreground">{oQue}</dd>
                </div>
              ))}
            </dl>
            <p className="text-sm text-muted-foreground">
              Achou um número estranho ou quer ajudar?{" "}
              <a
                href="https://github.com/N7thz/jabuti"
                className="font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                O código está no GitHub
              </a>
              , sob a licença AGPL-3.0.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
