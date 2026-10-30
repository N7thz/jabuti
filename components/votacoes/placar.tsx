import Link from "next/link";

import { Tabela, TBody, Td, Th, THead, Tr } from "@/components/emendas/tabela";
import { Card } from "@/components/ui/card";
import type { TipoVoto } from "@/lib/generated/prisma/enums";
import { contarPlacar, placarPorGrupo, ROTULO_VOTO, type ColunaPlacar, type Placar } from "@/lib/votacoes/rotulos";
import type { VotoNominal } from "@/lib/votacoes/queries";
import { cn } from "@/lib/utils";

const COLUNAS: { chave: ColunaPlacar; rotulo: string }[] = [
  { chave: "SIM", rotulo: "Sim" },
  { chave: "NAO", rotulo: "Não" },
  { chave: "ABSTENCAO", rotulo: "Abstenção" },
  { chave: "OBSTRUCAO", rotulo: "Obstrução" },
  { chave: "OUTROS", rotulo: "Outros" },
];

/** Cor só reforça o texto (o rótulo do voto sempre aparece escrito). */
export function corDoVoto(tipo: TipoVoto) {
  if (tipo === "SIM") return "border-emerald-700/40 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100";
  if (tipo === "NAO") return "border-red-700/40 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100";
  return "border-border bg-muted text-foreground";
}

export function SeloVoto({ tipo, original }: { tipo: TipoVoto; original?: string }) {
  return (
    <span
      title={original && original !== ROTULO_VOTO[tipo] ? original : undefined}
      className={cn("inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", corDoVoto(tipo))}
    >
      {ROTULO_VOTO[tipo]}
    </span>
  );
}

export function PlacarGeral({ placar }: { placar: Placar }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {[...COLUNAS, { chave: "total" as const, rotulo: "Total de registros" }].map((c) => (
        <Card key={c.chave} size="sm" className="gap-1 px-4 py-3">
          <dt className="text-sm text-muted-foreground">{c.rotulo}</dt>
          <dd className="text-2xl font-bold tabular-nums">{placar[c.chave]}</dd>
        </Card>
      ))}
    </dl>
  );
}

export function TabelaPlacar({ titulo, votos, grupo }: { titulo: string; votos: VotoNominal[]; grupo: (v: VotoNominal) => string | null }) {
  const linhas = placarPorGrupo(votos, grupo);
  return (
    <Tabela legenda={titulo}>
      <THead>
        <Tr>
          <Th>Grupo</Th>
          {COLUNAS.map((c) => (
            <Th key={c.chave} numero>
              {c.rotulo}
            </Th>
          ))}
          <Th numero>Total</Th>
        </Tr>
      </THead>
      <TBody>
        {linhas.map((l) => (
          <Tr key={l.nome}>
            <Th scope="row">{l.nome}</Th>
            {COLUNAS.map((c) => (
              <Td key={c.chave} numero rotulo={c.rotulo}>
                {l.placar[c.chave]}
              </Td>
            ))}
            <Td numero rotulo="Total">
              {l.placar.total}
            </Td>
          </Tr>
        ))}
      </TBody>
    </Tabela>
  );
}

/** Lista nominal agrupada pelo voto, cada grupo recolhível (funciona sem JavaScript). */
export function ListaNominal({ votos }: { votos: VotoNominal[] }) {
  const grupos = Object.entries(Object.groupBy(votos, (v) => v.tipo)) as [TipoVoto, VotoNominal[]][];
  grupos.sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="flex flex-col gap-3">
      {grupos.map(([tipo, itens]) => (
        <details key={tipo} className="rounded-lg border bg-card" open={tipo === "SIM" || tipo === "NAO"}>
          <summary className="cursor-pointer px-4 py-3 font-semibold">
            {ROTULO_VOTO[tipo]} · {itens.length} {itens.length === 1 ? "parlamentar" : "parlamentares"}
          </summary>
          <ul className="grid gap-x-6 gap-y-1 px-4 pb-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {itens.map((v) => (
              <li key={`${v.nome}-${v.perfil}`}>
                {v.perfil ? (
                  <Link href={v.perfil} className="text-link underline">
                    {v.nome}
                  </Link>
                ) : (
                  v.nome
                )}{" "}
                <span className="text-muted-foreground">
                  ({v.partido ?? "sem partido"}
                  {v.uf && `/${v.uf}`})
                </span>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}

export { contarPlacar };
