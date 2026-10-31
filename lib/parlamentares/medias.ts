import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/lib/db";
import { centavos, reais } from "@/lib/format/dinheiro";
import type { Casa } from "@/lib/generated/prisma/enums";

// Média da casa para dar uma base aos números da comparação. As APIs só dão os dados de um
// parlamentar por vez, então a média sai do banco (as cargas diárias de Câmara, Senado e emendas).
// Cada indicador segue a mesma regra do resumo individual (lib/parlamentares/comparacao.ts).

/** Votos do Senado que contam como presença na votação nominal (o resto é ausência, justificada ou não). */
const PRESENTE_NO_SENADO = ["SIM", "NAO", "ABSTENCAO", "OBSTRUCAO", "PRESIDENTE", "PRESENTE_SEM_VOTO", "VOTO_SECRETO"] as const;

/**
 * Média por parlamentar em exercício na casa, no ano (valores em centavos). Cada indicador vem
 * `null` quando o banco ainda não tem dados dele no ano, para a página não mostrar uma média zerada.
 */
export async function getMediasDaCasa(casa: Casa, ano: number) {
  "use cache";
  cacheLife("hours");
  cacheTag("medias", "cota", "emendas");

  const inicio = new Date(Date.UTC(ano, 0, 1));
  const fim = new Date(Date.UTC(ano + 1, 0, 1));
  const doAno = { gte: inicio, lt: fim };
  const daCasa = { parlamentar: { casa } };

  const presenca =
    casa === "CAMARA"
      ? (async () => {
          // Mesmo critério da página do deputado: sessões deliberativas do plenário já encerradas.
          const sessao = { casa, tipo: "Sessão Deliberativa", situacao: "Encerrada", orgaoSigla: "PLEN", inicio: doAno };
          const [sessoes, presencas] = await Promise.all([
            db.evento.count({ where: sessao }),
            db.presenca.count({ where: { situacao: "PRESENTE", evento: sessao } }),
          ]);
          return { parte: presencas, total: sessoes };
        })()
      : (async () => {
          const votos = await db.voto.groupBy({
            by: ["tipo"],
            where: { votacao: { casa, data: doAno } },
            _count: true,
          });
          const contar = (presente: boolean) =>
            votos
              .filter((v) => (PRESENTE_NO_SENADO as readonly string[]).includes(v.tipo) === presente)
              .filter((v) => presente || v.tipo === "AUSENTE" || v.tipo === "AUSENCIA_JUSTIFICADA")
              .reduce((soma, v) => soma + v._count, 0);
          const presentes = contar(true);
          return { parte: presentes, total: presentes + contar(false) };
        })();

  const [emExercicio, cota, gastaram, proposicoes, emendas, presencaCasa] = await Promise.all([
    db.parlamentar.count({ where: { casa, emExercicio: true } }),
    db.despesaCota.aggregate({ where: { ano, ...daCasa }, _sum: { valorLiquido: true } }),
    db.despesaCota.groupBy({ by: ["parlamentarId"], where: { ano, ...daCasa } }),
    db.proposicaoAutor.count({
      where: { ...daCasa, proposicao: { dataApresentacao: { gte: new Date(Date.now() - 365 * 86_400_000) } } },
    }),
    db.emenda.aggregate({ where: { ano, ...daCasa }, _sum: { valorEmpenhado: true, valorPago: true }, _count: true }),
    presenca,
  ]);

  if (emExercicio === 0) return null;
  const porParlamentar = (valor: { toString(): string } | null, n = emExercicio) =>
    centavos(reais(Number(valor ?? 0) / n));

  return {
    parlamentares: emExercicio,
    // Na Câmara o total de sessões vale para todos; a média é a fração das cadeiras ocupadas nelas.
    presenca:
      presencaCasa.total === 0
        ? null
        : casa === "CAMARA"
          ? { parte: presencaCasa.parte / emExercicio, total: presencaCasa.total }
          : presencaCasa,
    // Só quem lançou algum gasto: quem saiu ou entrou no meio do ano não puxa a média para baixo.
    cota: gastaram.length === 0 ? null : porParlamentar(cota._sum.valorLiquido, gastaram.length),
    proposicoes: proposicoes === 0 ? null : proposicoes / emExercicio,
    emendas:
      emendas._count === 0
        ? null
        : {
            quantidade: emendas._count / emExercicio,
            empenhado: porParlamentar(emendas._sum.valorEmpenhado),
            pago: porParlamentar(emendas._sum.valorPago),
          },
  };
}

export type MediasDaCasa = NonNullable<Awaited<ReturnType<typeof getMediasDaCasa>>>;
