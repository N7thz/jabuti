import {
  BugIcon,
  CodeIcon,
  DatabaseIcon,
  ExternalLinkIcon,
  GlobeIcon,
  HeartHandshakeIcon,
  MailIcon,
  ServerIcon,
  Share2Icon,
  TimerIcon,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { PainelPix } from "@/components/apoio/painel-pix";
import { svgDoQr } from "@/components/apoio/qr";
import { Compartilhar } from "@/components/compartilhar";
import { HeroFundo } from "@/components/hero-fundo";
import { buttonVariants } from "@/components/ui/button";
import { getApoiadores } from "@/lib/apoio/apoiadores";
import { apoioPublico, getApoio, temApoioFinanceiro } from "@/lib/apoio/config";
import { metadados } from "@/lib/metadados";
import { cn } from "@/lib/utils";

export const metadata = metadados({
  titulo: "Apoie o projeto · Jabuti",
  descricao: "O Jabuti é gratuito, sem anúncios e de código aberto. Veja como apoiar com Pix, apoio mensal ou ajudando a melhorar o portal.",
});

const stagger = (i: number) => ({ "--stagger": i }) as React.CSSProperties;

const CUSTOS = [
  { icon: ServerIcon, titulo: "Servidor", texto: "Onde o portal roda e consulta as fontes oficiais a cada visita." },
  { icon: DatabaseIcon, titulo: "Banco de dados", texto: "Guarda votações, rankings e históricos que as APIs públicas não oferecem prontos." },
  { icon: GlobeIcon, titulo: "Domínio", texto: "O endereço do site, renovado todo ano." },
  { icon: MailIcon, titulo: "Envio de emails", texto: "Confirmação de conta, recuperação de senha e as respostas às sugestões." },
  { icon: TimerIcon, titulo: "Tempo de desenvolvimento", texto: "Trazer dados novos, corrigir erros e manter tudo acessível." },
];

const ESTILO_LINK =
  "font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export default async function ApoiePage() {
  const apoio = getApoio();
  const publico = apoioPublico(apoio);
  const svgInicial = apoio.pix ? await svgDoQr(apoio.pix.copiaECola) : undefined;
  const financeiro = temApoioFinanceiro(apoio);

  return (
    <div data-secao="glossario" className="mx-auto flex w-full max-w-7xl flex-col gap-[clamp(2.5rem,5vw,4rem)] px-4 xs:px-6 py-[clamp(2rem,5vw,4rem)]">
      {/* Mesmo hero da Ajuda e da Consulta CNPJ. */}
      <section
        aria-labelledby="titulo"
        className="relative isolate flex flex-col items-center justify-center gap-8 overflow-hidden rounded-2xl bg-muted dark:bg-card px-5 py-[clamp(3.5rem,9vw,7rem)] text-center text-foreground ring-1 ring-border"
      >
        <HeroFundo />
        <div className="flex flex-col items-center gap-5 animate-enter">
          <p className="text-sm font-medium tracking-wide text-secao uppercase">Apoie o projeto</p>
          <h1 id="titulo" className="flex max-w-[18ch] flex-col text-[clamp(2.5rem,6vw,5.25rem)] leading-[0.95]">
            <span className="font-bold tracking-[-0.04em]">Dados públicos</span>
            <span className="font-serif font-normal tracking-normal italic">abertos para todo mundo</span>
          </h1>
          <p className="max-w-[56ch] text-lg text-muted-foreground">
            O Jabuti é gratuito, não tem anúncios, não vende dados de ninguém e tem o código aberto. Ele se mantém com o
            apoio de quem acha importante acompanhar os políticos de perto.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 animate-enter" style={stagger(1)}>
          {apoio.pix && (
            <a href="#pix" className={cn(buttonVariants({ size: "lg" }), "min-h-11 rounded-full px-6")}>
              Doar por Pix
            </a>
          )}
          {apoio.links.length > 0 && (
            <a href="#mensal" className={cn(buttonVariants({ size: "lg", variant: apoio.pix ? "outline" : "default" }), "min-h-11 rounded-full px-6")}>
              Apoio mensal
            </a>
          )}
          <a href="#outras" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "min-h-11 rounded-full px-6")}>
            Outras formas de ajudar
          </a>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-[clamp(2.5rem,5vw,4rem)]">
        <Suspense fallback={null}>
          <Mural />
        </Suspense>

        <section aria-labelledby="custos" className="flex flex-col gap-4 animate-enter">
          <h2 id="custos" className="border-b pb-3 text-2xl font-bold">
            Para onde vai o dinheiro
          </h2>
          <p className="max-w-[65ch] text-muted-foreground">
            Cada doação paga o que mantém o portal no ar e rápido. Quem doa não ganha vantagem nem escolhe o que aparece: os
            dados continuam vindo só de fontes oficiais e abertos para todos, com ou sem doação.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {CUSTOS.map(({ icon: Icon, titulo, texto }) => (
              <li key={titulo} className="flex gap-3 rounded-xl border bg-card p-4 shadow-soft">
                <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-secao" />
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold">{titulo}</h3>
                  <p className="text-sm text-muted-foreground">{texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {publico.pix && (
          <section aria-labelledby="pix" className="flex scroll-mt-24 flex-col gap-4 rounded-2xl border bg-card p-4 shadow-soft animate-enter sm:p-6">
            <div className="flex flex-col gap-1">
              <h2 id="pix" className="scroll-mt-24 text-2xl font-bold">
                Doar por Pix
              </h2>
              <p className="max-w-[65ch] text-muted-foreground">
                Qualquer valor ajuda, uma vez ou quando você quiser. O dinheiro vai direto para a conta de {publico.pix.nome},
                sem intermediário.
              </p>
            </div>
            <PainelPix pix={publico.pix} svgInicial={svgInicial} />
          </section>
        )}

        {apoio.links.length > 0 && (
          <section aria-labelledby="mensal" className="flex flex-col gap-4 animate-enter">
            <h2 id="mensal" className="scroll-mt-24 border-b pb-3 text-2xl font-bold">
              Apoio mensal
            </h2>
            <p className="max-w-[65ch] text-muted-foreground">
              Um valor pequeno todo mês ajuda mais que uma doação grande de vez em quando: dá para planejar os custos.
            </p>
            <ul className="grid gap-3 sm:grid-cols-2">
              {apoio.links.map((l) => (
                <li key={l.id}>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-full min-h-11 items-start gap-3 rounded-xl border bg-card p-4 shadow-soft transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <HeartHandshakeIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-secao" />
                    <span className="flex flex-1 flex-col gap-1">
                      <span className="font-semibold">
                        {l.nome}
                        <span className="sr-only"> (abre em nova aba)</span>
                      </span>
                      <span className="text-sm text-muted-foreground">{l.descricao}</span>
                    </span>
                    <ExternalLinkIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!financeiro && (
          <p role="note" className="rounded-2xl border border-dashed p-4 text-muted-foreground animate-enter sm:p-6">
            As doações em dinheiro ainda não estão abertas. Enquanto isso, as formas de ajudar abaixo já fazem muita
            diferença.
          </p>
        )}

        <section aria-labelledby="outras" className="flex flex-col gap-4 animate-enter">
          <h2 id="outras" className="scroll-mt-24 border-b pb-3 text-2xl font-bold">
            Outras formas de ajudar
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            <li className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-soft sm:col-span-2">
              <div className="flex gap-3">
                <Share2Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-secao" />
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold">Mostre o portal para alguém</h3>
                  <p className="text-sm text-muted-foreground">
                    Quanto mais gente acompanha, mais difícil fica um político agir sem ser notado.
                  </p>
                </div>
              </div>
              <Compartilhar caminho="/" texto="Conheça o Jabuti: veja como votou, quanto gastou e para onde mandou dinheiro quem você elegeu, com dados oficiais." />
            </li>
            <li className="flex gap-3 rounded-xl border bg-card p-4 shadow-soft">
              <BugIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-secao" />
              <div className="flex flex-col gap-1">
                <h3 className="font-semibold">Avise de erros</h3>
                <p className="text-sm text-muted-foreground">
                  Viu um dado estranho ou algo que não funcionou com sua tecnologia assistiva? Conte em{" "}
                  <Link href="/feedback?de=/apoie" className={ESTILO_LINK}>
                    Sugestões e problemas
                  </Link>
                  .
                </p>
              </div>
            </li>
            <li className="flex gap-3 rounded-xl border bg-card p-4 shadow-soft">
              <CodeIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-secao" />
              <div className="flex flex-col gap-1">
                <h3 className="font-semibold">Contribua no código</h3>
                <p className="text-sm text-muted-foreground">
                  O{" "}
                  <a href={apoio.repositorio} target="_blank" rel="noreferrer" className={ESTILO_LINK}>
                    repositório no GitHub
                    <span className="sr-only"> (abre em nova aba)</span>
                  </a>{" "}
                  aceita código, textos para o glossário e ideias de dados públicos. Não precisa ser especialista.
                </p>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

/** Mural de quem apoiou e autorizou mostrar o nome. Os nomes entram pelo admin (/admin/apoiadores). Vazio, não aparece. */
async function Mural() {
  const apoiadores = await getApoiadores();
  if (apoiadores.length === 0) return null;

  return (
    <section aria-labelledby="mural" className="flex scroll-mt-24 flex-col gap-4 animate-enter">
      <div className="flex flex-col gap-1 border-b pb-3">
        <h2 id="mural" className="scroll-mt-24 text-2xl font-bold">
          Quem já apoiou
        </h2>
        <p className="text-muted-foreground">
          {apoiadores.length === 1 ? "Uma pessoa já ajudou" : `${apoiadores.length} pessoas já ajudaram`} a manter o
          portal no ar. Obrigado! Aparece aqui só quem quis ter o nome no mural.
        </p>
      </div>
      <ul className="flex flex-wrap gap-2">
        {apoiadores.map((a) => (
          <li key={a.id} className="flex min-h-11 items-center gap-2 rounded-full border bg-card px-4 shadow-soft">
            <HeartHandshakeIcon aria-hidden="true" className="size-4 shrink-0 text-secao" />
            <span className="font-medium">{a.nome}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
