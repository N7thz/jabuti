import { Termo } from "@/components/termo";
import { Skeleton } from "@/components/ui/skeleton";
import { tentar } from "@/lib/erros";
import { urlConsultaSenado, urlEnqueteCamara } from "@/lib/consultas/ler";
import { getConsultaSenado, getEnqueteCamara } from "@/lib/consultas/queries";
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
 * Placar da consulta popular do projeto: e-Cidadania no Senado, enquete na Câmara (as cinco opções
 * viram três grupos). Sem consulta, não renderiza; fonte fora do ar vira uma linha discreta, porque o
 * placar é um detalhe do cartão, não o cartão.
 */
export async function ConsultaPopular({ casa, id, identificacao }: { casa: "camara" | "senado"; id: number; identificacao: string }) {
  const fonte = casa === "senado" ? "o e-Cidadania" : "as enquetes da Câmara";
  const r = await tentar(fonte, () => (casa === "senado" ? placarSenado(id) : placarCamara(id)));

  if (!r.ok) {
    return <p className="text-sm text-muted-foreground">Não conseguimos consultar {fonte} agora para mostrar a opinião popular.</p>;
  }
  if (!r.dados) return null;
  const { titulo, partes, url, site } = r.dados;

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
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {partes.map((p) => (
              <li key={p.rotulo} className="flex items-center gap-1.5">
                <span aria-hidden="true" className={cn("size-2.5 rounded-full", p.cor)} />
                <span>
                  {p.rotulo} <strong className="font-semibold">{pct.format(p.votos / total)}</strong>{" "}
                  <span className="text-muted-foreground">({inteiro.format(p.votos)})</span>
                </span>
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

export function ConsultaPopularCarregando() {
  return <Skeleton className="h-[5.5rem] w-full rounded-lg" />;
}
