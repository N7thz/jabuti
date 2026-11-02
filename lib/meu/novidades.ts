import "server-only";

import { db } from "@/lib/db";
import type { Casa, TipoVoto } from "@/lib/generated/prisma/enums";
import { centavos, reais } from "@/lib/format/dinheiro";
import { linkParlamentar, linkVotacao } from "@/lib/votacoes/queries";

// Novidades dos parlamentares que a pessoa fixou ou segue, desde a última visita ao painel. Vem do
// banco (cargas diárias); recebe as chaves já lidas da sessão e não guarda nada em cache.

const CHAVE = /^(camara|senado)-(\d{1,10})$/;

/** "camara-204379" → { casa: "CAMARA", idExterno: "204379" }; chave estranha vira null. */
export function lerChaveParlamentar(chave: string): { casa: Casa; idExterno: string } | null {
  const m = chave.match(CHAVE);
  return m ? { casa: m[1] === "camara" ? "CAMARA" : "SENADO", idExterno: m[2] } : null;
}

export interface NovidadeParlamentar {
  chave: string;
  nome: string;
  partido: string | null;
  uf: string | null;
  fotoUrl: string | null;
  perfil: string;
  votos: { total: number; ultimos: { data: Date; descricao: string; tipo: TipoVoto; url: string }[] };
  proposicoes: { rotulo: string; ementa: string; data: Date | null; url: string | null }[];
  /** Último mês com gastos da cota no banco. */
  cota: { ano: number; mes: number; total: number } | null;
  /** Emendas do ano corrente, em centavos. */
  emendas: { quantidade: number; pago: number; empenhado: number } | null;
}

/** Novidades desde a última visita ao painel; na primeira, dos últimos 30 dias. */
export function desdeUltimaVisita(vistoEm: Date | null): Date {
  return vistoEm ?? new Date(Date.now() - 30 * 86_400_000);
}

export async function getNovidades(chaves: string[], desde: Date, ano: number): Promise<NovidadeParlamentar[]> {
  const alvos = chaves.flatMap((c) => {
    const p = lerChaveParlamentar(c);
    return p ? [{ chave: c, ...p }] : [];
  });
  if (alvos.length === 0) return [];

  const parlamentares = await db.parlamentar.findMany({
    where: { OR: alvos.map(({ casa, idExterno }) => ({ casa, idExterno })) },
    select: { id: true, casa: true, idExterno: true, nome: true, partido: true, uf: true, fotoUrl: true },
  });
  const ids = parlamentares.map((p) => p.id);
  if (ids.length === 0) return [];

  const [votos, contagemVotos, proposicoes, cota, emendas] = await Promise.all([
    db.voto.findMany({
      where: { parlamentarId: { in: ids }, votacao: { data: { gt: desde } } },
      orderBy: { votacao: { data: "desc" } },
      take: 200,
      select: {
        parlamentarId: true,
        tipo: true,
        votacao: { select: { casa: true, idExterno: true, data: true, descricao: true } },
      },
    }),
    db.voto.groupBy({
      by: ["parlamentarId"],
      where: { parlamentarId: { in: ids }, votacao: { data: { gt: desde } } },
      _count: true,
    }),
    db.proposicaoAutor.findMany({
      where: { parlamentarId: { in: ids }, proposicao: { dataApresentacao: { gt: desde } } },
      orderBy: { proposicao: { dataApresentacao: "desc" } },
      take: 100,
      select: {
        parlamentarId: true,
        proposicao: { select: { siglaTipo: true, numero: true, ano: true, ementa: true, dataApresentacao: true, url: true } },
      },
    }),
    db.despesaCota.groupBy({
      by: ["parlamentarId", "ano", "mes"],
      where: { parlamentarId: { in: ids }, ano: { gte: ano - 1 } },
      _sum: { valorLiquido: true },
      orderBy: [{ ano: "desc" }, { mes: "desc" }],
    }),
    db.emenda.groupBy({
      by: ["parlamentarId"],
      where: { parlamentarId: { in: ids }, ano },
      _sum: { valorPago: true, valorEmpenhado: true },
      _count: true,
    }),
  ]);

  const emCentavos = (v: { toString(): string } | null) => centavos(reais(Number(v ?? 0)));

  return alvos.flatMap(({ chave, casa, idExterno }) => {
    const p = parlamentares.find((x) => x.casa === casa && x.idExterno === idExterno);
    if (!p) return [];
    const meusVotos = votos.filter((v) => v.parlamentarId === p.id);
    const ultimaCota = cota.find((c) => c.parlamentarId === p.id);
    const minhasEmendas = emendas.find((e) => e.parlamentarId === p.id);
    return [
      {
        chave,
        nome: p.nome,
        partido: p.partido,
        uf: p.uf,
        fotoUrl: p.fotoUrl,
        perfil: linkParlamentar(p.casa, p.idExterno),
        votos: {
          total: contagemVotos.find((c) => c.parlamentarId === p.id)?._count ?? 0,
          ultimos: meusVotos.slice(0, 3).map((v) => ({
            data: v.votacao.data,
            descricao: v.votacao.descricao,
            tipo: v.tipo,
            url: linkVotacao(v.votacao.casa === "CAMARA" ? "camara" : "senado", v.votacao.idExterno),
          })),
        },
        proposicoes: proposicoes
          .filter((x) => x.parlamentarId === p.id)
          .slice(0, 3)
          .map(({ proposicao: q }) => ({
            rotulo: `${q.siglaTipo} ${q.numero}/${q.ano}`,
            ementa: q.ementa,
            data: q.dataApresentacao,
            url: q.url,
          })),
        cota: ultimaCota
          ? { ano: ultimaCota.ano, mes: ultimaCota.mes, total: emCentavos(ultimaCota._sum.valorLiquido) }
          : null,
        emendas: minhasEmendas
          ? {
              quantidade: minhasEmendas._count,
              pago: emCentavos(minhasEmendas._sum.valorPago),
              empenhado: emCentavos(minhasEmendas._sum.valorEmpenhado),
            }
          : null,
      },
    ];
  });
}
