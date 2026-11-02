import Link from "next/link";
import { connection } from "next/server";

import { Termo } from "@/components/termo";
import { anoEmAndamento, periodoDoAno } from "@/lib/anos";
import { cn } from "@/lib/utils";

/**
 * Links para os outros anos da mesma página (`?ano=`). São links comuns: funcionam sem JavaScript,
 * dá para abrir em outra aba e compartilhar. O ano corrente leva o aviso "até o momento".
 */
export async function NavegacaoAnos({
  anos,
  ano,
  href,
  rotulo = "Ano",
  className,
  children,
}: {
  children?: React.ReactNode;
  anos: readonly number[];
  ano: number;
  /** URL de cada ano; inclua a âncora da seção (`#cota`) para a página voltar ao mesmo lugar. */
  href: (ano: number) => string;
  rotulo?: string;
  className?: string;
}) {
  if (anos.length === 0) return null;
  await connection();
  const emAndamento = anoEmAndamento(ano);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {anos.length > 1 && (
        <nav aria-label={`${rotulo}: escolha o ano`}>
          <ul className="flex flex-wrap gap-2">
            {anos.map((a) => {
              const atual = a === ano;
              return (
                <li key={a}>
                  <Link
                    href={href(a)}
                    scroll={false}
                    aria-current={atual ? "page" : undefined}
                    className={cn(
                      "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      atual ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent",
                    )}
                  >
                    {a}
                    {anoEmAndamento(a) && (
                      <span className={cn("text-xs font-normal", atual ? "text-primary-foreground/80" : "text-muted-foreground")}>
                        até o momento
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
      {children}
      <p className="text-sm text-muted-foreground">
        {emAndamento ? (
          <>
            <strong className="font-medium text-foreground">{ano} até o momento:</strong> dados {periodoDoAno(ano)}. O ano
            ainda não acabou, então os totais vão crescer.
          </>
        ) : (
          <>Dados {periodoDoAno(ano)}.</>
        )}
      </p>
    </div>
  );
}

/**
 * Bloco "Ano dos dados" dos perfis de deputado e senador, logo abaixo do índice das seções.
 * O ano escolhido vale para resumo, cota, proposições e emendas (`nota` diz o que fica de fora).
 */
export function AnoDoPerfil({
  anos,
  ano,
  caminho,
  nota = "Vale para o resumo, a cota, as proposições e as emendas. As votações e as leis mostram o mandato inteiro.",
}: {
  anos: readonly number[];
  ano: number;
  caminho: string;
  nota?: string;
}) {
  return (
    <section aria-labelledby="ano-dos-dados" className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-soft sm:p-5">
      <h2 id="ano-dos-dados" className="text-lg font-semibold">
        Ano dos dados
      </h2>
      <NavegacaoAnos
        rotulo="Ano dos dados"
        anos={anos}
        ano={ano}
        href={(a) => (a === anos[0] ? caminho : `${caminho}?ano=${a}`)}
      >
        <p className="text-sm text-muted-foreground">
          {nota} Os anos são os da <Termo id="legislatura">legislatura</Termo> atual.
        </p>
      </NavegacaoAnos>
    </section>
  );
}
