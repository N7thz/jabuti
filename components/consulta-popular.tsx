import { LightbulbIcon, ScaleIcon } from "lucide-react";

import { Termo } from "@/components/termo";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { type OrigemPopular, urlIdeia } from "@/lib/consultas/ideias";
import { tentar } from "@/lib/erros";
import { formatarData } from "@/lib/format/datas";
import { urlConsultaSenado, urlEnqueteCamara } from "@/lib/consultas/ler";
import { getConsultaSenado, getEnqueteCamara, getOrigemPopular } from "@/lib/consultas/queries";
import { cn } from "@/lib/utils";

const pct = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 0 });
const inteiro = new Intl.NumberFormat("pt-BR");

type Parte = { rotulo: string; votos: number; cor: string };

type Placar = { titulo: string; partes: Parte[]; url: string; site: string };

async function placarSenado(codigoMateria: number): Promise<Placar | null> {
  const c = await getConsultaSenado(codigoMateria);
  if (!c) return null;
  return {
    titulo: "Consulta pública no e-Cidadania",
    partes: [
      { rotulo: "Sim", votos: c.sim, cor: "bg-success" },
      { rotulo: "Não", votos: c.nao, cor: "bg-destructive" },
    ],
    url: urlConsultaSenado(codigoMateria),
    site: "do Senado",
  };
}

async function placarCamara(id: number): Promise<Placar | null> {
  const e = await getEnqueteCamara(id);
  if (!e) return null;
  const { votos } = e;
  return {
    titulo: "Enquete da Câmara",
    partes: [
      { rotulo: "Concordam", votos: votos["concordo-totalmente"] + votos["concordo-maior-parte"], cor: "bg-success" },
      { rotulo: "Indecisos", votos: votos.indeciso, cor: "bg-muted-foreground" },
      { rotulo: "Discordam", votos: votos["discordo-totalmente"] + votos["discordo-maior-parte"], cor: "bg-destructive" },
    ],
    url: urlEnqueteCamara(id),
    site: "da Câmara",
  };
}

/**
 * Participação popular no projeto: de que ideia legislativa ele nasceu (só no Senado) e o placar da
 * consulta popular (e-Cidadania no Senado, enquete na Câmara, com as cinco opções em três grupos).
 * Sem nada disso, não renderiza; fonte fora do ar vira uma linha discreta, porque é um detalhe do
 * cartão, não o cartão. A origem popular que falha some em silêncio: é um complemento do placar.
 */
export async function ConsultaPopular({ casa, id, identificacao }: { casa: "camara" | "senado"; id: number; identificacao: string }) {
  const fonte = casa === "senado" ? "o e-Cidadania" : "as enquetes da Câmara";
  const [r, origem] = await Promise.all([
    tentar(fonte, () => (casa === "senado" ? placarSenado(id) : placarCamara(id))),
    casa === "senado" ? tentar("as ideias legislativas do e-Cidadania", () => getOrigemPopular(id)) : null,
  ]);
  const ideia = origem?.ok ? origem.dados : null;

  const placar = !r.ok ? (
    <p className="text-sm text-muted-foreground">Não conseguimos consultar {fonte} agora para mostrar a opinião popular.</p>
  ) : r.dados ? (
    <Placar placar={r.dados} identificacao={identificacao} />
  ) : null;

  if (!ideia) return placar;
  return (
    <div className="flex flex-col gap-2">
      <OrigemIdeia origem={ideia} identificacao={identificacao} />
      {placar}
    </div>
  );
}

/** O que aconteceu entre a ideia e esta matéria, em uma frase. */
function caminhoEmTexto({ caminho, data }: OrigemPopular["passo"]) {
  const quando = formatarData(data);
  switch (caminho.tipo) {
    case "sugestao":
      return `Com os apoios, a ideia virou esta sugestão legislativa em ${quando}, para a Comissão de Direitos Humanos analisar.`;
    case "comissao":
      return `A Comissão de Direitos Humanos do Senado debateu a sugestão e a transformou neste projeto em ${quando}.`;
    case "parlamentar":
      return `${caminho.cargo} ${caminho.nome} (${caminho.uf}) adotou a ideia e a apresentou como este projeto em ${quando}.`;
  }
}

function OrigemIdeia({ origem: { ideia, passo }, identificacao }: { origem: OrigemPopular; identificacao: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/40 p-3 text-sm">
      <p className="font-medium">
        <LightbulbIcon aria-hidden="true" className="me-1.5 inline size-4 align-[-0.125em] text-primary" />
        Nasceu de uma <Termo id="ideia-legislativa">ideia legislativa</Termo> de um cidadão
      </p>
      <p>
        “{ideia.titulo}”
        <span className="text-muted-foreground">
          {" "}
          · {inteiro.format(ideia.apoios)} {ideia.apoios === 1 ? "apoio" : "apoios"}
        </span>
      </p>
      <p className="text-muted-foreground">{caminhoEmTexto(passo)}</p>
      <a
        href={urlIdeia(ideia.id)}
        target="_blank"
        rel="noreferrer"
        className="w-fit text-link underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Ver a ideia no e-Cidadania
        <span className="sr-only"> (origem de {identificacao}, abre em nova aba)</span>
      </a>
    </div>
  );
}

function Placar({ placar: { titulo, partes, url, site }, identificacao }: { placar: Placar; identificacao: string }) {

  const total = partes.reduce((soma, p) => soma + p.votos, 0);

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
      <p className="font-medium">
        <Termo id="consulta-popular">{titulo}</Termo>
        <span className="font-normal text-muted-foreground">
          {" "}
          · {inteiro.format(total)} {total === 1 ? "voto" : "votos"}
        </span>
      </p>
      {total === 0 ? (
        <p className="text-muted-foreground">Ninguém votou ainda.</p>
      ) : (
        <>
          {/* A barra repete o texto logo abaixo, então fica fora da leitura de tela. */}
          <div aria-hidden="true" className="flex h-2 overflow-hidden rounded-full bg-muted">
            {partes.map((p) => (p.votos > 0 ? <div key={p.rotulo} className={p.cor} style={{ width: `${(p.votos / total) * 100}%` }} /> : null))}
          </div>
          {/* Lado a lado, espalhados pela largura da barra: o primeiro na ponta esquerda, o último na direita. */}
          <ul className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 tabular-nums">
            {partes.map((p) => (
              <li key={p.rotulo} className="flex items-center gap-1.5">
                <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-full", p.cor)} />
                <span>{p.rotulo}</span>
                <strong className="font-semibold">{pct.format(p.votos / total)}</strong>
                <span className="text-muted-foreground">({inteiro.format(p.votos)})</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="w-fit text-link underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Ver ou votar no site {site}
        <span className="sr-only"> ({identificacao}, abre em nova aba)</span>
      </a>
    </div>
  );
}

/**
 * "A população disse X, o plenário votou Y": o placar da consulta popular da proposição ao lado do resultado
 * da votação. Sem consulta, ou sem votos nela, não renderiza; fonte fora do ar vira uma linha discreta.
 * A comparação só aparece quando a votação tem resultado (aprovada ou rejeitada) e a consulta tem um lado
 * majoritário; empate ou resultado em aberto mostram só o placar.
 */
export async function OpiniaoNaVotacao({
  casa,
  id,
  identificacao,
  aprovada,
}: {
  casa: "camara" | "senado";
  id: number;
  identificacao: string;
  aprovada: boolean | null;
}) {
  const fonte = casa === "senado" ? "o e-Cidadania" : "as enquetes da Câmara";
  const r = await tentar(fonte, () => (casa === "senado" ? placarSenado(id) : placarCamara(id)));
  if (!r.ok) return <p className="text-sm text-muted-foreground">Não conseguimos consultar {fonte} agora para comparar com a opinião popular.</p>;
  const placar = r.dados;
  if (!placar) return null;

  const favor = placar.partes[0].votos;
  const contra = placar.partes[placar.partes.length - 1].votos;
  const total = placar.partes.reduce((soma, p) => soma + p.votos, 0);
  if (total === 0) return null;

  const maioria = favor === contra ? null : favor > contra ? "favor" : "contra";
  const mesmoLado = maioria && aprovada !== null ? (maioria === "favor") === aprovada : null;
  const plenario = casa === "senado" ? "o Senado" : "a Câmara";
  const lado =
    maioria === "favor"
      ? `${pct.format(favor / total)} apoiam ${identificacao}`
      : maioria === "contra"
        ? `${pct.format(contra / total)} são contra ${identificacao}`
        : `o placar está empatado`;

  return (
    <section aria-labelledby="opiniao-popular" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <h2 id="opiniao-popular" className="flex items-center gap-2 text-xl font-bold">
        <ScaleIcon aria-hidden="true" className="size-5 text-secao" />A população e o plenário
      </h2>
      <p className="max-w-[75ch] text-lg">
        Entre as {inteiro.format(total)} pessoas que votaram na <Termo id="consulta-popular">consulta popular</Termo>, {lado}.
        {aprovada !== null && ` Nesta votação, ${plenario} ${aprovada ? "aprovou" : "rejeitou"}.`}
      </p>
      {mesmoLado !== null && (
        <p>
          <Badge variant={mesmoLado ? "secondary" : "destructive"} className="text-sm">
            {mesmoLado ? "O plenário foi para o mesmo lado da consulta" : "O plenário foi para o lado oposto ao da consulta"}
          </Badge>
        </p>
      )}
      <Placar placar={placar} identificacao={identificacao} />
      <p className="max-w-[75ch] text-sm text-muted-foreground">
        A consulta é aberta a quem quiser votar no site {placar.site}: mostra quem se mobilizou, não é uma pesquisa com amostra
        da população. E se esta votação for de um requerimento ou de um destaque, aprovar não é o mesmo que aprovar o projeto.
      </p>
    </section>
  );
}

export function OpiniaoNaVotacaoCarregando() {
  return <Skeleton className="h-48 w-full rounded-xl" />;
}

export function ConsultaPopularCarregando() {
  return <Skeleton className="h-[5.5rem] w-full rounded-lg" />;
}
