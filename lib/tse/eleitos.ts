/**
 * Eleitos de uma eleição geral para a Câmara e o Senado, a partir de consulta_cand_<ano>_BRASIL.csv.
 * Inclui quem ainda não é parlamentar; quem já foi sincronizado (em exercício ou não) ganha o `parlamentarId`.
 */
import type { Casa, Uf } from "../generated/prisma/enums";
import type { PrismaClient } from "../prisma";
import { normalizarNome } from "../sync/run";
import { vazio, type LinhaTse } from "./csv";
import type { Alvo } from "./mapear";

/** CD_CARGO do titular em cada Casa (suplente de senador não entra: não foi eleito para a cadeira). */
const CARGO_TITULAR: Record<number, Casa> = { 6: "CAMARA", 5: "SENADO" };

/** DS_SIT_TOT_TURNO de quem ganhou a cadeira. Deputado: quociente partidário ou média; senador: "ELEITO". */
export const RESULTADOS_ELEITO: Record<Casa, string[]> = {
  CAMARA: ["ELEITO POR QP", "ELEITO POR MÉDIA"],
  SENADO: ["ELEITO"],
};

export interface EleitoTse {
  ano: number;
  casa: Casa;
  uf: Uf;
  sqCandidato: string;
  nome: string;
  nomeUrna: string;
  numero: number;
  partido: string;
  resultado: string;
  cpf: string | null;
}

export interface EleitoCasado extends EleitoTse {
  parlamentarId: string | null;
  /** Como casou, para o relatório do sync. */
  casouPor: "cpf" | "nome" | null;
}

type Linhas = AsyncIterable<LinhaTse> | Iterable<LinhaTse>;

const cpfTse = (valor: string | undefined) => (vazio(valor) ? null : valor!.replace(/\D/g, "").padStart(11, "0") || null);

/**
 * Deputados federais e senadores eleitos no ano, um por SQ_CANDIDATO (o CSV pode repetir o candidato
 * numa linha por turno). Ignora linhas de outros anos, cargos e resultados.
 */
export async function filtrarEleitos(linhas: Linhas, ano: number) {
  const porSq = new Map<string, EleitoTse>();
  for await (const l of linhas) {
    if (Number(l.ANO_ELEICAO) !== ano) continue;
    const casa = CARGO_TITULAR[Number(l.CD_CARGO)];
    if (!casa) continue;
    const resultado = l.DS_SIT_TOT_TURNO?.trim();
    if (!RESULTADOS_ELEITO[casa].includes(resultado)) continue;
    if (porSq.has(l.SQ_CANDIDATO)) continue;
    porSq.set(l.SQ_CANDIDATO, {
      ano,
      casa,
      uf: l.SG_UF as Uf,
      sqCandidato: l.SQ_CANDIDATO,
      nome: l.NM_CANDIDATO.trim(),
      nomeUrna: l.NM_URNA_CANDIDATO.trim(),
      numero: Number(l.NR_CANDIDATO),
      partido: l.SG_PARTIDO.trim(),
      resultado,
      cpf: cpfTse(l.NR_CPF_CANDIDATO),
    });
  }
  return [...porSq.values()];
}

/**
 * Liga cada eleito ao parlamentar já sincronizado, das duas Casas (um deputado pode ter sido eleito
 * senador): primeiro por CPF; senão pelo nome civil ou de urna normalizado + UF, só entre quem não tem
 * CPF (senadores). Na dúvida (mais de um parlamentar com o nome), fica sem ligação. Entre dois registros
 * da mesma pessoa, vence o da Casa para a qual foi eleita.
 */
export function casarEleitos(eleitos: EleitoTse[], alvos: Alvo[]): EleitoCasado[] {
  const porCpf = Map.groupBy(
    alvos.filter((a) => a.cpf),
    (a) => a.cpf!,
  );
  const porNome = new Map<string, Alvo[]>();
  for (const alvo of alvos) {
    if (alvo.cpf) continue;
    for (const nome of new Set(alvo.nomes)) {
      const chave = `${alvo.uf}|${nome}`;
      porNome.set(chave, [...(porNome.get(chave) ?? []), alvo]);
    }
  }

  /** Um só alvo: o único, ou o único da Casa da eleição. */
  const escolher = (candidatos: Alvo[], casa: Casa) => {
    const unicos = [...new Map(candidatos.map((a) => [a.id, a])).values()];
    if (unicos.length <= 1) return unicos[0];
    const daCasa = unicos.filter((a) => a.casa === casa);
    return daCasa.length === 1 ? daCasa[0] : undefined;
  };

  return eleitos.map((e) => {
    const peloCpf = e.cpf ? escolher(porCpf.get(e.cpf) ?? [], e.casa) : undefined;
    if (peloCpf?.casa === e.casa) return { ...e, parlamentarId: peloCpf.id, casouPor: "cpf" as const };
    const nomes = new Set([e.nome, e.nomeUrna].filter((n) => !vazio(n)).map(normalizarNome));
    const porNomeUf = [...nomes].flatMap((n) => porNome.get(`${e.uf}|${n}`) ?? []);
    // O CPF achou o registro da outra Casa (ex.: ex-deputado que hoje é senador, sem CPF no Senado):
    // o registro da Casa da eleição, se casar por nome + UF, vence.
    const daCasa = peloCpf ? escolher(porNomeUf.filter((a) => a.casa === e.casa), e.casa) : undefined;
    if (daCasa) return { ...e, parlamentarId: daCasa.id, casouPor: "nome" as const };
    if (peloCpf) return { ...e, parlamentarId: peloCpf.id, casouPor: "cpf" as const };
    const peloNome = escolher(porNomeUf, e.casa);
    if (peloNome) return { ...e, parlamentarId: peloNome.id, casouPor: "nome" as const };
    return { ...e, parlamentarId: null, casouPor: null };
  });
}

/**
 * Grava os eleitos do ano (upsert por ano + SQ_CANDIDATO) e apaga os que deixaram de constar como eleitos
 * nele (o TSE ainda corrige o resultado). Recusa lista vazia para não apagar tudo por um arquivo quebrado.
 */
export async function gravarEleitos(prisma: PrismaClient, ano: number, eleitos: EleitoCasado[]) {
  if (eleitos.length === 0) throw new Error(`Nenhum eleito em ${ano}: arquivo do TSE vazio ou em outro formato.`);
  for (const e of eleitos) {
    // `casouPor` fica de fora: só serve ao relatório.
    const dados = {
      ano: e.ano,
      casa: e.casa,
      uf: e.uf,
      sqCandidato: e.sqCandidato,
      nome: e.nome,
      nomeUrna: e.nomeUrna,
      numero: e.numero,
      partido: e.partido,
      resultado: e.resultado,
      cpf: e.cpf,
      parlamentarId: e.parlamentarId,
    };
    await prisma.eleito.upsert({
      where: { ano_sqCandidato: { ano: e.ano, sqCandidato: e.sqCandidato } },
      create: dados,
      update: dados,
      select: { id: true },
    });
  }
  const { count: apagados } = await prisma.eleito.deleteMany({
    where: { ano, sqCandidato: { notIn: eleitos.map((e) => e.sqCandidato) } },
  });
  return { gravados: eleitos.length, apagados };
}
