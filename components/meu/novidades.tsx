import { MegaphoneIcon } from "lucide-react";
import Link from "next/link";

import { reaisDeCentavos } from "@/components/emendas/valores";
import { Termo } from "@/components/termo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { formatarData, formatarMesAno } from "@/lib/format/datas";
import type { NovidadeParlamentar } from "@/lib/meu/novidades";
import { ROTULO_VOTO } from "@/lib/votacoes/rotulos";

const iniciais = (nome: string) =>
  nome
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/** Cartões do que cada parlamentar fixado ou seguido fez desde a última visita. */
export function Novidades({ itens, desde, ano }: { itens: NovidadeParlamentar[]; desde: Date; ano: number }) {
  if (itens.length === 0) {
    return (
      <Empty className="rounded-xl border">
        <EmptyHeader>
          <EmptyTitle>Você ainda não acompanha nenhum parlamentar</EmptyTitle>
          <EmptyDescription>
            Fixe ou siga deputados e senadores no perfil deles: o que eles fizerem aparece aqui.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link href="/parlamentares" />} nativeButton={false}>
            Escolher parlamentares
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,24rem),1fr))] gap-4">
      {itens.map((p) => (
        <li key={p.chave} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-11">
              {p.fotoUrl && <AvatarImage src={p.fotoUrl} alt="" />}
              <AvatarFallback>{iniciais(p.nome)}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <Link href={p.perfil} className="font-semibold text-link underline underline-offset-2">
                {p.nome}
              </Link>
              <span className="text-sm text-muted-foreground">
                {p.partido ?? "sem partido"}
                {p.uf && `/${p.uf}`}
              </span>
            </div>
          </div>

          <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">
                <Termo id="votacao-nominal">Votações</Termo> desde {formatarData(desde)}
              </dt>
              <dd className="font-semibold">{p.votos.total}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                <Termo id="proposicao">Proposições</Termo> novas
              </dt>
              <dd className="font-semibold">{p.proposicoes.length}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                <Termo id="cota-parlamentar">Cota</Termo> no último mês carregado
              </dt>
              <dd className="font-semibold">
                {p.cota ? `${reaisDeCentavos(p.cota.total)} (${formatarMesAno(p.cota.ano, p.cota.mes)})` : "Sem gastos no banco"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                <Termo id="emenda">Emendas</Termo> de {ano} pagas
              </dt>
              <dd className="font-semibold">{p.emendas ? reaisDeCentavos(p.emendas.pago) : "Nenhuma"}</dd>
            </div>
          </dl>

          {p.votos.ultimos.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">Últimos votos</p>
              <ul className="flex flex-col gap-1 text-sm">
                {p.votos.ultimos.map((v) => (
                  <li key={v.url}>
                    <Link href={v.url} className="text-link underline underline-offset-2">
                      {ROTULO_VOTO[v.tipo]}
                    </Link>{" "}
                    <span className="text-muted-foreground">
                      em {formatarData(v.data)}: <span className="line-clamp-1 inline">{v.descricao}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {p.proposicoes.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">Proposições novas</p>
              <ul className="flex flex-col gap-1 text-sm">
                {p.proposicoes.map((q) => (
                  <li key={q.rotulo}>
                    {q.url ? (
                      <a href={q.url} target="_blank" rel="noreferrer" className="text-link underline underline-offset-2">
                        {q.rotulo}
                        <span className="sr-only"> (abre em nova aba)</span>
                      </a>
                    ) : (
                      <strong>{q.rotulo}</strong>
                    )}{" "}
                    <span className="line-clamp-2 text-muted-foreground">{q.ementa}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-auto flex flex-wrap gap-2">
            <Button variant="outline" size="sm" render={<Link href={p.perfil} />} nativeButton={false}>
              Ver perfil
            </Button>
            <Button
              variant="ghost"
              size="sm"
              render={<Link href={`/parlamentares/cobrar?p=${p.chave}`} />}
              nativeButton={false}
            >
              <MegaphoneIcon data-icon="inline-start" aria-hidden="true" />
              Cobrar
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
