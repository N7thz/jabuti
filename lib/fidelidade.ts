import type { TipoVoto } from "./generated/prisma/enums";

// Fidelidade: em quantas votações o voto do parlamentar seguiu a orientação do partido e a do governo.
// As Casas publicam a orientação por partido, federação ("Fdr PT-PCdoB-PV"), bloco ("Bl MdbPsdRepPodePsc",
// às vezes cortado com "...") ou liderança ("Governo"); o Senado usa nomes ("Republica", "Podemos").

export interface OrientacaoVotacao {
  sigla: string;
  /** null: bancada liberada. */
  tipo: TipoVoto | null;
}

/** Só estes votos expressam posição; ausência, presidência da sessão e afins ficam de fora. */
const VOTOS_COM_POSICAO = new Set<TipoVoto>(["SIM", "NAO", "ABSTENCAO", "OBSTRUCAO"]);

const LIDERANCAS = new Set(["GOVERNO", "OPOSICAO", "MAIORIA", "MINORIA"]);

/** Nomes e abreviações (de blocos e do Senado) para a sigla que os votos usam. */
const APELIDOS: Record<string, string> = {
  PODEMOS: "PODE",
  REP: "REPUBLICANOS",
  REPUBLICA: "REPUBLICANOS",
  UNI: "UNIAO",
  "UNIAO BRASIL": "UNIAO",
  CID: "CIDADANIA",
  SOLID: "SOLIDARIEDADE",
};

function canonica(sigla: string) {
  const s = sigla.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\.+$/, "").trim().toUpperCase();
  return APELIDOS[s] ?? s;
}

/** Partidos que a orientação representa, já na forma canônica, e a prioridade de quem orienta. */
function membros(sigla: string): { partidos: string[]; prioridade: number } {
  const limpa = sigla.replace(/\.{2,}$/, "").trim();
  if (/^fdr\s/i.test(limpa)) {
    return { partidos: limpa.slice(4).split(/[-/\s]+/).filter(Boolean).map(canonica), prioridade: 2 };
  }
  if (/^bl\s/i.test(limpa)) {
    // "MdbPsdRepPodePsc" -> Mdb, Psd, Rep, Pode, Psc ("Fdr" no meio só marca uma federação dentro do bloco).
    const partes = limpa.slice(3).match(/[A-Z][a-z]*/g) ?? [];
    return { partidos: partes.filter((p) => p !== "Fdr").map(canonica), prioridade: 1 };
  }
  return { partidos: [canonica(limpa)], prioridade: 3 };
}

/**
 * Orientação que valia para o partido do parlamentar naquela votação. Prefere a do próprio partido,
 * depois a da federação e por fim a do bloco; sem igualdade exata, aceita a sigla abreviada
 * ("Republica" para REPUBLICANOS). Sem correspondência, devolve undefined (não entra na conta).
 */
export function orientacaoDoPartido<O extends OrientacaoVotacao>(orientacoes: O[], partido: string | null) {
  if (!partido) return undefined;
  const alvo = canonica(partido);
  let melhor: { o: O; nota: number } | undefined;

  for (const o of orientacoes) {
    if (LIDERANCAS.has(canonica(o.sigla))) continue;
    const { partidos, prioridade } = membros(o.sigla);
    const exato = partidos.includes(alvo);
    const prefixo = !exato && partidos.some((p) => p.length >= 3 && alvo.startsWith(p));
    if (!exato && !prefixo) continue;
    const nota = (exato ? 10 : 0) + prioridade;
    if (!melhor || nota > melhor.nota) melhor = { o, nota };
  }
  return melhor?.o;
}

/** Texto da orientação ("Sim", "NÃO", "Liberado", "LIVRE", "Obstrução") para o tipo de voto; null se liberada. */
export function tipoDaOrientacao(texto: string): TipoVoto | null {
  const chave = texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toUpperCase();
  const tipos: Record<string, TipoVoto> = { SIM: "SIM", NAO: "NAO", ABSTENCAO: "ABSTENCAO", OBSTRUCAO: "OBSTRUCAO" };
  return tipos[chave] ?? null;
}

export const orientacaoDoGoverno = (orientacoes: OrientacaoVotacao[]) =>
  orientacoes.find((o) => canonica(o.sigla) === "GOVERNO");

export interface VotoComOrientacoes {
  tipo: TipoVoto;
  partido: string | null;
  orientacoes: OrientacaoVotacao[];
}

export interface Placar {
  /** Votações em que havia orientação (não liberada) e o parlamentar votou. */
  consideradas: number;
  seguiu: number;
}

function placar(votos: VotoComOrientacoes[], escolher: (v: VotoComOrientacoes) => OrientacaoVotacao | undefined): Placar {
  let consideradas = 0;
  let seguiu = 0;
  for (const v of votos) {
    if (!VOTOS_COM_POSICAO.has(v.tipo)) continue;
    const tipo = escolher(v)?.tipo;
    if (!tipo) continue;
    consideradas++;
    if (tipo === v.tipo) seguiu++;
  }
  return { consideradas, seguiu };
}

export function calcularFidelidade(votos: VotoComOrientacoes[]) {
  return {
    partido: placar(votos, (v) => orientacaoDoPartido(v.orientacoes, v.partido)),
    governo: placar(votos, (v) => orientacaoDoGoverno(v.orientacoes)),
  };
}

/** Voto contrário à orientação do partido (para listar as votações em que o parlamentar divergiu). */
export function contrariouPartido(v: VotoComOrientacoes) {
  if (!VOTOS_COM_POSICAO.has(v.tipo)) return false;
  const tipo = orientacaoDoPartido(v.orientacoes, v.partido)?.tipo;
  return Boolean(tipo) && tipo !== v.tipo;
}
