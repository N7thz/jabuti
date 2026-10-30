import { VoteIcon } from "lucide-react";
import Link from "next/link";

import { BaixarCsv } from "@/components/baixar-csv";
import { Rolavel, Secao } from "@/components/perfil-parlamentar";
import { Termo } from "@/components/termo";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
import { SeloVoto } from "@/components/votacoes/placar";
import { formatarData } from "@/lib/format/datas";
import { linkVotacao, type CasaUrl, type VotoNoPerfil } from "@/lib/votacoes/queries";
import { contarPlacar } from "@/lib/votacoes/rotulos";

/** Seção "Como votou" do perfil: placar pessoal e a lista das votações nominais, da mais recente. */
export function HistoricoVotos({
  casa,
  idExterno,
  votos,
  origem,
}: {
  casa: CasaUrl;
  idExterno: string;
  votos: VotoNoPerfil[];
  /** De onde vêm os dados, mostrado na descrição (ex.: "API do Senado, consultada em 29/10/2026"). */
  origem: React.ReactNode;
}) {
  const placar = contarPlacar(votos);

  return (
    <Secao
      id="votacoes"
      titulo="Como votou"
      descricao={
        <>
          {votos.length} <Termo id="votacao-nominal">votações nominais</Termo> no plenário · {origem}
        </>
      }
    >
      {votos.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <VoteIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Nenhuma votação nominal encontrada</EmptyTitle>
            <EmptyDescription>
              Ainda não há votos nominais registrados para este período. Votações{" "}
              <Termo id="votacao-simbolica">simbólicas</Termo> não registram o voto de cada um.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-4">
          <p>
            <strong>{placar.SIM}</strong> sim · <strong>{placar.NAO}</strong> não · <strong>{placar.ABSTENCAO}</strong>{" "}
            abstenções · <strong>{placar.OBSTRUCAO}</strong>{" "}
            <Termo id="obstrucao">obstruções</Termo> · <strong>{placar.OUTROS}</strong> outros registros
            (ausências, votos secretos, presidindo a sessão)
          </p>
          <Rolavel>
            <ItemGroup className="gap-2">
              {votos.map((v) => (
                <Item key={v.votacaoId} variant="outline" size="sm">
                  <ItemContent>
                    <ItemTitle>
                      {v.temPagina ? (
                        <Link href={linkVotacao(casa, v.votacaoId)} className="text-link underline">
                          {v.proposicao?.rotulo ?? "Votação"} · {formatarData(v.data)}
                        </Link>
                      ) : (
                        <>
                          {v.proposicao?.rotulo ?? "Votação"} · {formatarData(v.data)}
                        </>
                      )}
                    </ItemTitle>
                    <ItemDescription className="line-clamp-2">{v.proposicao?.ementa ?? v.descricao}</ItemDescription>
                    {v.resultado && <ItemDescription>Resultado: {v.resultado}</ItemDescription>}
                  </ItemContent>
                  <SeloVoto tipo={v.tipo} original={v.votoOriginal} />
                </Item>
              ))}
            </ItemGroup>
          </Rolavel>
          <BaixarCsv href={`/api/csv/votos?casa=${casa}&id=${encodeURIComponent(idExterno)}`} rotulo="Baixar os votos" />
        </div>
      )}
    </Secao>
  );
}
