// "Como eu votaria": funções puras, usadas no navegador (com JavaScript) e na Server Action (sem).
// As respostas da pessoa são opinião política, dado sensível pela LGPD: nada aqui grava em lugar nenhum.

/** Resposta da pessoa numa votação. "Não sei" não entra: a votação simplesmente fica fora da conta. */
export type Resposta = "SIM" | "NAO";
export type Respostas = Record<string, Resposta>;

/**
 * Posição do parlamentar em cada votação, na ordem de `MatrizVotos.votacoes`, numa string curta para a
 * página não pesar: S (sim), N (não), A (abstenção) e "-" quando não tomou posição (ausente, secreto,
 * presidindo a sessão, obstrução ou fora do mandato).
 */
export type PosicoesCompactas = string;

export interface VotacaoEscolhida {
  /** Id da votação na casa (o mesmo da URL /votacoes/<casa>/<id>). */
  id: string;
  /** AAAA-MM-DD */
  data: string;
  /** "PEC 221/2019" */
  proposicao: string;
  /** Ementa oficial da proposição: a pergunta mostrada. */
  ementa: string;
  /** O que exatamente foi votado naquele dia, como a casa descreve. */
  descricao: string;
  resultado: string | null;
  href: string;
}

export interface ParlamentarNaMatriz {
  chave: string;
  nome: string;
  partido: string | null;
  uf: string | null;
  perfil: string;
  posicoes: PosicoesCompactas;
}

export interface MatrizVotos {
  casa: "camara" | "senado";
  votacoes: VotacaoEscolhida[];
  parlamentares: ParlamentarNaMatriz[];
}

export interface Concordancia {
  comparadas: number;
  iguais: number;
}

export interface LinhaParlamentar extends Concordancia {
  chave: string;
  nome: string;
  partido: string | null;
  uf: string | null;
  perfil: string;
}

export interface LinhaPartido extends Concordancia {
  partido: string;
  parlamentares: number;
}

export interface Resultado {
  /** Votações respondidas com Sim ou Não. */
  respondidas: number;
  parlamentares: LinhaParlamentar[];
  partidos: LinhaPartido[];
}

const LETRA: Record<Resposta, string> = { SIM: "S", NAO: "N" };

/** Converte o voto normalizado do banco (TipoVoto) na letra da matriz; só sim, não e abstenção contam. */
export function letraDoVoto(tipo: string): string {
  if (tipo === "SIM") return "S";
  if (tipo === "NAO") return "N";
  if (tipo === "ABSTENCAO") return "A";
  return "-";
}

/** Fração de 0 a 1; sem votação comparada, -1 (vai para o fim da lista). */
export const fracao = (c: Concordancia) => (c.comparadas ? c.iguais / c.comparadas : -1);

const porConcordancia = <T extends Concordancia>(nome: (x: T) => string) => (a: T, b: T) =>
  fracao(b) - fracao(a) || b.comparadas - a.comparadas || nome(a).localeCompare(nome(b), "pt-BR");

/**
 * Concordância de cada parlamentar com as respostas, nas votações em que os dois tomaram posição (a mesma
 * regra de /comparar). A abstenção do parlamentar conta como posição diferente de Sim e de Não.
 * Quem não tem nenhuma votação em comum com as respostas fica fora da lista.
 */
export function calcular(respostas: Respostas, matriz: MatrizVotos): Resultado {
  const indices = matriz.votacoes
    .map((v, i) => [i, respostas[v.id]] as const)
    .filter((par): par is readonly [number, Resposta] => par[1] === "SIM" || par[1] === "NAO");

  const parlamentares: LinhaParlamentar[] = [];
  for (const p of matriz.parlamentares) {
    let comparadas = 0;
    let iguais = 0;
    for (const [i, resposta] of indices) {
      const letra = p.posicoes[i];
      if (letra !== "S" && letra !== "N" && letra !== "A") continue;
      comparadas++;
      if (letra === LETRA[resposta]) iguais++;
    }
    if (comparadas === 0) continue;
    const { posicoes: _, ...dados } = p;
    parlamentares.push({ ...dados, comparadas, iguais });
  }
  parlamentares.sort(porConcordancia((p) => p.nome));

  const grupos = new Map<string, LinhaPartido>();
  for (const p of parlamentares) {
    const partido = p.partido ?? "Sem partido";
    const g = grupos.get(partido) ?? { partido, parlamentares: 0, comparadas: 0, iguais: 0 };
    g.parlamentares++;
    g.comparadas += p.comparadas;
    g.iguais += p.iguais;
    grupos.set(partido, g);
  }

  return {
    respondidas: indices.length,
    parlamentares,
    partidos: [...grupos.values()].sort(porConcordancia((g) => g.partido)),
  };
}

/** Lê as respostas de um FormData (campos `v:<id>` com SIM, NAO ou PULAR), só das votações conhecidas. */
export function respostasDoFormulario(dados: FormData, votacoes: Pick<VotacaoEscolhida, "id">[]): Respostas {
  const respostas: Respostas = {};
  for (const { id } of votacoes) {
    const valor = dados.get(`v:${id}`);
    if (valor === "SIM" || valor === "NAO") respostas[id] = valor;
  }
  return respostas;
}

/** Lê as respostas guardadas no aparelho; qualquer coisa estranha é descartada. */
export function respostasGuardadas(texto: string | null): Respostas {
  if (!texto) return {};
  try {
    const dados: unknown = JSON.parse(texto);
    if (!dados || typeof dados !== "object" || Array.isArray(dados)) return {};
    return Object.fromEntries(
      Object.entries(dados).filter((par): par is [string, Resposta] => par[1] === "SIM" || par[1] === "NAO"),
    );
  } catch {
    return {};
  }
}
