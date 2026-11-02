"use client";

import Link from "next/link";
import { useActionState, useRef, useState, useSyncExternalStore } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  calcular,
  fracao,
  respostasGuardadas,
  type Concordancia,
  type MatrizVotos,
  type Respostas,
  type Resultado,
} from "@/lib/como-eu-votaria/calculo";
import { formatarData } from "@/lib/format/datas";
import { cn } from "@/lib/utils";

import { calcularVotaria } from "./actions";

// As respostas ficam só neste aparelho (localStorage) e a conta é feita aqui. Se o navegador bloquear o
// armazenamento, elas ficam na memória enquanto a página estiver aberta.

const EVENTO = "jabuti:como-eu-votaria";
const chave = (casa: string) => `jabuti:como-eu-votaria:${casa}`;
const memoria: Record<string, string | null> = {};

function ler(casa: string) {
  try {
    return window.localStorage.getItem(chave(casa));
  } catch {
    return memoria[casa] ?? null;
  }
}

function gravar(casa: string, texto: string | null) {
  memoria[casa] = texto;
  try {
    if (texto === null) window.localStorage.removeItem(chave(casa));
    else window.localStorage.setItem(chave(casa), texto);
  } catch {
    // Sem armazenamento: fica só na memória.
  }
  window.dispatchEvent(new Event(EVENTO));
}

function assinar(avisar: () => void) {
  window.addEventListener(EVENTO, avisar);
  window.addEventListener("storage", avisar);
  return () => {
    window.removeEventListener(EVENTO, avisar);
    window.removeEventListener("storage", avisar);
  };
}

const semAssinatura = () => () => {};

const OPCOES = [
  { valor: "SIM", rotulo: "Sim" },
  { valor: "NAO", rotulo: "Não" },
  { valor: "PULAR", rotulo: "Não sei / pular" },
] as const;

const pct = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 0 });
const porcento = (c: Concordancia) => pct.format(Math.max(fracao(c), 0));

export function Questionario({ matriz, quem }: { matriz: MatrizVotos; quem: string }) {
  const { casa, votacoes } = matriz;
  const pronto = useSyncExternalStore(semAssinatura, () => true, () => false);
  const guardado = useSyncExternalStore(assinar, () => ler(casa), () => null);
  const [estado, acao, pendente] = useActionState(calcularVotaria, null);
  const [mostrar, setMostrar] = useState(false);
  const [aviso, setAviso] = useState("");
  const titulo = useRef<HTMLHeadingElement>(null);

  // Sem JavaScript, as respostas e o resultado voltam da Server Action; com JavaScript, vêm do aparelho.
  const doServidor = estado?.casa === casa ? estado : null;
  const respostas: Respostas = pronto ? respostasGuardadas(guardado) : (doServidor?.respostas ?? {});
  const resultado: Resultado | null = pronto ? (mostrar ? calcular(respostas, matriz) : null) : (doServidor?.resultado ?? null);
  const respondidas = votacoes.filter((v) => respostas[v.id]).length;

  function responder(id: string, valor: string) {
    const novas = { ...respostas };
    if (valor === "SIM" || valor === "NAO") novas[id] = valor;
    else delete novas[id];
    gravar(casa, Object.keys(novas).length ? JSON.stringify(novas) : null);
    setAviso("");
  }

  function verResultado(evento: React.FormEvent<HTMLFormElement>) {
    // Com JavaScript a conta é feita aqui: as respostas não vão para o servidor.
    evento.preventDefault();
    setMostrar(true);
    requestAnimationFrame(() => titulo.current?.focus());
  }

  function apagar() {
    gravar(casa, null);
    setMostrar(false);
    setAviso("Suas respostas foram apagadas deste aparelho.");
  }

  return (
    <div className="flex flex-col gap-8">
      <form action={acao} onSubmit={pronto ? verResultado : undefined} aria-label={`Votações para comparar com os ${quem}`} className="flex flex-col gap-4">
        <input type="hidden" name="casa" value={casa} />
        <p className="text-muted-foreground">
          {votacoes.length} {votacoes.length === 1 ? "votação" : "votações"}, da mais recente para a mais antiga. Responda
          quantas quiser.
          {votacoes.length < 10 && (
            <span className="block text-sm">
              Ainda temos poucas votações desta casa no nosso banco; a lista cresce a cada atualização dos dados.
            </span>
          )}
        </p>
        <ol className="flex flex-col gap-4">
          {votacoes.map((v, i) => {
            const marcada = respostas[v.id] ?? "PULAR";
            return (
              <li key={v.id}>
                <fieldset className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:p-5">
                  <legend className="sr-only">
                    Votação {i + 1} de {votacoes.length}: {v.proposicao}
                  </legend>
                  <p aria-hidden="true" className="text-sm text-muted-foreground">
                    {i + 1}/{votacoes.length} · <span className="font-medium text-foreground">{v.proposicao}</span> ·{" "}
                    {formatarData(v.data)}
                  </p>
                  <p className="text-lg leading-snug font-medium">{v.ementa}</p>
                  <p className="text-sm text-muted-foreground">
                    O que foi votado: {v.descricao}{" "}
                    <Link href={v.href} className="text-link underline underline-offset-4">
                      Ver a votação<span className="sr-only"> de {v.proposicao}</span>
                    </Link>
                  </p>
                  <div className="grid grid-cols-1 gap-2 xs:grid-cols-3">
                    {OPCOES.map((o) => (
                      <label
                        key={o.valor}
                        className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 has-checked:border-primary has-checked:bg-primary/10 has-focus-visible:ring-2 has-focus-visible:ring-ring has-focus-visible:ring-offset-2"
                      >
                        <input
                          type="radio"
                          name={`v:${v.id}`}
                          value={o.valor}
                          checked={marcada === o.valor}
                          onChange={() => responder(v.id, o.valor)}
                          className="size-4 accent-primary"
                        />
                        {o.rotulo}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" disabled={pendente} className="min-h-11">
            Ver resultado
          </Button>
          {pronto ? (
            <Button type="button" variant="outline" size="lg" className="min-h-11" onClick={apagar} disabled={respondidas === 0}>
              Apagar minhas respostas
            </Button>
          ) : (
            // Sem JavaScript nada fica guardado: recarregar a página já começa do zero.
            <Link
              href={casa === "senado" ? "/como-eu-votaria?casa=senado" : "/como-eu-votaria"}
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "min-h-11")}
            >
              Apagar minhas respostas
            </Link>
          )}
          <p role="status" className="text-sm text-muted-foreground">
            {aviso || (pronto && respondidas > 0 ? `${respondidas} de ${votacoes.length} respondidas, guardadas só neste aparelho.` : "")}
          </p>
        </div>
      </form>

      {resultado && <ResultadoVotaria resultado={resultado} quem={quem} titulo={titulo} />}
    </div>
  );
}

function Barra({ c }: { c: Concordancia }) {
  return (
    <span aria-hidden="true" className="block h-2 w-full overflow-hidden rounded-full bg-muted">
      <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(fracao(c), 0) * 100}%` }} />
    </span>
  );
}

const MOSTRAR_PRIMEIROS = 10;

function ResultadoVotaria({
  resultado,
  quem,
  titulo,
}: {
  resultado: Resultado;
  quem: string;
  titulo: React.RefObject<HTMLHeadingElement | null>;
}) {
  const { respondidas, parlamentares, partidos } = resultado;
  const linha = (p: Resultado["parlamentares"][number]) => (
    <li key={p.chave} className="flex flex-col gap-1.5 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <span>
          <Link href={p.perfil} className="font-medium text-link underline underline-offset-4">
            {p.nome}
          </Link>{" "}
          <span className="text-sm text-muted-foreground">
            {p.partido ?? "sem partido"}
            {p.uf && `/${p.uf}`}
          </span>
        </span>
        <span className="font-mono tabular-nums">
          <strong>{porcento(p)}</strong>{" "}
          <span className="text-sm text-muted-foreground">
            ({p.iguais} de {p.comparadas})
          </span>
        </span>
      </div>
      <Barra c={p} />
    </li>
  );

  return (
    <section aria-labelledby="resultado" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 id="resultado" ref={titulo} tabIndex={-1} className="text-2xl font-bold outline-none">
          Seu resultado
        </h2>
        {respondidas === 0 ? (
          <p>Responda Sim ou Não em pelo menos uma votação para comparar.</p>
        ) : (
          <p className="max-w-[65ch] text-muted-foreground">
            Comparamos as suas {respondidas} {respondidas === 1 ? "resposta" : "respostas"} com o voto dos {quem}. A
            porcentagem é a parte das votações em que os dois tomaram posição e votaram igual; entre parênteses, quantas
            foram. Quanto menos votações comparadas, menos o número diz. É só uma comparação de votos, não uma
            recomendação.
          </p>
        )}
      </div>

      {respondidas > 0 && parlamentares.length > 0 && (
        <>
          <section aria-labelledby="por-parlamentar" className="rounded-lg border bg-card p-4 sm:p-6">
            <h3 id="por-parlamentar" className="text-lg font-semibold">
              Por parlamentar
            </h3>
            <ol className="divide-y">{parlamentares.slice(0, MOSTRAR_PRIMEIROS).map(linha)}</ol>
            {parlamentares.length > MOSTRAR_PRIMEIROS && (
              <details className="mt-2">
                <summary className="flex min-h-11 cursor-pointer items-center font-medium text-link underline underline-offset-4">
                  Ver os outros {parlamentares.length - MOSTRAR_PRIMEIROS}
                </summary>
                <ol start={MOSTRAR_PRIMEIROS + 1} className="divide-y">
                  {parlamentares.slice(MOSTRAR_PRIMEIROS).map(linha)}
                </ol>
              </details>
            )}
          </section>

          <section aria-labelledby="por-partido" className="rounded-lg border bg-card p-4 sm:p-6">
            <h3 id="por-partido" className="text-lg font-semibold">
              Por partido
            </h3>
            <p className="text-sm text-muted-foreground">
              Soma dos votos de todos os {quem} do partido (partido atual de cada um) nas votações que você respondeu.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left">
                <caption className="sr-only">Concordância com as suas respostas por partido</caption>
                <thead>
                  <tr className="border-b text-sm text-muted-foreground">
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Partido
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Votaram como você
                    </th>
                    <th scope="col" className="py-2 font-medium">
                      Votos comparados
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {partidos.map((g) => (
                    <tr key={g.partido}>
                      <th scope="row" className="py-2 pr-4 font-medium">
                        {g.partido}{" "}
                        <span className="block text-xs font-normal text-muted-foreground">
                          {g.parlamentares} {g.parlamentares === 1 ? "parlamentar" : "parlamentares"}
                        </span>
                      </th>
                      <td className="w-1/2 py-2 pr-4">
                        <span className="font-mono tabular-nums font-semibold">{porcento(g)}</span>
                        <Barra c={g} />
                      </td>
                      <td className="py-2 font-mono tabular-nums">{g.comparadas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
      {respondidas > 0 && parlamentares.length === 0 && (
        <p>Nenhum dos {quem} tomou posição nas votações que você respondeu.</p>
      )}
    </section>
  );
}
