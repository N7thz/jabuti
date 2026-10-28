import { add, toDecimal, type Dinero } from "dinero.js";

import type { Casa, Uf } from "../generated/prisma/enums";
import { reais } from "../format/dinheiro";
import { normalizarNome } from "../sync/run";
import { numeroTse, vazio, type LinhaTse } from "./csv";

/** Códigos de cargo do TSE (CD_CARGO) que levam a cada Casa. Suplentes de senador assumem o mandato. */
export const CARGOS_POR_CASA: Record<Casa, number[]> = {
  CAMARA: [6],
  SENADO: [5, 9, 10],
};

type Linhas = AsyncIterable<LinhaTse> | Iterable<LinhaTse>;

/** Parlamentar em exercício como o casamento precisa: nomes já normalizados e CPF quando a fonte tem. */
export interface Alvo {
  id: string;
  casa: Casa;
  uf: Uf;
  nomes: string[];
  cpf?: string | null;
}

export interface CandidaturaTse {
  parlamentarId: string;
  ano: number;
  sqCandidato: string;
  uf: Uf;
  cargo: string;
  numero: number;
  nomeUrna: string;
  partido: string;
  situacao: string;
  resultado: string | null;
  cpf: string | null;
  /** Como casou, para o relatório do sync. */
  casouPor: "cpf" | "nome";
}

const soDigitos = (valor: string | undefined) => (vazio(valor) ? null : valor!.replace(/\D/g, "").padStart(11, "0"));

const eleito = (c: CandidaturaTse) => c.resultado?.startsWith("ELEITO") ?? false;

/**
 * Casa as linhas de consulta_cand com os parlamentares: por CPF quando o parlamentar tem, senão pelo
 * nome civil ou de urna normalizado + UF + cargo da Casa. Um parlamentar fica com no máximo uma
 * candidatura por ano (CPF vence nome; entre homônimos, a eleita).
 */
export async function casarCandidaturas(linhas: Linhas, alvos: Alvo[]) {
  const porCpf = new Map(alvos.filter((a) => a.cpf).map((a) => [a.cpf!, a]));
  const porNome = new Map<string, Alvo[]>();
  for (const alvo of alvos) {
    for (const nome of new Set(alvo.nomes)) {
      const chave = `${alvo.casa}|${alvo.uf}|${nome}`;
      porNome.set(chave, [...(porNome.get(chave) ?? []), alvo]);
    }
  }

  const escolhidas = new Map<string, CandidaturaTse>();
  for await (const l of linhas) {
    const cargo = Number(l.CD_CARGO);
    const casa = (Object.keys(CARGOS_POR_CASA) as Casa[]).find((c) => CARGOS_POR_CASA[c].includes(cargo));
    if (!casa) continue;
    // Linhas de 2º turno repetem o candidato; deputado e senador só têm 1º turno.
    if (l.NR_TURNO && l.NR_TURNO !== "1") continue;

    const cpf = soDigitos(l.NR_CPF_CANDIDATO);
    const uf = l.SG_UF as Uf;
    let alvo = cpf ? porCpf.get(cpf) : undefined;
    let casouPor: CandidaturaTse["casouPor"] = "cpf";
    if (alvo && alvo.casa !== casa) alvo = undefined;
    if (!alvo) {
      casouPor = "nome";
      const nomes = [l.NM_CANDIDATO, l.NM_URNA_CANDIDATO, l.NM_SOCIAL_CANDIDATO].filter((n) => !vazio(n));
      const candidatos = nomes.flatMap((n) => porNome.get(`${casa}|${uf}|${normalizarNome(n)}`) ?? []);
      // Quem tem CPF só casa por CPF: evita pegar um homônimo quando o CPF do TSE difere.
      alvo = candidatos.find((a) => !a.cpf);
    }
    if (!alvo) continue;

    const candidatura: CandidaturaTse = {
      parlamentarId: alvo.id,
      ano: Number(l.ANO_ELEICAO),
      sqCandidato: l.SQ_CANDIDATO,
      uf,
      cargo: l.DS_CARGO,
      numero: Number(l.NR_CANDIDATO),
      nomeUrna: l.NM_URNA_CANDIDATO,
      partido: l.SG_PARTIDO,
      situacao: l.DS_SITUACAO_CANDIDATURA,
      resultado: vazio(l.DS_SIT_TOT_TURNO) ? null : l.DS_SIT_TOT_TURNO,
      cpf,
      casouPor,
    };

    const chave = `${alvo.id}|${candidatura.ano}`;
    const atual = escolhidas.get(chave);
    const melhor =
      !atual ||
      (candidatura.casouPor === "cpf" && atual.casouPor !== "cpf") ||
      (candidatura.casouPor === atual.casouPor && eleito(candidatura) && !eleito(atual));
    if (melhor) escolhidas.set(chave, candidatura);
  }
  return [...escolhidas.values()];
}

export interface Bem {
  ordem: number;
  tipo: string;
  descricao: string;
  valor: Dinero<number>;
}

/** Bens de bem_candidato por SQ_CANDIDATO, só dos candidatos pedidos. Ordem repetida ganha número livre. */
export async function agruparBens(linhas: Linhas, sqs: Set<string>) {
  const porSq = new Map<string, Bem[]>();
  for await (const l of linhas) {
    if (!sqs.has(l.SQ_CANDIDATO)) continue;
    const bens = porSq.get(l.SQ_CANDIDATO) ?? [];
    let ordem = Number(l.NR_ORDEM_BEM_CANDIDATO) || 1;
    if (bens.some((b) => b.ordem === ordem)) ordem = Math.max(...bens.map((b) => b.ordem)) + 1;
    bens.push({
      ordem,
      tipo: vazio(l.DS_TIPO_BEM_CANDIDATO) ? "Não informado" : l.DS_TIPO_BEM_CANDIDATO.trim(),
      descricao: l.DS_BEM_CANDIDATO.trim(),
      valor: reais(numeroTse(l.VR_BEM_CANDIDATO)),
    });
    porSq.set(l.SQ_CANDIDATO, bens);
  }
  return porSq;
}

export interface Receita {
  origem: string;
  fonte: string;
  doador: string;
  valor: Dinero<number>;
  lancamentos: number;
}

/**
 * Soma as receitas por origem, fonte e nome do doador. O CPF/CNPJ do doador é descartado aqui:
 * de pessoa física o portal guarda só o nome.
 */
export async function agruparReceitas(linhas: Linhas, sqs: Set<string>) {
  const porSq = new Map<string, Map<string, Receita>>();
  for await (const l of linhas) {
    if (!sqs.has(l.SQ_CANDIDATO)) continue;
    const origem = vazio(l.DS_ORIGEM_RECEITA) ? "Não informada" : l.DS_ORIGEM_RECEITA.trim();
    const fonte = vazio(l.DS_FONTE_RECEITA) ? "Não informada" : l.DS_FONTE_RECEITA.trim();
    const nome = [l.NM_DOADOR_RFB, l.NM_DOADOR].find((n) => !vazio(n))?.trim();
    const doador = nome ? normalizarNome(nome) : "NÃO INFORMADO";
    const chave = `${origem}|${fonte}|${doador}`;

    const receitas = porSq.get(l.SQ_CANDIDATO) ?? new Map<string, Receita>();
    const atual = receitas.get(chave);
    const valor = reais(numeroTse(l.VR_RECEITA));
    if (atual) {
      atual.valor = add(atual.valor, valor);
      atual.lancamentos++;
    } else {
      receitas.set(chave, { origem, fonte, doador, valor, lancamentos: 1 });
    }
    porSq.set(l.SQ_CANDIDATO, receitas);
  }
  return new Map([...porSq].map(([sq, receitas]) => [sq, [...receitas.values()]]));
}

/** Votos nominais do 1º turno por município (soma zonas e voto em trânsito), por SQ_CANDIDATO. */
export async function agruparVotos(linhas: Linhas, sqs: Set<string>) {
  const porSq = new Map<string, Map<number, number>>();
  for await (const l of linhas) {
    if (l.NR_TURNO !== "1" || !sqs.has(l.SQ_CANDIDATO)) continue;
    const municipios = porSq.get(l.SQ_CANDIDATO) ?? new Map<number, number>();
    const municipio = Number(l.CD_MUNICIPIO);
    municipios.set(municipio, (municipios.get(municipio) ?? 0) + (Number(l.QT_VOTOS_NOMINAIS) || 0));
    porSq.set(l.SQ_CANDIDATO, municipios);
  }
  return porSq;
}

/** Valor para coluna Decimal do Prisma ("1234.56"). */
export const decimal = (valor: Dinero<number>) => toDecimal(valor);
