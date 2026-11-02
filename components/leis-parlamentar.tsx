import { ScaleIcon } from "lucide-react";

import { Rolavel, Secao } from "@/components/perfil-parlamentar";
import { Termo } from "@/components/termo";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
import { formatarData } from "@/lib/format/datas";
import type { LeiDoParlamentar, Papel } from "@/lib/parlamentares/leis";

const ROTULO: Record<Papel, string> = { autor: "Autor", coautor: "Coautor", relator: "Relator" };

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
          <Rolavel>
            <ItemGroup className="gap-2">
              {leis.map((l) => (
                <Item
                  key={l.chave}
                  variant="outline"
                  size="sm"
                  render={l.url ? <a href={l.url} target="_blank" rel="noreferrer" /> : undefined}
                >
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
              ))}
            </ItemGroup>
          </Rolavel>
        )}
      </div>
    </Secao>
  );
}
