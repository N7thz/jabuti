import type { Dinero } from "dinero.js";

import type { Uf } from "../generated/prisma/enums";
import { somar } from "../format/dinheiro";
import type { PrismaClient } from "../prisma";
import type { TseClient } from "./client";
import { vazio, type LinhaTse } from "./csv";
import { agruparBens, decimal } from "./mapear";

/**
 * Eleições com bens por candidato e CPF no consulta_cand. Em 2024 o TSE mascara o CPF de todos ("-4"),
 * mas publica o título de eleitor, que é um número fixo da pessoa: é por ele que 2024 casa.
 */
export const ANOS_PATRIMONIO = [2014, 2016, 2018, 2020, 2022, 2024];

/** Eleições municipais (prefeito e vereador) caem nos anos múltiplos de 4: 2016, 2020, 2024. */
export const municipal = (ano: number) => ano % 4 === 0;

type Linhas = AsyncIterable<LinhaTse> | Iterable<LinhaTse>;
type AnosLinhas = AsyncIterable<{ ano: number; linhas: Linhas }> | Iterable<{ ano: number; linhas: Linhas }>;

/** Quem buscar nas outras eleições: a candidatura do mandato, já gravada pelo sync do TSE. */
export interface Pessoa {
  parlamentarId: string;
  /** Ano e SQ_CANDIDATO da candidatura do mandato: acham a linha dela mesmo quando o CPF veio mascarado. */
  ano: number;
  sqCandidato: string;
  cpf: string | null;
}

export interface EleicaoDisputada {
  parlamentarId: string;
  ano: number;
  sqCandidato: string;
  cargo: string;
  uf: Uf;
  municipio: string | null;
  partido: string;
  resultado: string | null;
  situacao: string;
}

const documento = (valor: string | undefined) => (vazio(valor) ? null : valor!.replace(/\D/g, "") || null);

/** CPF e título com zeros à esquerda, como o TSE varia entre anos. */
const cpfDe = (l: LinhaTse) => documento(l.NR_CPF_CANDIDATO)?.padStart(11, "0") ?? null;
const tituloDe = (l: LinhaTse) => documento(l.NR_TITULO_ELEITORAL_CANDIDATO)?.padStart(12, "0") ?? null;

const apta = (e: EleicaoDisputada) => e.situacao === "APTO";
const eleita = (e: EleicaoDisputada) => e.resultado?.startsWith("ELEITO") ?? false;

/** Nas eleições municipais a UE é o código do município; nas gerais, a sigla da UF. */
const municipioDe = (l: LinhaTse) => (/^\d+$/.test(l.SG_UE ?? "") && !vazio(l.NM_UE) ? l.NM_UE : null);

/**
 * Acha as candidaturas das pessoas em cada ano, só por documento: CPF ou título de eleitor. Nome nunca
 * casa aqui, porque um homônimo de outra cidade trocaria o patrimônio de alguém. A linha do mandato
 * (por SQ_CANDIDATO) ensina os documentos; cada linha casada ensina o que faltava, então os anos
 * devem vir em ordem crescente para 2024 (sem CPF) aproveitar o título visto antes.
 * Fica uma candidatura por pessoa e ano: a apta e, entre aptas, a eleita.
 */
export async function casarEleicoes(anos: AnosLinhas, pessoas: Pessoa[]) {
  const porCpf = new Map<string, Pessoa>();
  const porTitulo = new Map<string, Pessoa>();
  const porSq = new Map(pessoas.map((p) => [`${p.ano}|${p.sqCandidato}`, p]));
  for (const p of pessoas) if (p.cpf) porCpf.set(p.cpf, p);

  const escolhidas = new Map<string, EleicaoDisputada>();
  for await (const { ano, linhas } of anos) {
    for await (const l of linhas) {
      // Prefeito e governador repetem a linha no 2º turno.
      if (l.NR_TURNO && l.NR_TURNO !== "1") continue;
      const cpf = cpfDe(l);
      const titulo = tituloDe(l);
      const pessoa =
        porSq.get(`${ano}|${l.SQ_CANDIDATO}`) ?? (cpf ? porCpf.get(cpf) : undefined) ?? (titulo ? porTitulo.get(titulo) : undefined);
      if (!pessoa) continue;
      if (cpf && !porCpf.has(cpf)) porCpf.set(cpf, pessoa);
      if (titulo && !porTitulo.has(titulo)) porTitulo.set(titulo, pessoa);

      const eleicao: EleicaoDisputada = {
        parlamentarId: pessoa.parlamentarId,
        ano,
        sqCandidato: l.SQ_CANDIDATO,
        cargo: l.DS_CARGO,
        uf: l.SG_UF as Uf,
        municipio: municipioDe(l),
        partido: l.SG_PARTIDO,
        resultado: vazio(l.DS_SIT_TOT_TURNO) ? null : l.DS_SIT_TOT_TURNO,
        situacao: l.DS_SITUACAO_CANDIDATURA,
      };
      const chave = `${pessoa.parlamentarId}|${ano}`;
      const atual = escolhidas.get(chave);
      // No ano do mandato fica a candidatura do mandato: o resto da seção mostra os bens dela.
      const doMandato = (e: EleicaoDisputada) => e.ano === pessoa.ano && e.sqCandidato === pessoa.sqCandidato;
      const melhor =
        !atual ||
        (!doMandato(atual) &&
          (doMandato(eleicao) || (apta(eleicao) !== apta(atual) ? apta(eleicao) : eleita(eleicao) && !eleita(atual))));
      if (melhor) escolhidas.set(chave, eleicao);
    }
  }
  return [...escolhidas.values()];
}

export interface PatrimonioCompleto {
  eleicao: EleicaoDisputada;
  totalBens: Dinero<number>;
  quantidadeBens: number;
}

/** Lê os candidatos de cada ano da UF (do mais antigo ao mais novo), casa as pessoas e soma os bens. */
export async function buscarPatrimonioUf(client: TseClient, pessoas: Pessoa[], uf: Uf, anos = ANOS_PATRIMONIO) {
  // O DF não tem prefeito nem vereador: os ZIPs das eleições municipais não trazem o CSV dele.
  const ordenados = [...anos].filter((ano) => uf !== "DF" || !municipal(ano)).sort((a, b) => a - b);
  // Um ZIP aberto por vez: o próximo ano só é pedido depois de o anterior ser lido inteiro.
  const eleicoes = await casarEleicoes(
    (async function* () {
      for (const ano of ordenados) yield { ano, linhas: await client.linhas("candidatos", ano, uf) };
    })(),
    pessoas,
  );

  const itens: PatrimonioCompleto[] = [];
  for (const ano of ordenados) {
    const doAno = eleicoes.filter((e) => e.ano === ano);
    if (doAno.length === 0) continue;
    const bens = await agruparBens(await client.linhas("bens", ano, uf), new Set(doAno.map((e) => e.sqCandidato)));
    for (const eleicao of doAno) {
      const lista = bens.get(eleicao.sqCandidato) ?? [];
      itens.push({ eleicao, totalBens: somar(lista.map((b) => b.valor)), quantidadeBens: lista.length });
    }
  }
  return itens;
}

/** Pessoas da UF a partir das candidaturas do mandato gravadas (o CPF fica só no banco e na memória). */
export async function carregarPessoas(prisma: PrismaClient, uf: Uf): Promise<Pessoa[]> {
  return prisma.candidatura.findMany({
    where: { uf, parlamentar: { emExercicio: true } },
    select: { parlamentarId: true, ano: true, sqCandidato: true, cpf: true },
  });
}

/** Substitui a série de cada parlamentar dessa UF pelo que foi lido agora. */
export async function gravarPatrimonio(prisma: PrismaClient, pessoas: Pessoa[], itens: PatrimonioCompleto[]) {
  const ids = pessoas.map((p) => p.parlamentarId);
  await prisma.$transaction([
    prisma.patrimonioEleicao.deleteMany({ where: { parlamentarId: { in: ids } } }),
    prisma.patrimonioEleicao.createMany({
      data: itens.map(({ eleicao: e, totalBens, quantidadeBens }) => ({
        parlamentarId: e.parlamentarId,
        ano: e.ano,
        sqCandidato: e.sqCandidato,
        cargo: e.cargo,
        uf: e.uf,
        municipio: e.municipio,
        partido: e.partido,
        resultado: e.resultado,
        totalBens: decimal(totalBens),
        quantidadeBens,
      })),
    }),
  ]);
  return itens.length;
}
