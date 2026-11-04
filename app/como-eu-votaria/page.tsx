import { ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { ErroSecao } from "@/components/erro-secao";
import { Termo } from "@/components/termo";
import { Skeleton } from "@/components/ui/skeleton";
import { MAXIMO_DE_VOTACOES, getMatriz } from "@/lib/como-eu-votaria/queries";
import { metadados } from "@/lib/metadados";
import { cn } from "@/lib/utils";

import { Questionario } from "./questionario";

export const metadata = metadados({
  titulo: "Como eu votaria? · Jabuti",
  caminho: "/como-eu-votaria",
  descricao:
    "Responda votações nominais do plenário e veja quais deputados, senadores e partidos votaram como você. Suas respostas não saem do seu aparelho.",
});

type Casa = "camara" | "senado";
const CASAS: { casa: Casa; nome: string; quem: string }[] = [
  { casa: "camara", nome: "Câmara dos Deputados", quem: "deputados" },
  { casa: "senado", nome: "Senado", quem: "senadores" },
];

const casaDaUrl = (valor: string | string[] | undefined): Casa => (valor === "senado" ? "senado" : "camara");

export default function ComoEuVotariaPage({ searchParams }: PageProps<"/como-eu-votaria">) {
  return (
    <div data-secao="parlamentares" className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 xs:px-6 py-[clamp(2rem,5vw,4rem)]">
      <header className="flex flex-col gap-3 animate-enter">
        <p className="text-sm font-medium tracking-wide text-secao uppercase">Votações</p>
        <h1 className="text-[clamp(2rem,4vw,3rem)] leading-tight font-bold">Como eu votaria?</h1>
        <p className="max-w-[65ch] text-lg text-muted-foreground">
          Responda Sim ou Não em <Termo id="votacao-nominal">votações nominais</Termo> do{" "}
          <Termo id="plenario">plenário</Termo> e veja quais parlamentares e partidos votaram como você. É só uma
          comparação de votos: não é recomendação de voto nem diz quem é melhor.
        </p>
      </header>

      <aside
        aria-labelledby="privacidade"
        className="flex gap-3 rounded-lg border border-emerald-700/40 bg-emerald-50 p-4 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-50"
      >
        <ShieldCheckIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <div className="flex flex-col gap-1">
          <h2 id="privacidade" className="font-semibold">
            Suas respostas não saem do seu aparelho
          </h2>
          <p>
            Opinião política é um dado sensível. A conta é feita no seu navegador e as respostas ficam guardadas só nele,
            até você apagar. Não guardamos nada no portal, nem com login. Se o seu navegador estiver com JavaScript
            desligado, as respostas passam pelo nosso servidor só para fazer a conta e são descartadas em seguida.
          </p>
        </div>
      </aside>

      <Suspense fallback={<EscolhaCasa />}>
        <EscolhaCasa searchParams={searchParams} />
      </Suspense>

      <ErroSecao titulo="Votações" fonte="da nossa cópia das votações da Câmara e do Senado">
        <Suspense
          fallback={
            <div role="status" aria-label="Carregando votações" className="flex flex-col gap-4">
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </div>
          }
        >
          <Votacoes searchParams={searchParams} />
        </Suspense>
      </ErroSecao>

      <section aria-labelledby="criterio" className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:p-6">
        <h2 id="criterio" className="text-xl font-semibold">
          Como escolhemos as votações
        </h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-muted-foreground">
          <li>
            Votações nominais do plenário desde o início da <Termo id="legislatura">legislatura</Termo> atual, de{" "}
            <Termo id="pec">emenda à Constituição</Termo>, <Termo id="projeto-de-lei">projeto de lei</Termo>,{" "}
            <Termo id="lei-complementar">lei complementar</Termo>, <Termo id="medida-provisoria">medida provisória</Termo>{" "}
            e decreto legislativo.
          </li>
          <li>
            Ficam fora as votações de procedimento, como pedidos de urgência e de adiamento: elas dizem pouco sobre o que
            cada um pensa do projeto.
          </li>
          <li>
            Uma votação por proposta, a do texto principal. Entram as {MAXIMO_DE_VOTACOES} com mais votos registrados.
            Ninguém escolhe à mão.
          </li>
          <li>
            A pergunta é a <Termo id="ementa">ementa</Termo> oficial, o resumo que a própria casa escreve. Abra a votação
            para ver o placar e o texto completo.
          </li>
          <li>
            Na conta entram só as votações em que você e o parlamentar tomaram posição. Ausências, votos secretos e quem
            presidia a sessão ficam fora, porque não dá para saber se concordariam. A{" "}
            <Termo id="abstencao">abstenção</Termo> do parlamentar conta como posição diferente da sua.
          </li>
        </ul>
      </section>
    </div>
  );
}

async function EscolhaCasa({ searchParams }: Partial<Pick<PageProps<"/como-eu-votaria">, "searchParams">>) {
  const atual = searchParams ? casaDaUrl((await searchParams).casa) : null;
  return (
    <nav aria-label="Escolher a casa" className="flex flex-wrap gap-2">
      {CASAS.map((c) => {
        const ativa = c.casa === (atual ?? "camara");
        return (
          <Link
            key={c.casa}
            href={c.casa === "camara" ? "/como-eu-votaria" : "/como-eu-votaria?casa=senado"}
            aria-current={atual && ativa ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full border px-5 font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              atual && ativa ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
            )}
          >
            {c.nome}
          </Link>
        );
      })}
    </nav>
  );
}

async function Votacoes({ searchParams }: Pick<PageProps<"/como-eu-votaria">, "searchParams">) {
  const casa = casaDaUrl((await searchParams).casa);
  const matriz = await getMatriz(casa);
  const quem = CASAS.find((c) => c.casa === casa)!.quem;

  if (matriz.votacoes.length === 0) {
    return (
      <p className="rounded-lg border bg-card p-4">
        Ainda não temos votações desta casa que sigam o critério abaixo. Volte depois da próxima atualização dos dados.
      </p>
    );
  }
  return <Questionario matriz={matriz} quem={quem} />;
}
