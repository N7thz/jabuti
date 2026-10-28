import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/lib/db";
import type { AbrangenciaEmenda, Uf } from "@/lib/generated/prisma/enums";
import type { Prisma } from "@/lib/generated/prisma/client";

// Decimal do Prisma não atravessa o "use cache"; tudo sai em centavos (number cabe até R$ 90 trilhões).
const emCentavos = (valor: Prisma.Decimal | null | undefined) =>
  valor ? Number(valor.toFixed(2).replace(".", "")) : 0;

const somaValores = { valorEmpenhado: true, valorLiquidado: true, valorPago: true } as const;

type SomaValores = {
  valorEmpenhado: Prisma.Decimal | null;
  valorLiquidado: Prisma.Decimal | null;
  valorPago: Prisma.Decimal | null;
};

export type Totais = { empenhado: number; liquidado: number; pago: number };

const totais = (soma: SomaValores): Totais => ({
  empenhado: emCentavos(soma.valorEmpenhado),
  liquidado: emCentavos(soma.valorLiquidado),
  pago: emCentavos(soma.valorPago),
});

/** Anos com emendas sincronizadas, do mais recente ao mais antigo. */
export async function getAnosEmendas() {
  "use cache";
  cacheLife("hours");
  cacheTag("emendas");

  const anos = await db.emenda.groupBy({ by: ["ano"], orderBy: { ano: "desc" } });
  return anos.map((a) => a.ano);
}

/** Resumo das emendas destinadas a um estado: ao governo estadual e aos seus municípios. */
export async function getResumoEmendasUf(uf: Uf, ano: number) {
  "use cache";
  cacheLife("hours");
  cacheTag("emendas", `emendas:${uf}:${ano}`);

  const onde = { uf, ano } satisfies Prisma.EmendaWhereInput;

  const [geral, porAbrangencia, porMunicipio, porAutor] = await Promise.all([
    db.emenda.aggregate({ where: onde, _sum: somaValores, _count: true }),
    db.emenda.groupBy({ by: ["abrangencia"], where: onde, _sum: somaValores, _count: true }),
    db.emenda.groupBy({
      by: ["municipioIbge"],
      where: { ...onde, municipioIbge: { not: null } },
      _sum: somaValores,
      _count: true,
    }),
    db.emenda.groupBy({
      by: ["autorNome", "parlamentarId"],
      where: onde,
      _sum: somaValores,
      _count: true,
      orderBy: { _sum: { valorPago: "desc" } },
      take: 15,
    }),
  ]);

  const nomes = await db.municipio.findMany({
    where: { ibge: { in: porMunicipio.flatMap((m) => (m.municipioIbge ? [m.municipioIbge] : [])) } },
    select: { ibge: true, nome: true },
  });
  const nomePorIbge = new Map(nomes.map((m) => [m.ibge, m.nome]));

  return {
    quantidade: geral._count,
    totais: totais(geral._sum),
    porAbrangencia: porAbrangencia.map((a) => ({
      abrangencia: a.abrangencia as AbrangenciaEmenda,
      quantidade: a._count,
      totais: totais(a._sum),
    })),
    municipios: porMunicipio
      .map((m) => ({
        ibge: m.municipioIbge!,
        nome: nomePorIbge.get(m.municipioIbge!) ?? "Município",
        quantidade: m._count,
        totais: totais(m._sum),
      }))
      .sort((a, b) => b.totais.pago - a.totais.pago),
    autores: porAutor.map((a) => ({
      nome: a.autorNome,
      parlamentarId: a.parlamentarId,
      quantidade: a._count,
      totais: totais(a._sum),
    })),
  };
}

/** Município pelo código IBGE, garantindo que pertence à UF da URL. */
export async function getMunicipio(uf: Uf, ibge: number) {
  "use cache";
  cacheLife("weeks");
  cacheTag("municipios");

  return db.municipio.findFirst({
    where: { ibge, uf },
    select: { ibge: true, nome: true, uf: true, populacao: true, populacaoAno: true },
  });
}

/** Município pelo nome já normalizado (`nomeBusca`), para ligar fontes que não trazem o código IBGE. */
export async function getMunicipioPorNome(uf: Uf, nomeBusca: string) {
  "use cache";
  cacheLife("weeks");
  cacheTag("municipios");

  return db.municipio.findUnique({ where: { uf_nomeBusca: { uf, nomeBusca } }, select: { ibge: true, nome: true, uf: true } });
}

/** Emendas destinadas a um município, com os valores de cada uma. */
export async function getEmendasMunicipio(ibge: number, ano: number) {
  "use cache";
  cacheLife("hours");
  cacheTag("emendas", `emendas:municipio:${ibge}:${ano}`);

  const onde = { municipioIbge: ibge, ano } satisfies Prisma.EmendaWhereInput;

  const [geral, emendas] = await Promise.all([
    db.emenda.aggregate({ where: onde, _sum: somaValores, _count: true }),
    db.emenda.findMany({
      where: onde,
      orderBy: [{ valorPago: "desc" }, { valorEmpenhado: "desc" }],
      select: {
        codigo: true,
        codigoEmenda: true,
        tipo: true,
        autorNome: true,
        parlamentarId: true,
        funcao: true,
        subfuncao: true,
        valorEmpenhado: true,
        valorLiquidado: true,
        valorPago: true,
      },
    }),
  ]);

  return {
    quantidade: geral._count,
    totais: totais(geral._sum),
    emendas: emendas.map((e) => ({
      codigo: e.codigo,
      codigoEmenda: e.codigoEmenda,
      tipo: e.tipo,
      autorNome: e.autorNome,
      parlamentarId: e.parlamentarId,
      funcao: e.funcao,
      subfuncao: e.subfuncao,
      totais: totais(e),
    })),
  };
}

/** Emendas de um parlamentar, agrupadas por ano e destino (para o perfil do parlamentar). */
export async function getEmendasPorParlamentar(parlamentarId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("emendas", `emendas:parlamentar:${parlamentarId}`);

  const grupos = await db.emenda.groupBy({
    by: ["ano", "abrangencia", "uf", "municipioIbge"],
    where: { parlamentarId },
    _sum: somaValores,
    _count: true,
    orderBy: [{ ano: "desc" }, { _sum: { valorPago: "desc" } }],
  });

  const nomes = await db.municipio.findMany({
    where: { ibge: { in: grupos.flatMap((g) => (g.municipioIbge ? [g.municipioIbge] : [])) } },
    select: { ibge: true, nome: true },
  });
  const nomePorIbge = new Map(nomes.map((m) => [m.ibge, m.nome]));

  return grupos.map((g) => ({
    ano: g.ano,
    abrangencia: g.abrangencia as AbrangenciaEmenda,
    uf: g.uf,
    municipioIbge: g.municipioIbge,
    municipioNome: g.municipioIbge ? (nomePorIbge.get(g.municipioIbge) ?? null) : null,
    quantidade: g._count,
    totais: totais(g._sum),
  }));
}

/** Data da última sincronização bem-sucedida das emendas ("dados atualizados em"). */
export async function getUltimaSyncEmendas() {
  "use cache";
  cacheLife("hours");
  cacheTag("emendas");

  const run = await db.syncRun.findFirst({
    where: { fonte: "EMENDAS", status: "SUCESSO" },
    orderBy: { finalizadoEm: "desc" },
    select: { finalizadoEm: true },
  });
  return run?.finalizadoEm ?? null;
}

/** Total das emendas de um ano no país inteiro, para comparar com o orçamento federal. */
export async function getTotaisEmendasAno(ano: number) {
  "use cache";
  cacheLife("hours");
  cacheTag("emendas", `emendas:ano:${ano}`);

  const soma = await db.emenda.aggregate({ where: { ano }, _sum: somaValores, _count: true });
  return { quantidade: soma._count, ...totais(soma._sum) };
}
