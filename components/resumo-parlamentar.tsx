import { useId } from "react";

import { Termo } from "@/components/termo";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { IdTermo } from "@/lib/glossario";

export interface Indicador {
  rotulo: string;
  /** Verbete do glossário que explica o indicador. */
  termo?: IdTermo;
  valor: string;
  detalhe?: React.ReactNode;
  /** Barra de proporção (ex.: presença). Decorativa: o número já está no texto. */
  medidor?: { parte: number; total: number };
}

const porcentagem = (parte: number, total: number) =>
  total === 0 ? "—" : `${Math.round((parte / total) * 100)}%`;

export { porcentagem };

export function Resumo({
  titulo,
  indicadores,
  metodologia,
}: {
  titulo: string;
  indicadores: Indicador[];
  metodologia: React.ReactNode;
}) {
  const id = useId();
  return (
    <section id="resumo" aria-labelledby={id} className="flex scroll-mt-24 flex-col gap-4 animate-enter">
      <h2 id={id} className="text-xl font-bold">
        {titulo}
      </h2>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {indicadores.map((item) => (
          // Card direto como grupo do <dl> (div com dt/dd): CardHeader/CardContent quebrariam a lista de definição.
          <Card key={item.rotulo} size="sm" className="gap-2 px-4 py-4">
            <dt className="text-sm text-muted-foreground">
              {item.termo ? <Termo id={item.termo}>{item.rotulo}</Termo> : item.rotulo}
            </dt>
            <dd className="text-3xl leading-none font-bold tabular-nums">{item.valor}</dd>
            {item.medidor && (
              // aria-hidden: o Progress tem role="progressbar" e o número já está no texto ao lado.
              <dd aria-hidden="true">
                <Progress
                  value={item.medidor.total ? (item.medidor.parte / item.medidor.total) * 100 : 0}
                  className="*:data-[slot=progress-track]:h-2"
                />
              </dd>
            )}
            {item.detalhe && <dd className="text-sm text-muted-foreground">{item.detalhe}</dd>}
          </Card>
        ))}
      </dl>
      <details className="rounded-lg border bg-card px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Como calculamos
        </summary>
        <div className="mt-3 flex max-w-[70ch] flex-col gap-2 text-muted-foreground">{metodologia}</div>
      </details>
    </section>
  );
}

export function ResumoSkeleton() {
  return (
    <div role="status" aria-label="Carregando resumo" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
  );
}

/** Agrupa siglas de proposição: projetos (o que vira lei) x requerimentos e indicações. */
export function classificarProposicoes(siglas: string[]) {
  const PROJETOS = new Set(["PL", "PLP", "PEC", "PDL", "PLV", "PLS", "PRS", "MPV"]);
  const REQUERIMENTOS = new Set(["REQ", "RIC", "INC", "RCP", "RQS", "RQN", "RQI"]);
  let projetos = 0;
  let requerimentos = 0;
  for (const sigla of siglas) {
    if (PROJETOS.has(sigla)) projetos++;
    else if (REQUERIMENTOS.has(sigla)) requerimentos++;
  }
  return { projetos, requerimentos, outros: siglas.length - projetos - requerimentos };
}
