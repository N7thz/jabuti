import type { Dinero } from "dinero.js";

import type { Casa, Uf } from "../generated/prisma/enums";
import { somar } from "../format/dinheiro";
import type { PrismaClient } from "../prisma";
import { createFetcher, normalizarNome } from "../sync/run";
import type { TseClient } from "./client";
import {
  agruparBens,
  agruparReceitas,
  agruparVotos,
  casarCandidaturas,
  decimal,
  type Alvo,
  type Bem,
  type CandidaturaTse,
  type Receita,
} from "./mapear";

/** Eleições que deram o mandato atual: deputados em 2022; senadores em 2018 ou 2022 (mandato de 8 anos). */
export const ANOS_POR_CASA: Record<Casa, number[]> = {
  CAMARA: [2022],
  SENADO: [2018, 2022],
};

/**
 * Parlamentares em exercício das UFs pedidas. Da Câmara busca `/deputados/{id}` para ter CPF e nome
 * civil (o banco não guarda CPF); o Senado não publica CPF, então senadores casam por nome.
 */
export async function carregarAlvos(prisma: PrismaClient, ufs: Uf[]): Promise<Alvo[]> {
  const parlamentares = await prisma.parlamentar.findMany({
    where: { emExercicio: true, uf: { in: ufs } },
    select: { id: true, casa: true, idExterno: true, nome: true, nomeCivil: true, uf: true },
  });
  const get = createFetcher({ minIntervalMs: 150 });

  return Promise.all(
    parlamentares.map(async (p) => {
      let { nomeCivil } = p;
      let cpf: string | null = null;
      if (p.casa === "CAMARA") {
        const { dados } = await get<{ dados: { cpf: string | null; nomeCivil: string | null } }>(
          `https://dadosabertos.camara.leg.br/api/v2/deputados/${p.idExterno}`,
        );
        cpf = dados.cpf?.replace(/\D/g, "").padStart(11, "0") || null;
        nomeCivil = dados.nomeCivil ?? nomeCivil;
      }
      const nomes = [p.nome, nomeCivil].filter((n): n is string => !!n).map(normalizarNome);
      return { id: p.id, casa: p.casa, uf: p.uf!, nomes, cpf };
    }),
  );
}

export interface CandidaturaCompleta {
  candidatura: CandidaturaTse;
  bens: Bem[];
  receitas: Receita[];
  votos: { municipioTse: number; municipioIbge: number | null; votos: number }[];
  totalBens: Dinero<number>;
  totalReceitas: Dinero<number>;
  totalVotos: number;
}

const eleita = (c: CandidaturaTse) => c.resultado?.startsWith("ELEITO") ?? false;

/**
 * Candidatura que deu o mandato atual: a eleita mais recente. Ex.: Marcos Pontes foi 2º suplente
 * eleito em 2018 e senador eleito em 2022; fica 2022. Suplente em exercício fica com a de suplente.
 */
export function candidaturaDoMandato(candidaturas: CandidaturaTse[]) {
  const porParlamentar = new Map<string, CandidaturaTse>();
  for (const c of candidaturas) {
    const atual = porParlamentar.get(c.parlamentarId);
    const melhor = !atual || (eleita(c) !== eleita(atual) ? eleita(c) : c.ano > atual.ano);
    if (melhor) porParlamentar.set(c.parlamentarId, c);
  }
  return [...porParlamentar.values()];
}

/** Casa os candidatos da UF em todos os anos e escolhe uma candidatura por parlamentar. */
export async function casarUf(client: TseClient, alvos: Alvo[], uf: Uf, anos: number[]) {
  const todas: CandidaturaTse[] = [];
  for (const ano of anos) {
    const doAno = alvos.filter((a) => a.uf === uf && ANOS_POR_CASA[a.casa].includes(ano));
    if (doAno.length > 0) todas.push(...(await casarCandidaturas(await client.linhas("candidatos", ano, uf), doAno)));
  }
  return candidaturaDoMandato(todas);
}

/** Lê bens, receitas e votos de uma UF e ano, só das candidaturas escolhidas. */
export async function buscarUfAno(
  client: TseClient,
  candidaturasUf: CandidaturaTse[],
  uf: Uf,
  ano: number,
  municipiosIbge: Map<number, number>,
): Promise<CandidaturaCompleta[]> {
  const candidaturas = candidaturasUf.filter((c) => c.ano === ano);
  if (candidaturas.length === 0) return [];
  const sqs = new Set(candidaturas.map((c) => c.sqCandidato));

  const bens = await agruparBens(await client.linhas("bens", ano, uf), sqs);
  const receitas = await agruparReceitas(await client.linhas("receitas", ano, uf), sqs);
  const votos = await agruparVotos(await client.linhas("votos", ano, uf), sqs);

  return candidaturas.map((candidatura) => {
    const sq = candidatura.sqCandidato;
    const porMunicipio = [...(votos.get(sq) ?? [])].map(([municipioTse, n]) => ({
      municipioTse,
      municipioIbge: municipiosIbge.get(municipioTse) ?? null,
      votos: n,
    }));
    return {
      candidatura,
      bens: bens.get(sq) ?? [],
      receitas: receitas.get(sq) ?? [],
      votos: porMunicipio,
      totalBens: somar((bens.get(sq) ?? []).map((b) => b.valor)),
      totalReceitas: somar((receitas.get(sq) ?? []).map((r) => r.valor)),
      totalVotos: porMunicipio.reduce((total, m) => total + m.votos, 0),
    };
  });
}

/** Apaga candidaturas desses parlamentares que deixaram de ser a do mandato (bens etc. vão em cascata). */
export async function apagarSubstituidas(prisma: PrismaClient, parlamentarIds: string[], mantidas: CandidaturaTse[]) {
  const { count } = await prisma.candidatura.deleteMany({
    where: {
      parlamentarId: { in: parlamentarIds },
      NOT: { OR: mantidas.map((c) => ({ ano: c.ano, sqCandidato: c.sqCandidato })) },
    },
  });
  return count;
}

/** Grava cada candidatura e substitui seus bens, receitas e votos. Devolve o total de linhas gravadas. */
export async function gravarCandidaturas(prisma: PrismaClient, itens: CandidaturaCompleta[]) {
  let registros = 0;
  for (const item of itens) {
    const c = item.candidatura;
    // `casouPor` fica de fora: só serve ao relatório.
    const dados = {
      parlamentarId: c.parlamentarId,
      ano: c.ano,
      sqCandidato: c.sqCandidato,
      uf: c.uf,
      cargo: c.cargo,
      numero: c.numero,
      nomeUrna: c.nomeUrna,
      partido: c.partido,
      situacao: c.situacao,
      resultado: c.resultado,
      cpf: c.cpf,
      totalBens: decimal(item.totalBens),
      totalReceitas: decimal(item.totalReceitas),
      totalVotos: item.totalVotos,
    };
    const { id: candidaturaId } = await prisma.candidatura.upsert({
      where: { ano_sqCandidato: { ano: c.ano, sqCandidato: c.sqCandidato } },
      create: dados,
      update: dados,
      select: { id: true },
    });

    await prisma.$transaction([
      prisma.bemDeclarado.deleteMany({ where: { candidaturaId } }),
      prisma.receitaCampanha.deleteMany({ where: { candidaturaId } }),
      prisma.votoMunicipio.deleteMany({ where: { candidaturaId } }),
      prisma.bemDeclarado.createMany({
        data: item.bens.map((b) => ({ candidaturaId, ordem: b.ordem, tipo: b.tipo, descricao: b.descricao, valor: decimal(b.valor) })),
      }),
      prisma.receitaCampanha.createMany({
        data: item.receitas.map((r) => ({
          candidaturaId,
          origem: r.origem,
          fonte: r.fonte,
          doador: r.doador,
          valor: decimal(r.valor),
          lancamentos: r.lancamentos,
        })),
      }),
      prisma.votoMunicipio.createMany({ data: item.votos.map((v) => ({ candidaturaId, ...v })) }),
    ]);
    registros += 1 + item.bens.length + item.receitas.length + item.votos.length;
  }
  return registros;
}
