import { ExternalLinkIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BaixarCsv } from "@/components/baixar-csv";
import { Compartilhar } from "@/components/compartilhar";
import { Secao } from "@/components/perfil-parlamentar";
import { Termo } from "@/components/termo";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ListaNominal, PlacarGeral, TabelaPlacar } from "@/components/votacoes/placar";
import { formatarData } from "@/lib/format/datas";
import { contarPlacar } from "@/lib/votacoes/rotulos";
import { getVotacaoCamara, getVotacaoSenado, linkVotacao, type CasaUrl } from "@/lib/votacoes/queries";

async function votacaoDaUrl(params: PageProps<"/votacoes/[casa]/[id]">["params"]) {
  const { casa, id } = await params;
  // Câmara: "2455564-65"; Senado: código numérico da sessão de votação.
  if (casa === "camara" && /^[\d-]{3,30}$/.test(id)) return getVotacaoCamara(id);
  if (casa === "senado" && /^\d{1,10}$/.test(id)) return getVotacaoSenado(id);
  return null;
}

export async function generateMetadata({ params }: PageProps<"/votacoes/[casa]/[id]">): Promise<Metadata> {
  const v = await votacaoDaUrl(params);
  return { title: v ? `${v.proposicao?.rotulo ?? "Votação"} de ${formatarData(v.data)} · Jabuti` : "Votação · Jabuti" };
}

export default function VotacaoPage({ params }: PageProps<"/votacoes/[casa]/[id]">) {
  return (
    <div data-secao="parlamentares" className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 xs:px-6 py-[clamp(2rem,5vw,4rem)]">
      <Suspense
        fallback={
          <div role="status" aria-label="Carregando votação" className="flex flex-col gap-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-14 w-full max-w-3xl" />
            <Skeleton className="h-24" />
            <Skeleton className="h-96" />
          </div>
        }
      >
        <Votacao params={params} />
      </Suspense>
    </div>
  );
}

async function Votacao({ params }: { params: PageProps<"/votacoes/[casa]/[id]">["params"] }) {
  const v = await votacaoDaUrl(params);
  if (!v) notFound();

  const placar = contarPlacar(v.votos);
  const nomeCasa = v.casa === "camara" ? "Câmara dos Deputados" : "Senado Federal";
  const titulo = v.proposicao ? `Votação do ${v.proposicao.rotulo}` : "Votação no plenário";
  const textoCompartilhar =
    placar.total > 0
      ? `${titulo} (${nomeCasa}, ${formatarData(v.data)}): ${placar.SIM} sim, ${placar.NAO} não. Veja como cada parlamentar votou:`
      : `${titulo} (${nomeCasa}, ${formatarData(v.data)}):`;

  return (
    <>
      <header className="flex flex-col gap-3 animate-enter">
        <p className="text-sm font-medium tracking-wide text-secao uppercase">
          {nomeCasa} · {formatarData(v.data)}
          {v.orgao && v.orgao !== "PLEN" && ` · ${v.orgao}`}
        </p>
        <h1 className="text-[clamp(1.75rem,3.5vw,2.75rem)] leading-tight font-bold">{titulo}</h1>
        {v.proposicao?.ementa && <p className="max-w-[75ch] text-lg text-muted-foreground">{v.proposicao.ementa}</p>}
        <p className="max-w-[75ch]">{v.descricao}</p>
        <div className="flex flex-wrap items-center gap-3">
          {v.resultado && (
            <Badge variant={v.aprovada === false ? "destructive" : "secondary"} className="text-sm">
              {v.resultado}
            </Badge>
          )}
          {v.proposicao?.url && (
            <a href={v.proposicao.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-link underline">
              Texto e tramitação no site oficial <ExternalLinkIcon aria-hidden="true" className="size-3.5" />
              <span className="sr-only">(abre em nova aba)</span>
            </a>
          )}
          <a href={v.fonte} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-link underline">
            Fonte oficial <ExternalLinkIcon aria-hidden="true" className="size-3.5" />
            <span className="sr-only">(abre em nova aba)</span>
          </a>
        </div>
        <Compartilhar texto={textoCompartilhar} caminho={linkVotacao(v.casa, v.id)} />
      </header>

      {placar.total === 0 ? (
        <p className="rounded-lg border bg-card p-4">
          Esta foi uma <Termo id="votacao-simbolica">votação simbólica</Termo>: o resultado foi anunciado sem registrar o voto
          de cada parlamentar, então não há placar nominal.
        </p>
      ) : (
        <>
          <section aria-labelledby="placar" className="flex flex-col gap-3">
            <h2 id="placar" className="text-xl font-bold">
              Placar da <Termo id="votacao-nominal">votação nominal</Termo>
            </h2>
            <PlacarGeral placar={placar} />
            <p className="text-sm text-muted-foreground">
              &quot;Outros&quot; reúne quem presidia a sessão, votos secretos, presenças sem voto e ausências registradas.
              {v.casa === "camara" && " A Câmara só lista quem registrou voto; quem faltou não aparece."}
            </p>
            <BaixarCsv href={`/api/csv/votacao?casa=${v.casa}&id=${encodeURIComponent(v.id)}`} rotulo="Baixar a lista de votos" />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Secao titulo="Por partido" descricao="Como cada partido votou, do maior para o menor">
              <TabelaPlacar titulo="Placar por partido" votos={v.votos} grupo={(voto) => voto.partido} />
            </Secao>
            <Secao titulo="Por estado" descricao="Como cada bancada estadual votou">
              <TabelaPlacar titulo="Placar por estado" votos={v.votos} grupo={(voto) => voto.uf} />
            </Secao>
          </div>

          <Secao titulo="Voto de cada parlamentar" descricao="Clique no nome para ver o perfil">
            <ListaNominal votos={v.votos} />
          </Secao>
        </>
      )}

      {v.outras.length > 0 && (
        <Secao titulo={`Outras votações do ${v.proposicao?.rotulo}`} descricao="Requerimentos, destaques e outras etapas da mesma proposta">
          <ul className="flex flex-col gap-2">
            {v.outras.map((o) => (
              <li key={o.id}>
                <Link href={linkVotacao(v.casa as CasaUrl, o.id)} className="text-link underline">
                  {formatarData(o.data)}: {o.descricao}
                </Link>
                {o.resultado && <span className="text-muted-foreground"> · {o.resultado}</span>}
              </li>
            ))}
          </ul>
        </Secao>
      )}
    </>
  );
}
