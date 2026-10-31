import Link from "next/link";

import { AvisoFonte } from "@/components/aviso-fonte";
import { Secao } from "@/components/perfil-parlamentar";
import { porcentagem } from "@/components/resumo-parlamentar";
import { Termo } from "@/components/termo";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { tentar } from "@/lib/erros";
import type { Placar } from "@/lib/fidelidade";
import { formatarData } from "@/lib/format/datas";
import type { Casa } from "@/lib/generated/prisma/enums";
import type { IdTermo } from "@/lib/glossario";
import type { MudancaSituacao, PeriodoPartido } from "@/lib/parlamentares/historico";
import { getHistoricoDeputado, getHistoricoSenador } from "@/lib/parlamentares/queries";
import { getFidelidade, linkVotacao } from "@/lib/votacoes/queries";

/**
 * Seção "Partido e fidelidade": quanto o parlamentar segue a orientação do partido e do governo
 * (votações do banco) e por quais partidos passou (API da Casa). Uma fonte fora do ar não esconde a outra.
 */
export async function PartidoEFidelidade({ casa, idExterno, nome }: { casa: Casa; idExterno: string; nome: string }) {
  const nomeCasa = casa === "CAMARA" ? "a Câmara" : "o Senado";
  const [fidelidade, historico] = await Promise.all([
    getFidelidade(casa, idExterno),
    tentar(nomeCasa, () => (casa === "CAMARA" ? getHistoricoDeputado(Number(idExterno)) : getHistoricoSenador(idExterno))),
  ]);
  const casaUrl = casa === "CAMARA" ? "camara" : "senado";

  return (
    <Secao
      id="fidelidade"
      titulo="Partido e fidelidade"
      descricao={
        <>
          Se {nome} vota como o partido e o governo pedem, e por quais partidos já passou
        </>
      }
    >
      <div className="flex flex-col gap-8">
        <section aria-labelledby="fidelidade-votos" className="flex flex-col gap-4">
          <h3 id="fidelidade-votos" className="text-lg font-semibold">
            <Termo id="fidelidade">Fidelidade</Termo> nas votações
          </h3>
          {fidelidade.periodo ? (
            <>
              <dl className="grid gap-3 sm:grid-cols-2">
                <Indicador rotulo="Seguiu o partido" termo="orientacao-bancada" placar={fidelidade.partido} />
                <Indicador rotulo="Seguiu o governo" termo="orientacao-bancada" placar={fidelidade.governo} />
              </dl>
              <p className="text-sm text-muted-foreground">
                Votações <Termo id="votacao-nominal">nominais</Termo> de {formatarData(fidelidade.periodo.desde)} a{" "}
                {formatarData(fidelidade.periodo.ate)} guardadas no portal. Para partidos em{" "}
                <Termo id="bloco-federacao">bloco ou federação</Termo>, vale a orientação do líder do grupo.
              </p>
              <Contrariou casa={casaUrl} itens={fidelidade.contrariou} />
            </>
          ) : (
            <p className="text-muted-foreground">
              Ainda não há votações com orientação de bancada guardadas no portal para {nome}.
            </p>
          )}
        </section>

        <section aria-labelledby="historico-partidos" className="flex flex-col gap-4">
          <h3 id="historico-partidos" className="text-lg font-semibold">
            Partidos e <Termo id="troca-partido">trocas de partido</Termo>
          </h3>
          {historico.ok ? (
            <Historico partidos={historico.dados.partidos} mudancas={historico.dados.mudancas} />
          ) : (
            <AvisoFonte fontes={[historico]} consequencia="Não dá para mostrar o histórico de partidos agora." />
          )}
        </section>
      </div>
    </Secao>
  );
}

function Indicador({ rotulo, termo, placar }: { rotulo: string; termo: IdTermo; placar: Placar }) {
  return (
    <Card size="sm" className="gap-2 px-4 py-4">
      <dt className="text-sm text-muted-foreground">
        <Termo id={termo}>{rotulo}</Termo>
      </dt>
      <dd className="text-3xl leading-none font-bold tabular-nums">{porcentagem(placar.seguiu, placar.consideradas)}</dd>
      {/* aria-hidden: o número já está no texto. */}
      <dd aria-hidden="true">
        <Progress
          value={placar.consideradas ? (placar.seguiu / placar.consideradas) * 100 : 0}
          className="*:data-[slot=progress-track]:h-2"
        />
      </dd>
      <dd className="text-sm text-muted-foreground">
        {placar.consideradas === 0
          ? "Nenhuma votação com orientação"
          : `${placar.seguiu} de ${placar.consideradas} ${placar.consideradas === 1 ? "votação" : "votações"} com orientação`}
      </dd>
    </Card>
  );
}

function Contrariou({
  casa,
  itens,
}: {
  casa: "camara" | "senado";
  itens: Awaited<ReturnType<typeof getFidelidade>>["contrariou"];
}) {
  if (itens.length === 0) {
    return <p>Em nenhuma dessas votações votou contra a orientação do partido.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      <h4 className="font-medium">Votações mais recentes em que contrariou o partido</h4>
      <ul className="flex flex-col divide-y">
        {itens.map((v) => (
          <li key={v.votacaoId} className="flex flex-col gap-1 py-3">
            <Link href={linkVotacao(casa, v.votacaoId)} className="text-link underline">
              {v.proposicao ? `${v.proposicao}: ` : ""}
              {v.descricao}
            </Link>
            <span className="text-sm text-muted-foreground">
              {formatarData(v.data)} · votou <strong className="text-foreground">{v.voto}</strong>
              {v.orientacao && <> · orientação {v.orientacao}</>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Historico({ partidos, mudancas }: { partidos: PeriodoPartido[]; mudancas: MudancaSituacao[] }) {
  if (partidos.length === 0) return <p className="text-muted-foreground">A Casa não informa o histórico de partidos.</p>;
  const trocas = partidos.length - 1;
  return (
    <div className="flex flex-col gap-4">
      <p>
        {trocas === 0
          ? `Sempre no ${partidos[0].partido} nos registros da Casa.`
          : `Trocou de partido ${trocas} ${trocas === 1 ? "vez" : "vezes"} nos registros da Casa.`}
      </p>
      <ol className="flex flex-col gap-2 border-l-2 pl-4">
        {partidos.toReversed().map((p) => (
          <li key={`${p.partido}-${p.desde}`}>
            <strong>{p.partido}</strong>{" "}
            <span className="text-muted-foreground">
              {p.ate ? `de ${formatarData(p.desde)} a ${formatarData(p.ate)}` : `desde ${formatarData(p.desde)}`}
            </span>
          </li>
        ))}
      </ol>
      {mudancas.length > 1 && (
        <details className="rounded-lg border bg-card px-4 py-3 text-sm">
          <summary className="cursor-pointer font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Posses, licenças e afastamentos ({mudancas.length})
          </summary>
          <p className="mt-3 text-muted-foreground">
            O que é uma <Termo id="licenca-parlamentar">licença ou afastamento</Termo>.
          </p>
          <ol className="mt-3 flex flex-col gap-2">
            {mudancas.toReversed().map((m) => (
              <li key={`${m.data}-${m.situacao}`}>
                <span className="tabular-nums">{formatarData(m.data)}</span>: <strong>{m.situacao}</strong>
                {m.descricao && <span className="text-muted-foreground"> ({m.descricao})</span>}
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
