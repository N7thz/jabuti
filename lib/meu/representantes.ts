import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/lib/db";
import { getEmendasMunicipio, getResumoEmendasUf } from "@/lib/emendas/queries";
import type { Uf } from "@/lib/generated/prisma/enums";
import { linkParlamentar } from "@/lib/votacoes/queries";

// "Meus representantes": dados públicos da cidade e do estado escolhidos (o cache é por cidade, nunca
// por pessoa). Quem escolheu qual cidade fica em PerfilUsuario e é lido fora daqui.

/** Cidades de uma UF em ordem alfabética, para a escolha da cidade. */
export async function getMunicipiosDaUf(uf: Uf) {
  "use cache";
  cacheLife("weeks");
  cacheTag("municipios");

  return db.municipio.findMany({ where: { uf }, orderBy: { nome: "asc" }, select: { ibge: true, nome: true } });
}

/** Última eleição geral com votos por cidade no banco (deputado federal e senador). */
const ANO_ELEICAO = 2022;

/** Representantes e dinheiro de uma cidade e do seu estado no ano. */
export async function getRepresentantes(ibge: number, ano: number) {
  "use cache";
  cacheLife("hours");
  cacheTag("municipios", "parlamentares", "emendas", "tse");

  const municipio = await db.municipio.findUnique({
    where: { ibge },
    select: { ibge: true, nome: true, uf: true, populacao: true },
  });
  if (!municipio) return null;
  const uf = municipio.uf;

  const [bancada, maisVotados, emendasCidade, emendasEstado] = await Promise.all([
    db.parlamentar.findMany({
      where: { uf, emExercicio: true },
      orderBy: [{ casa: "desc" }, { nome: "asc" }],
      select: { casa: true, idExterno: true, nome: true, partido: true, fotoUrl: true },
    }),
    // Quem dos parlamentares em exercício teve mais votos nesta cidade na última eleição.
    db.votoMunicipio.findMany({
      where: { municipioIbge: ibge, candidatura: { ano: ANO_ELEICAO, parlamentar: { emExercicio: true } } },
      orderBy: { votos: "desc" },
      take: 10,
      select: {
        votos: true,
        candidatura: {
          select: {
            cargo: true,
            parlamentar: { select: { casa: true, idExterno: true, nome: true, partido: true, uf: true } },
          },
        },
      },
    }),
    getEmendasMunicipio(ibge, ano),
    getResumoEmendasUf(uf, ano),
  ]);

  const autores = Object.values(
    Object.groupBy(emendasCidade.emendas, (e) => e.autorNome ?? "Autor não informado"),
  )
    .map((itens = []) => ({
      autor: itens[0]?.autorNome ?? "Autor não informado",
      quantidade: itens.length,
      pago: itens.reduce((soma, e) => soma + e.totais.pago, 0),
      empenhado: itens.reduce((soma, e) => soma + e.totais.empenhado, 0),
    }))
    .sort((a, b) => b.pago - a.pago || b.empenhado - a.empenhado)
    .slice(0, 5);

  const comLink = <T extends { casa: "CAMARA" | "SENADO"; idExterno: string }>(p: T) => ({
    ...p,
    perfil: linkParlamentar(p.casa, p.idExterno),
  });

  return {
    municipio,
    ano,
    anoEleicao: ANO_ELEICAO,
    senadores: bancada.filter((p) => p.casa === "SENADO").map(comLink),
    deputados: bancada.filter((p) => p.casa === "CAMARA").map(comLink),
    maisVotados: maisVotados.map((v) => ({
      votos: v.votos,
      cargo: v.candidatura.cargo,
      ...comLink(v.candidatura.parlamentar),
    })),
    cidade: { quantidade: emendasCidade.quantidade, totais: emendasCidade.totais, autores },
    estado: { quantidade: emendasEstado.quantidade, totais: emendasEstado.totais },
  };
}

export type Representantes = NonNullable<Awaited<ReturnType<typeof getRepresentantes>>>;
