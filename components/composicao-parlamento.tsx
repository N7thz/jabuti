import type { CSSProperties, ReactNode } from "react";

import { corDoPartido, COR_OUTROS } from "@/lib/eleicoes/cores";
import type { Composicao } from "@/lib/eleicoes/eleitos";
import { distribuirCadeiras, hemiciclo, OUTROS } from "@/lib/eleicoes/hemiciclo";
import { cn } from "@/lib/utils";

/** Escala do desenho: o raio de fora do semicírculo vale 100 unidades do viewBox. */
const ESCALA = 100;
const arred = (n: number) => Math.round(n * 100) / 100;

const UNIDADE = { camara: ["deputado", "deputados"], senado: ["senador", "senadores"] } as const;

const cor = (partido: string) => (partido === OUTROS ? COR_OUTROS : corDoPartido(partido));
/** Cor do partido nos dois temas, como variáveis CSS; quem usa escolhe com `fill-(--c) dark:fill-(--ce)`. */
const varsDeCor = (partido: string) => {
  const { claro, escuro } = cor(partido);
  return { "--c": claro, "--ce": escuro } as CSSProperties;
};

/**
 * Composição de uma casa em semicírculo (hemiciclo): cada bolinha é uma cadeira, colorida pelo partido, e o
 * total fica no centro. Desenhado no servidor, sem biblioteca de gráfico. O desenho é só um resumo visual: a
 * legenda ao lado é uma lista com a sigla e o número de cadeiras de cada partido, em texto, e é ela que o leitor
 * de tela lê. Passando o mouse numa fatia, o navegador mostra o partido e as cadeiras (<title>).
 */
export function ComposicaoParlamento({
  composicao,
  titulo,
  subtitulo,
  nota,
}: {
  composicao: Composicao;
  titulo: string;
  subtitulo?: ReactNode;
  /** Explicação abaixo da legenda (ex.: de onde vêm as cadeiras do Senado ou por que o total não fecha). */
  nota?: ReactNode;
}) {
  const { casa, grupos, total } = composicao;
  const [singular, plural] = UNIDADE[casa];
  const { cadeiras, raio, raioInterno } = hemiciclo(total);
  const donoDe = distribuirCadeiras(grupos);
  const r = arred(raio * ESCALA);
  const margem = r + 2;
  const id = `composicao-${casa}`;

  // Cadeiras agrupadas por partido: um <g> por fatia, com a cor e o <title> do partido.
  const porGrupo = grupos.map((g) => ({ grupo: g, pontos: [] as { x: number; y: number }[] }));
  cadeiras.forEach((c, i) => {
    const indice = grupos.indexOf(donoDe[i]);
    porGrupo[indice]?.pontos.push({ x: arred(c.x * ESCALA), y: arred(c.y * ESCALA) });
  });

  const tamanhoTotal = Math.max(14, Math.min(26, raioInterno * ESCALA * 0.5));

  return (
    <figure aria-labelledby={`${id}-titulo`} className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-soft sm:p-6">
      <div className="flex flex-col gap-1">
        <h3 id={`${id}-titulo`} className="text-lg font-semibold">
          {titulo}
        </h3>
        {subtitulo && <p className="text-sm text-muted-foreground">{subtitulo}</p>}
      </div>

      <div className="flex flex-col gap-5">
        <svg
          viewBox={`${-ESCALA - margem} ${-ESCALA - margem} ${2 * (ESCALA + margem)} ${ESCALA + 2 * margem}`}
          role="img"
          aria-label={`Gráfico em meia-lua com ${total} ${total === 1 ? singular : plural}, cada um uma bolinha colorida pelo partido. Os números de cada partido estão na lista ao lado.`}
          // Bancada pequena (um estado) não precisa ocupar a largura toda.
          className={cn("mx-auto h-auto w-full", total > 30 ? "max-w-lg" : total > 8 ? "max-w-xs" : "max-w-56")}
        >
          {porGrupo.map(({ grupo, pontos }) => (
            <g key={grupo.partido} style={varsDeCor(grupo.partido)} className="fill-(--c) dark:fill-(--ce)">
              <title>{`${grupo.partido}: ${grupo.assentos} ${grupo.assentos === 1 ? "cadeira" : "cadeiras"}`}</title>
              {pontos.map((p) => (
                <circle key={`${p.x},${p.y}`} cx={p.x} cy={p.y} r={r} />
              ))}
            </g>
          ))}
          <text
            x={0}
            y={-tamanhoTotal * 0.55}
            textAnchor="middle"
            className="fill-foreground font-bold tabular-nums"
            style={{ fontSize: tamanhoTotal }}
          >
            {total}
          </text>
          <text x={0} y={tamanhoTotal * 0.15} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: tamanhoTotal * 0.42 }}>
            {total === 1 ? singular : plural}
          </text>
        </svg>

        <div className="flex flex-col gap-2">
          <h4 id={`${id}-legenda`} className="text-sm font-medium text-muted-foreground">
            Cadeiras por partido
          </h4>
          <ul aria-labelledby={`${id}-legenda`} className="columns-2 gap-x-8 text-sm">
            {grupos.map((g) => (
              <li key={g.partido} className="mb-1.5 break-inside-avoid">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span
                    aria-hidden="true"
                    style={varsDeCor(g.partido)}
                    className="size-3 shrink-0 self-center rounded-full bg-(--c) dark:bg-(--ce)"
                  />
                  <span className="font-medium">{g.partido}</span>
                  <span className="ms-auto tabular-nums">
                    {g.assentos}
                    <span className="sr-only"> {g.assentos === 1 ? "cadeira" : "cadeiras"}</span>
                  </span>
                </span>
                {g.outros && (
                  <span className="mt-0.5 block pl-5 text-xs text-muted-foreground">
                    {g.outros.map((o) => `${o.partido} ${o.assentos}`).join(" · ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="border-t pt-2 text-sm">
            Total: <strong className="tabular-nums">{total}</strong> {total === 1 ? singular : plural}
          </p>
        </div>
      </div>

      {nota && <div className="text-sm text-muted-foreground">{nota}</div>}
    </figure>
  );
}
