import { ChevronDownIcon, ScaleIcon } from "lucide-react";

import { Rolavel, Secao } from "@/components/perfil-parlamentar";
import { Termo } from "@/components/termo";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
import { formatarData } from "@/lib/format/datas";
import type { LeiDoParlamentar, Papel } from "@/lib/parlamentares/leis";

const ROTULO: Record<Papel, string> = { autor: "Autor", coautor: "Coautor", relator: "Relator" };

const TITULO_GRUPO: Record<Papel, string> = { autor: "Propôs", coautor: "Assinou junto", relator: "Relatou" };

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/**
 * Leis em que o parlamentar teve participação, de toda a carreira: autoria, coautoria e (no Senado)
 * relatoria. `naoVerificados` conta os projetos que a fonte não respondeu; a lista pode estar incompleta.
 */
export function LeisParlamentar({
  casa,
  leis,
  naoVerificados,
}: {
  casa: "camara" | "senado";
  leis: LeiDoParlamentar[];
  naoVerificados: number;
}) {
  const conta = (papel: Papel) => leis.filter((l) => l.papel === papel).length;
  const papeis: Papel[] = casa === "senado" ? ["autor", "coautor", "relator"] : ["autor", "coautor"];
  const partes = papeis.map((papel) => `${conta(papel)} como ${papel}`);
  const grupos = papeis.map((papel) => ({ papel, itens: leis.filter((l) => l.papel === papel) })).filter((g) => g.itens.length > 0);

  return (
    <Secao
      id="leis"
      titulo="Leis"
      descricao={
        <>
          {plural(leis.length, "lei saiu", "leis saíram")} de projetos com a participação deste parlamentar, em toda a
          carreira: {partes.join(" · ")}. Veja o que é <Termo id="autoria">autor e coautor</Termo>
          {casa === "senado" && (
            <>
              {" "}e <Termo id="relator">relator</Termo>
            </>
          )}
          .
          {leis.some((l) => l.comVeto) && (
            <>
              {" "}Algumas foram sancionadas com <Termo id="veto">veto parcial</Termo>.
            </>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {naoVerificados > 0 && (
          <p role="status" className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            A Câmara não respondeu sobre {plural(naoVerificados, "projeto", "projetos")} deste deputado, então a lista pode
            estar incompleta. Volte em alguns minutos para ver a lista completa.
          </p>
        )}

        {leis.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ScaleIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>Nenhuma lei encontrada</EmptyTitle>
              <EmptyDescription>
                {casa === "senado"
                  ? "Nenhum projeto de autoria, coautoria ou relatoria deste senador virou lei, segundo o Senado."
                  : "Nenhum projeto de autoria ou coautoria deste deputado virou lei, segundo a Câmara."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          // Um grupo por papel, em <details>: abre e fecha sem JavaScript, e as dezenas de relatorias de um
          // senador antigo não escondem as leis que ele mesmo propôs. O primeiro grupo com itens vem aberto.
          <div className="flex flex-col gap-2">
            {grupos.map(({ papel, itens }, i) => (
              <details key={papel} open={i === 0} className="group rounded-xl border">
                <summary
                  className={
                    "flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-4 py-3 font-semibold " +
                    "outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
                  }
                >
                  <span>
                    {TITULO_GRUPO[papel]} <span className="font-normal text-muted-foreground">({itens.length})</span>
                  </span>
                  <ChevronDownIcon aria-hidden="true" className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-2 pb-2">
                  <Rolavel>
                    <ItemGroup className="gap-2">
                      {itens.map((l) => (
                        <LeiItem key={l.chave} lei={l} />
                      ))}
                    </ItemGroup>
                  </Rolavel>
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </Secao>
  );
}

function LeiItem({ lei: l }: { lei: LeiDoParlamentar }) {
  return (
    <Item variant="outline" size="sm" render={l.url ? <a href={l.url} target="_blank" rel="noreferrer" /> : undefined}>
      <ItemContent>
        <ItemTitle>
          {l.norma ?? l.identificacao}
          {l.url && <span className="sr-only">(abre em nova aba)</span>}
        </ItemTitle>
        <ItemDescription className="line-clamp-2">{l.ementa}</ItemDescription>
        <ItemDescription>
          {l.norma ? `Projeto ${l.identificacao}` : `Apresentado em ${formatarData(l.data)}`}
          {l.colegiado && <> · relatou em {l.colegiado}</>}
          {/* Texto puro: o item inteiro é um link, e um <Termo> aqui seria controle dentro de link. */}
          {l.comVeto && <> · sancionada com veto parcial</>}
        </ItemDescription>
      </ItemContent>
      <Badge variant={l.papel === "autor" ? "default" : "secondary"} className="self-start">
        {ROTULO[l.papel]}
      </Badge>
    </Item>
  );
}
