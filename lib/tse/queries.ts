import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/lib/db";
import type { Casa } from "@/lib/generated/prisma/enums";
import type { Prisma } from "@/lib/generated/prisma/client";

import { fatorIpca, lerSerieIpca, URL_IPCA } from "./ipca";

// Decimal do Prisma não atravessa o "use cache"; tudo sai em centavos, como em lib/emendas/queries.
const emCentavos = (valor: Prisma.Decimal | null | undefined) => (valor ? Number(valor.toFixed(2).replace(".", "")) : 0);

/**
 * Eleição que pôs o parlamentar no cargo (a candidatura eleita mais recente sincronizada do TSE):
 * votos, bens declarados, quem financiou a campanha e onde ele foi votado, cruzado com as emendas
 * pagas que ele mandou para cada uma dessas cidades. `null` se o TSE ainda não foi sincronizado para ele.
 * `cpf` vem junto só para casar com outras fontes (TCU); não exiba.
 */
export async function getCampanhaParlamentar(parlamentar: { casa: Casa; idExterno: string }) {
  "use cache";
  cacheLife("days");
  cacheTag("tse", `tse:${parlamentar.casa}:${parlamentar.idExterno}`);

  const candidatura = await db.candidatura.findFirst({
    where: { parlamentar: { casa: parlamentar.casa, idExterno: parlamentar.idExterno } },
    orderBy: { ano: "desc" },
  });
  if (!candidatura) return null;

  const [bens, porFonte, doadores, votos] = await Promise.all([
    db.bemDeclarado.findMany({ where: { candidaturaId: candidatura.id }, orderBy: { valor: "desc" }, take: 10 }),
    db.receitaCampanha.groupBy({ by: ["fonte"], where: { candidaturaId: candidatura.id }, _sum: { valor: true } }),
    db.receitaCampanha.findMany({ where: { candidaturaId: candidatura.id }, orderBy: { valor: "desc" }, take: 10 }),
    db.votoMunicipio.findMany({
      where: { candidaturaId: candidatura.id, municipioIbge: { not: null } },
      orderBy: { votos: "desc" },
      take: 15,
    }),
  ]);

  const ibges = votos.map((v) => v.municipioIbge!);
  const [municipios, emendas] = await Promise.all([
    db.municipio.findMany({ where: { ibge: { in: ibges } }, select: { ibge: true, nome: true, uf: true } }),
    db.emenda.groupBy({
      by: ["municipioIbge"],
      where: { parlamentarId: candidatura.parlamentarId, municipioIbge: { in: ibges } },
      _sum: { valorPago: true },
    }),
  ]);
  const nomes = new Map(municipios.map((m) => [m.ibge, m]));
  const pagoPorCidade = new Map(emendas.map((e) => [e.municipioIbge, emCentavos(e._sum.valorPago)]));

  return {
    ano: candidatura.ano,
    cargo: candidatura.cargo,
    uf: candidatura.uf,
    numero: candidatura.numero,
    nomeUrna: candidatura.nomeUrna,
    partido: candidatura.partido,
    resultado: candidatura.resultado,
    cpf: candidatura.cpf,
    totalVotos: candidatura.totalVotos,
    totalBens: emCentavos(candidatura.totalBens),
    totalReceitas: emCentavos(candidatura.totalReceitas),
    bens: bens.map((b) => ({ tipo: b.tipo, descricao: b.descricao, valor: emCentavos(b.valor) })),
    receitasPorFonte: porFonte
      .map((r) => ({ fonte: r.fonte, valor: emCentavos(r._sum.valor) }))
      .sort((a, b) => b.valor - a.valor),
    doadores: doadores.map((d) => ({ doador: d.doador, origem: d.origem, fonte: d.fonte, valor: emCentavos(d.valor) })),
    cidades: votos.map((v) => ({
      ibge: v.municipioIbge!,
      nome: nomes.get(v.municipioIbge!)?.nome ?? `Município ${v.municipioIbge}`,
      uf: nomes.get(v.municipioIbge!)?.uf ?? candidatura.uf,
      votos: v.votos,
      emendasPagas: pagoPorCidade.get(v.municipioIbge!) ?? 0,
    })),
  };
}

/** IPCA mensal do Banco Central; `null` se a fonte estiver fora do ar (a tela mostra só os valores declarados). */
async function getIpca() {
  "use cache";
  cacheTag("ipca");
  try {
    const resposta = await fetch(URL_IPCA, { signal: AbortSignal.timeout(10_000) });
    if (!resposta.ok) throw new Error(`BCB respondeu ${resposta.status}`);
    const serie = lerSerieIpca(await resposta.json());
    cacheLife("days");
    return serie;
  } catch {
    cacheLife("minutes");
    return null;
  }
}

/**
 * Total de bens declarado ao TSE em cada eleição que o parlamentar disputou (2014 a 2024), do mais antigo
 * ao mais novo, com o valor corrigido pelo IPCA até o último mês publicado quando o Banco Central responde.
 */
export async function getPatrimonioParlamentar(parlamentar: { casa: Casa; idExterno: string }) {
  "use cache";
  cacheLife("days");
  cacheTag("tse", `tse:${parlamentar.casa}:${parlamentar.idExterno}`);

  const [eleicoes, ipca] = await Promise.all([
    db.patrimonioEleicao.findMany({
      where: { parlamentar: { casa: parlamentar.casa, idExterno: parlamentar.idExterno } },
      orderBy: { ano: "asc" },
    }),
    getIpca(),
  ]);
  const ultimoMes = ipca?.at(-1);

  return {
    /** Mês do último IPCA usado na correção; `null` sem correção. */
    corrigidoAte: ultimoMes ? { ano: ultimoMes.ano, mes: ultimoMes.mes } : null,
    eleicoes: eleicoes.map((e) => {
      const totalBens = emCentavos(e.totalBens);
      const fator = ipca ? fatorIpca(ipca, e.ano) : null;
      return {
        ano: e.ano,
        cargo: e.cargo,
        uf: e.uf,
        municipio: e.municipio,
        partido: e.partido,
        resultado: e.resultado,
        quantidadeBens: e.quantidadeBens,
        totalBens,
        corrigido: fator === null ? null : Math.round(totalBens * fator),
      };
    }),
  };
}
