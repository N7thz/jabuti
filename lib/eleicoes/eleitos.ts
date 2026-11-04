// Eleitos de uma eleição para a Câmara e o Senado: tipos, filtro da lista e composição das casas.
// Funções puras (sem banco), usadas por lib/eleicoes/queries.ts e testadas em eleitos.test.ts.

import { normalizarNome } from "@/lib/sync/run";

import { chavePartido } from "./cores";
import { agruparComposicao, contarPorPartido, type GrupoComposicao } from "./hemiciclo";

/** Eleição geral mostrada em /parlamentares?eleitos=2026; a posse é em 1º de fevereiro do ano seguinte. */
export const ANO_ELEICAO = 2026;

export type CasaEleito = "camara" | "senado";

/**
 * Relação do eleito com o mandato atual, calculada na consulta (nada fica gravado no banco):
 * - "reeleito": está em exercício na mesma casa, numa cadeira para a qual foi eleito titular;
 * - "mesma-casa": está em exercício na mesma casa, mas como suplente ou sem a candidatura anterior no portal
 *   (não dá para afirmar que foi reeleito);
 * - "outra-casa": está em exercício na outra casa (deputado eleito senador, ou o contrário);
 * - "ja-foi": já foi parlamentar, mas não está em exercício;
 * - "novo": nunca foi deputado federal nem senador (até onde o portal sabe).
 */
export type SituacaoEleito = "reeleito" | "mesma-casa" | "outra-casa" | "ja-foi" | "novo";

export type EleitoResumo = {
  id: string;
  casa: CasaEleito;
  uf: string;
  nome: string;
  nomeUrna: string;
  partido: string;
  /** DS_SIT_TOT_TURNO: "ELEITO POR QP", "ELEITO POR MÉDIA" ou "ELEITO". */
  resultado: string;
  situacao: SituacaoEleito;
  /** Casa do mandato atual ou passado, quando já foi parlamentar. */
  casaAtual: CasaEleito | null;
  /** Perfil no portal, quando a pessoa já foi sincronizada como parlamentar. */
  perfil: { casa: CasaEleito; id: string } | null;
  fotoUrl: string | null;
};

/**
 * `candidaturas`: candidaturas do TSE que deram o mandato atual (cargo e DS_SIT_TOT_TURNO). Titular eleito =
 * resultado "ELEITO..." num cargo que não é de suplente (o suplente de deputado aparece como "SUPLENTE").
 */
export function situacaoDoEleito(
  casa: CasaEleito,
  parlamentar: { casa: CasaEleito; emExercicio: boolean; candidaturas?: { cargo: string; resultado: string | null }[] } | null,
): SituacaoEleito {
  if (!parlamentar) return "novo";
  if (!parlamentar.emExercicio) return "ja-foi";
  if (parlamentar.casa !== casa) return "outra-casa";
  const eleitoTitular = (parlamentar.candidaturas ?? []).some(
    (c) => /^ELEIT/i.test(c.resultado ?? "") && !/SUPLENTE/i.test(c.cargo),
  );
  return eleitoTitular ? "reeleito" : "mesma-casa";
}

/**
 * Número da legislatura que começa na posse dos eleitos em `ano` (1º de fevereiro do ano seguinte): 2026 → 58ª.
 * Inverso de `inicioDaLegislatura` (lib/anos.ts).
 */
export const legislaturaDaPosse = (ano: number) => (ano + 1 - 1795) / 4;

/** Senador em exercício cujo mandato continua depois da posse (ver lib/eleicoes/queries.ts). */
export type SenadorQueFica = { id: string; partido: string | null; uf: string | null };

export type FiltrosEleitos = { casa?: CasaEleito; uf?: string; partido?: string; nome?: string };

/**
 * Mesmos filtros da lista de parlamentares (nome já normalizado, ver filtros.ts). O partido é comparado pela
 * chave da sigla: "PCdoB" na URL acha "PC do B" do TSE, e "PODEMOS" acha "PODE".
 */
export function filtrarEleitos(lista: EleitoResumo[], { casa, uf, partido, nome }: FiltrosEleitos) {
  return lista.filter(
    (e) =>
      (!casa || e.casa === casa) &&
      (!uf || e.uf === uf) &&
      (!partido || chavePartido(e.partido) === chavePartido(partido)) &&
      (!nome || normalizarNome(e.nomeUrna).includes(nome) || normalizarNome(e.nome).includes(nome)),
  );
}

/** Cadeiras de cada casa a partir de fevereiro do ano seguinte à eleição. */
export const CADEIRAS = { camara: 513, senado: 81 } as const;
/** Em 2026 o Senado renova 2/3 das cadeiras (54); o outro terço (27) foi eleito em 2022 e fica até 2031. */
export const SENADORES_ELEITOS = 54;
export const SENADORES_QUE_FICAM = 27;

export type Composicao = {
  casa: CasaEleito;
  grupos: GrupoComposicao[];
  total: number;
  /** Total esperado com os dados completos (513, 81, ou a bancada de um estado no Senado: 3). */
  esperado: number | null;
  /** Só no Senado: quantas cadeiras vieram dos eleitos em 2022 que continuam no mandato. */
  queFicam?: number;
};

/**
 * Composição da Câmara e do Senado depois da posse. A Câmara é feita só dos eleitos; o Senado junta os eleitos
 * com os senadores eleitos na eleição anterior, cujo mandato continua. Com `uf`, a bancada daquele estado.
 */
export function montarComposicao(
  eleitos: Pick<EleitoResumo, "casa" | "uf" | "partido" | "perfil">[],
  senadoresQueFicam: SenadorQueFica[],
  uf?: string,
): Record<CasaEleito, Composicao> {
  const doEstado = eleitos.filter((e) => !uf || e.uf === uf);
  const deputados = doEstado.filter((e) => e.casa === "camara");
  const senadores = doEstado.filter((e) => e.casa === "senado");
  // Quem foi eleito agora não conta duas vezes (não deveria acontecer: o mandato de 2022 vai até 2031).
  const eleitosAgora = new Set(eleitos.flatMap((e) => (e.perfil ? [`${e.perfil.casa}-${e.perfil.id}`] : [])));
  const ficam = senadoresQueFicam.filter((s) => (!uf || s.uf === uf) && !eleitosAgora.has(`senado-${s.id}`));

  return {
    camara: {
      casa: "camara",
      grupos: agruparComposicao(contarPorPartido(deputados.map((e) => e.partido))),
      total: deputados.length,
      esperado: uf ? null : CADEIRAS.camara,
    },
    senado: {
      casa: "senado",
      grupos: agruparComposicao(
        contarPorPartido([...senadores.map((e) => e.partido), ...ficam.map((s) => s.partido ?? "Sem partido")]),
      ),
      total: senadores.length + ficam.length,
      esperado: uf ? 3 : CADEIRAS.senado,
      queFicam: ficam.length,
    },
  };
}
