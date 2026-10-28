import { HandCoinsIcon } from "lucide-react";

import { TipoEmenda } from "@/components/emendas/tipo-emenda";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
import { formatarReais, reaisDoTexto } from "@/lib/format/dinheiro";
import type { getEmendas } from "@/lib/transparencia/queries";

type Emenda = Awaited<ReturnType<typeof getEmendas>>[number];

export function EmendasLista({ emendas, vazio }: { emendas: Emenda[]; vazio: string }) {
  if (emendas.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HandCoinsIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Sem emendas</EmptyTitle>
          <EmptyDescription>{vazio}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ItemGroup className="gap-3">
      {emendas.map((e) => (
        <Item key={e.codigoEmenda} variant="outline">
          <ItemContent>
            <ItemTitle>
              {e.funcao ?? "Função não informada"}
              {e.subfuncao && <span className="font-normal text-muted-foreground"> · {e.subfuncao}</span>}
            </ItemTitle>
            <ItemDescription>
              {e.localidadeDoGasto ?? "Localidade não informada"} · <TipoEmenda tipo={e.tipoEmenda} />
            </ItemDescription>
            <ItemDescription>
              Autor: {e.nomeAutor} · Emenda <span className="font-mono">{e.codigoEmenda}</span>
            </ItemDescription>
          </ItemContent>
          {/* No celular os valores descem para baixo do texto, em vez de espremê-lo numa coluna. */}
          <dl className="grid grid-cols-[auto_auto] gap-x-3 gap-y-1 self-start text-right text-xs max-sm:basis-full max-sm:justify-start max-sm:text-left">

            <dt className="text-muted-foreground">Empenhado</dt>
            <dd className="font-mono">{formatarReais(reaisDoTexto(e.valorEmpenhado))}</dd>
            <dt className="text-muted-foreground">Pago</dt>
            <dd>
              <Badge variant="success" className="font-mono">
                {formatarReais(reaisDoTexto(e.valorPago))}
              </Badge>
            </dd>
          </dl>
        </Item>
      ))}
    </ItemGroup>
  );
}
