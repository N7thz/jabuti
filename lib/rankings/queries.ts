import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/lib/db";
import { centavos, reais } from "@/lib/format/dinheiro";
import type { Casa } from "@/lib/generated/prisma/enums";

// Ranking da cota parlamentar: as APIs só dão os gastos de um parlamentar por vez, então comparar
// todos exige o banco (sync-camara e sync-senado gravam DespesaCota).

export const LIMITE_RANKING = 50;

/** Anos e categorias com gastos no banco, para os filtros. As categorias da Câmara e do Senado têm nomes diferentes. */
export async function getOpcoesCota() {
  "use cache";
  cacheLife("hours");
  cacheTag("cota");

  const [anos, categorias] = await Promise.all([
    db.despesaCota.groupBy({ by: ["ano"], orderBy: { ano: "desc" } }),
    db.despesaCota.groupBy({
      by: ["tipoDespesa"],
      _sum: { valorLiquido: true },
      orderBy: { _sum: { valorLiquido: "desc" } },
    }),
  ]);
  return { anos: anos.map((a) => a.ano), categorias: categorias.map((c) => c.tipoDespesa) };
}

export interface FiltroRankingCota {
  ano: number;
  casa?: Casa;
  categoria?: string;
}

/** Quem mais gastou da cota no ano, no total ou numa categoria. Valores em centavos. */
export async function getRankingCota({ ano, casa, categoria }: FiltroRankingCota, limite = LIMITE_RANKING) {
  "use cache";
  cacheLife("hours");
  cacheTag("cota");

  const where = { ano, tipoDespesa: categoria, parlamentar: casa ? { casa } : undefined };
  const [grupos, geral] = await Promise.all([
    db.despesaCota.groupBy({
      by: ["parlamentarId"],
      where,
      _sum: { valorLiquido: true },
      _count: true,
      orderBy: { _sum: { valorLiquido: "desc" } },
      take: limite,
    }),
    db.despesaCota.aggregate({ where, _sum: { valorLiquido: true }, _count: true }),
  ]);
  const quantosGastaram = (await db.despesaCota.groupBy({ by: ["parlamentarId"], where })).length;

  const parlamentares = new Map(
    (
      await db.parlamentar.findMany({
        where: { id: { in: grupos.map((g) => g.parlamentarId) } },
        select: { id: true, casa: true, idExterno: true, nome: true, partido: true, uf: true },
      })
    ).map((p) => [p.id, p]),
  );

  return {
    total: centavos(reais(geral._sum.valorLiquido ?? 0)),
    lancamentos: geral._count,
    parlamentares: quantosGastaram,
    linhas: grupos.flatMap((g, i) => {
      const p = parlamentares.get(g.parlamentarId);
      if (!p) return [];
      return [
        {
          posicao: i + 1,
          casa: p.casa,
          idExterno: p.idExterno,
          nome: p.nome,
          partido: p.partido,
          uf: p.uf,
          total: centavos(reais(g._sum.valorLiquido ?? 0)),
          lancamentos: g._count,
        },
      ];
    }),
  };
}
