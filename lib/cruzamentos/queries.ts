import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/lib/db";
import { centavos, reais } from "@/lib/format/dinheiro";
import type { Casa } from "@/lib/generated/prisma/enums";

// Cruza duas fontes que nenhuma API junta: onde o parlamentar foi votado (TSE, por município) e para
// onde ele mandou emendas (Portal da Transparência). Só dá para fazer no banco.

const TOP = 10;

/**
 * Votos da última eleição por município × emendas com destino municipal feitas depois dela.
 * `null` quando não há candidatura ligada ao parlamentar ou nenhum voto com município.
 */
export async function getVotosEEmendas(casa: Casa, idExterno: string) {
  "use cache";
  cacheLife("days");
  cacheTag("cruzamentos", `${casa}:${idExterno}`);

  const parlamentar = await db.parlamentar.findUnique({
    where: { casa_idExterno: { casa, idExterno } },
    select: { id: true, candidaturas: { orderBy: { ano: "desc" }, take: 1, select: { id: true, ano: true, totalVotos: true } } },
  });
  const candidatura = parlamentar?.candidaturas[0];
  if (!parlamentar || !candidatura) return null;

  const [votos, emendas] = await Promise.all([
    db.votoMunicipio.groupBy({
      by: ["municipioIbge"],
      where: { candidaturaId: candidatura.id, municipioIbge: { not: null } },
      _sum: { votos: true },
    }),
    db.emenda.groupBy({
      by: ["municipioIbge"],
      where: { parlamentarId: parlamentar.id, municipioIbge: { not: null }, ano: { gt: candidatura.ano } },
      _sum: { valorEmpenhado: true, valorPago: true },
    }),
  ]);
  if (votos.length === 0) return null;

  const votosPorCidade = new Map(votos.map((v) => [v.municipioIbge!, v._sum.votos ?? 0]));
  const totalVotos = [...votosPorCidade.values()].reduce((a, b) => a + b, 0);
  const emendasPorCidade = new Map(
    emendas.map((e) => [
      e.municipioIbge!,
      {
        empenhado: centavos(reais(e._sum.valorEmpenhado ?? 0)),
        pago: centavos(reais(e._sum.valorPago ?? 0)),
      },
    ]),
  );
  const totalEmpenhado = [...emendasPorCidade.values()].reduce((a, e) => a + e.empenhado, 0);

  const maisVotadas = [...votosPorCidade.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP);
  const ibgesMaisVotadas = new Set(maisVotadas.map(([ibge]) => ibge));
  const votosNasMaisVotadas = maisVotadas.reduce((a, [, v]) => a + v, 0);
  const empenhadoNasMaisVotadas = [...emendasPorCidade.entries()]
    .filter(([ibge]) => ibgesMaisVotadas.has(ibge))
    .reduce((a, [, e]) => a + e.empenhado, 0);
  const semVoto = [...emendasPorCidade.keys()].filter((ibge) => !votosPorCidade.has(ibge));

  const maisEmendas = [...emendasPorCidade.entries()].sort((a, b) => b[1].empenhado - a[1].empenhado).slice(0, TOP);
  const ibges = [...new Set([...maisVotadas.map(([i]) => i), ...maisEmendas.map(([i]) => i)])];
  const municipios = new Map(
    (await db.municipio.findMany({ where: { ibge: { in: ibges } }, select: { ibge: true, nome: true, uf: true } })).map((m) => [m.ibge, m]),
  );

  const linha = (ibge: number) => ({
    ibge,
    nome: municipios.get(ibge)?.nome ?? `Município ${ibge}`,
    uf: municipios.get(ibge)?.uf ?? null,
    votos: votosPorCidade.get(ibge) ?? 0,
    empenhado: emendasPorCidade.get(ibge)?.empenhado ?? 0,
    pago: emendasPorCidade.get(ibge)?.pago ?? 0,
  });

  return {
    eleicao: candidatura.ano,
    totalVotos,
    cidadesComVoto: votosPorCidade.size,
    cidadesComEmenda: emendasPorCidade.size,
    totalEmpenhado,
    votosNasMaisVotadas,
    empenhadoNasMaisVotadas,
    cidadesComEmendaSemVoto: semVoto.length,
    maisVotadas: maisVotadas.map(([ibge]) => linha(ibge)),
    maisEmendas: maisEmendas.map(([ibge]) => linha(ibge)),
  };
}

export type VotosEEmendas = NonNullable<Awaited<ReturnType<typeof getVotosEEmendas>>>;
