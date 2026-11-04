import { BellIcon, CheckCheckIcon, CheckIcon, FileTextIcon, ScrollTextIcon, VoteIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { alternarSeguido } from "@/app/seguidos/actions";
import { BotaoEntrar } from "@/components/auth-buttons";
import { hrefParlamentar } from "@/components/parlamentar-item";
import { Termo } from "@/components/termo";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/db";
import { donoDa } from "@/lib/fixados";
import { formatarData } from "@/lib/format/datas";
import type { TipoNotificacao } from "@/lib/generated/prisma/enums";
import { metadados } from "@/lib/metadados";
import { lerChave } from "@/lib/notificacoes/textos";
import { getSeguidos, LIMITE_SEGUIDOS } from "@/lib/seguidos";
import { getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

import { marcarComoLida } from "./actions";

export const metadata = metadados({
  titulo: "Notificações · Jabuti",
  indexar: false,
  descricao: "Como votaram e o que apresentaram os parlamentares que você segue, e as mudanças nos projetos seguidos.",
});

/** Quantas notificações a página mostra; as mais antigas somem sozinhas depois de 180 dias. */
const NA_PAGINA = 100;

const ICONE: Record<TipoNotificacao, typeof BellIcon> = { VOTO: VoteIcon, PROPOSICAO: FileTextIcon, LEI: ScrollTextIcon };
const TIPO: Record<TipoNotificacao, string> = { VOTO: "Votação", PROPOSICAO: "Projeto apresentado", LEI: "Projeto seguido" };

export default function NotificacoesPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 xs:px-6 py-[clamp(2rem,5vw,4rem)]">
      <header className="flex flex-col gap-3 animate-enter">
        <h1 className="text-[clamp(2rem,4vw,3rem)] leading-tight font-bold">Notificações</h1>
        <p className="max-w-[65ch] text-lg text-muted-foreground">
          Siga parlamentares e projetos de lei para saber quando eles se mexem: como cada um votou nas{" "}
          <Termo id="votacao-nominal">votações nominais</Termo>, os projetos que apresentou e as mudanças de situação dos
          projetos seguidos. A checagem é feita uma vez por dia, depois que os dados da Câmara e do Senado são
          atualizados.
        </p>
      </header>

      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <Conteudo />
      </Suspense>
    </div>
  );
}

async function Conteudo() {
  const sessao = await getSession();
  if (!sessao) {
    return (
      <Empty className="rounded-lg border bg-card shadow-soft">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BellIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Entre para seguir parlamentares e projetos</EmptyTitle>
          <EmptyDescription>
            Tudo no portal é aberto; o login só serve para guardar quem você segue e avisar das novidades.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <BotaoEntrar />
        </EmptyContent>
      </Empty>
    );
  }

  const usuario = donoDa(sessao);
  const [notificacoes, naoLidas, seguidos] = await Promise.all([
    db.notificacao.findMany({ where: { usuario }, orderBy: [{ ocorridoEm: "desc" }, { criadaEm: "desc" }], take: NA_PAGINA }),
    db.notificacao.count({ where: { usuario, lidaEm: null } }),
    getSeguidos(),
  ]);
  const totalSeguidos = (seguidos?.parlamentares.length ?? 0) + (seguidos?.leis.length ?? 0);

  return (
    <>
      <section aria-labelledby="novidades" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="novidades" className="text-xl font-bold">
            Novidades
            <span className="ml-2 text-base font-normal text-muted-foreground">
              {naoLidas === 0 ? "nenhuma não lida" : naoLidas === 1 ? "1 não lida" : `${naoLidas} não lidas`}
            </span>
          </h2>
          {naoLidas > 0 && (
            <form action={marcarComoLida}>
              <Button type="submit" variant="outline" size="sm">
                <CheckCheckIcon data-icon="inline-start" aria-hidden="true" />
                Marcar todas como lidas
              </Button>
            </form>
          )}
        </div>

        {notificacoes.length === 0 ? (
          <Empty className="rounded-lg border bg-card">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BellIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>Nada por enquanto</EmptyTitle>
              <EmptyDescription>
                {totalSeguidos === 0 ? (
                  <>
                    Você ainda não segue ninguém. Use o botão &ldquo;Seguir&rdquo; no perfil de um{" "}
                    <Link href="/parlamentares">parlamentar</Link> ou num projeto em <Link href="/leis">Leis e projetos</Link>.
                  </>
                ) : (
                  "As novidades aparecem aqui depois da próxima atualização diária dos dados."
                )}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="flex flex-col gap-3">
            {notificacoes.map((n) => {
              const Icone = ICONE[n.tipo];
              const lida = n.lidaEm !== null;
              const externo = n.url !== null && !n.url.startsWith("/");
              return (
                <li key={n.id}>
                  <article
                    className={cn(
                      "flex gap-3 rounded-xl border bg-card p-4 shadow-soft",
                      !lida && "border-primary/50 ring-1 ring-primary/30",
                    )}
                  >
                    <Icone aria-hidden="true" className="mt-1 size-5 shrink-0 text-muted-foreground" />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <p className="text-sm text-muted-foreground">
                        {!lida && <span className="font-semibold text-foreground">Nova · </span>}
                        {TIPO[n.tipo]} · <time dateTime={n.ocorridoEm.toISOString()}>{formatarData(n.ocorridoEm)}</time>
                      </p>
                      <h3 className="font-semibold">
                        {n.url ? (
                          <a
                            href={n.url}
                            {...(externo ? { target: "_blank", rel: "noreferrer" } : {})}
                            className="text-link underline underline-offset-4"
                          >
                            {n.titulo}
                            {externo && <span className="sr-only"> (abre em nova aba)</span>}
                          </a>
                        ) : (
                          n.titulo
                        )}
                      </h3>
                      <p className="line-clamp-4">{n.texto}</p>
                    </div>
                    {!lida && (
                      <form action={marcarComoLida} className="shrink-0">
                        <input type="hidden" name="id" value={n.id} />
                        <Button type="submit" variant="ghost" size="icon" aria-label={`Marcar como lida: ${n.titulo}`}>
                          <CheckIcon aria-hidden="true" />
                        </Button>
                      </form>
                    )}
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="seguindo" className="flex flex-col gap-4">
        <h2 id="seguindo" className="text-xl font-bold">
          Você segue
          <span className="ml-2 text-base font-normal text-muted-foreground">
            {totalSeguidos} de {LIMITE_SEGUIDOS}
          </span>
        </h2>
        {seguidos && totalSeguidos > 0 ? (
          <>
            <ListaSeguidos
              titulo="Parlamentares"
              tipo="PARLAMENTAR"
              itens={seguidos.parlamentares.map((s) => {
                const c = lerChave(s.chave);
                return { ...s, href: c ? hrefParlamentar(c) : "/parlamentares" };
              })}
            />
            <ListaSeguidos titulo="Projetos" tipo="LEI" itens={seguidos.leis.map((s) => ({ ...s, href: null }))} />
          </>
        ) : (
          <p className="text-muted-foreground">Ninguém ainda.</p>
        )}
      </section>
    </>
  );
}

function ListaSeguidos({
  titulo,
  tipo,
  itens,
}: {
  titulo: string;
  tipo: "PARLAMENTAR" | "LEI";
  itens: { chave: string; rotulo: string; href: string | null }[];
}) {
  if (itens.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-semibold">{titulo}</h3>
      <ul className="flex flex-col divide-y rounded-xl border">
        {itens.map((item) => (
          <li key={item.chave} className="flex items-center justify-between gap-2 py-1 pr-1 pl-3">
            {item.href ? (
              <Link href={item.href} className="min-w-0 truncate underline-offset-4 hover:underline">
                {item.rotulo}
              </Link>
            ) : (
              <span className="min-w-0 truncate">{item.rotulo}</span>
            )}
            <form action={alternarSeguido}>
              <input type="hidden" name="tipo" value={tipo} />
              <input type="hidden" name="chave" value={item.chave} />
              <input type="hidden" name="rotulo" value={item.rotulo} />
              <Button type="submit" variant="ghost" size="sm">
                Deixar de seguir<span className="sr-only"> {item.rotulo}</span>
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
