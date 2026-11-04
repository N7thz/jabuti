import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import { db } from "@/lib/db";
import { descreverErro, type Falha, type MotivoErro } from "@/lib/erros";

import { createSenadoClient } from "@/lib/senado/client";
import { NA_PAGINA } from "@/lib/sync/run";

import {
  type CasaEleito,
  type EleitoResumo,
  legislaturaDaPosse,
  montarComposicao,
  type SenadorQueFica,
  situacaoDoEleito,
} from "./eleitos";

const senado = createSenadoClient(NA_PAGINA);

// Eleitos do TSE gravados pela carga (scripts/sync-eleitos.ts). Dado do banco: a lista de eleitos não existe nas
// APIs da Câmara e do Senado antes da posse. A etiqueta "eleitos" é renovada depois das cargas do TSE, da Câmara
// e do Senado (lib/sync/revalidar.ts): o selo "Reeleito" depende de quem está em exercício.

const FONTE = "a lista de eleitos do TSE";

/**
 * Falha guardada como dado: dentro de "use cache" um erro lançado derruba o build. A função devolve a falha com
 * vida de segundos (ver lib/parlamentares/queries.ts) e quem chama decide o que mostrar.
 */
type FalhaEmCache = { falha: MotivoErro; naoCarregado: boolean };

const casaDe = (casa: "CAMARA" | "SENADO"): CasaEleito => (casa === "CAMARA" ? "camara" : "senado");

/** P2021: a tabela ainda não existe no banco (migração não aplicada). */
const tabelaAusente = (erro: unknown) =>
  (typeof erro === "object" && erro !== null && "code" in erro && (erro as { code: unknown }).code === "P2021") ||
  (erro instanceof Error && /relation .*Eleito.* does not exist|table .*Eleito.* does not exist/i.test(erro.message));

function falhaEmCache(erro: unknown): FalhaEmCache {
  unstable_rethrow(erro);
  console.error(`[fonte indisponível] ${FONTE}:`, erro);
  cacheLife("seconds");
  return { falha: descreverErro(erro), naoCarregado: tabelaAusente(erro) };
}

async function eleitosDoBanco(ano: number): Promise<EleitoResumo[] | FalhaEmCache> {
  "use cache";
  cacheTag("tse", "eleitos");

  try {
    // Sem o CPF: só serve para casar registros entre fontes e nunca sai do banco para a página.
    const linhas = await db.eleito.findMany({
      where: { ano },
      orderBy: { nomeUrna: "asc" },
      select: {
        id: true,
        casa: true,
        uf: true,
        nome: true,
        nomeUrna: true,
        partido: true,
        resultado: true,
        parlamentar: {
          select: {
            casa: true,
            idExterno: true,
            emExercicio: true,
            fotoUrl: true,
            // Candidaturas que deram o mandato atual: distinguem o titular reeleito do suplente em exercício.
            candidaturas: { where: { ano: { lt: ano } }, select: { cargo: true, resultado: true } },
          },
        },
      },
    });
    // Vazio = carga ainda não feita (a tabela nasce vazia na migração): não segurar o aviso por horas.
    if (linhas.length === 0) cacheLife("seconds");
    else cacheLife("hours");
    return linhas.map(({ parlamentar: p, ...e }) => {
      const casa = casaDe(e.casa);
      const atual = p ? { casa: casaDe(p.casa), emExercicio: p.emExercicio, candidaturas: p.candidaturas } : null;
      return {
        ...e,
        casa,
        situacao: situacaoDoEleito(casa, atual),
        casaAtual: atual?.casa ?? null,
        perfil: p ? { casa: casaDe(p.casa), id: p.idExterno } : null,
        fotoUrl: p?.fotoUrl ?? null,
      };
    });
  } catch (erro) {
    return falhaEmCache(erro);
  }
}

/**
 * Senadores em exercício cujo mandato continua depois da posse dos eleitos (em 2026, os eleitos em 2022, até
 * 2031), titulares ou suplentes que assumiram, com o partido atual. Vem da API do Senado, que informa as
 * legislaturas de cada mandato: fica quem tem a última legislatura do mandato igual ou depois da que começa na posse.
 */
async function senadoresQueFicamDaApi(legislaturaDaPosse: number): Promise<SenadorQueFica[] | FalhaEmCache> {
  "use cache";
  cacheTag("parlamentares", "eleitos");

  try {
    const lista = (await senado.senadoresEmExercicio())
      .filter((s) => (s.ultimaLegislatura ?? 0) >= legislaturaDaPosse)
      .map((s) => ({ id: s.codigo, partido: s.partido, uf: s.uf }));
    cacheLife("hours");
    return lista;
  } catch (erro) {
    unstable_rethrow(erro);
    console.error("[fonte indisponível] o Senado:", erro);
    cacheLife("seconds");
    return { falha: descreverErro(erro), naoCarregado: false };
  }
}

export type ResultadoEleitos =
  | { ok: true; lista: EleitoResumo[] }
  | { ok: false; falha: Falha; naoCarregado: boolean };

function comoFalha(r: FalhaEmCache): ResultadoEleitos {
  if (r.naoCarregado)
    return {
      ok: false,
      naoCarregado: true,
      falha: {
        fonte: FONTE,
        codigo: "nao-encontrado",
        motivo: "Os eleitos ainda não foram carregados no portal.",
        passageiro: false,
      },
    };
  return { ok: false, naoCarregado: false, falha: { fonte: FONTE, ...r.falha } };
}

/** Eleitos de um ano para a Câmara e o Senado, por nome de urna. Lista vazia = carga ainda não feita. */
export async function listarEleitos(ano: number): Promise<ResultadoEleitos> {
  const r = await eleitosDoBanco(ano);
  if ("falha" in r) return comoFalha(r);
  if (r.length === 0) return comoFalha({ falha: descreverErro(null), naoCarregado: true });
  return { ok: true, lista: r };
}

/**
 * Composição da Câmara e do Senado a partir da posse dos eleitos em `ano`, do país ou da bancada de um estado.
 * Se a consulta dos senadores que continuam falhar, o Senado vem só com os eleitos e `falhaSenado` explica.
 */
export async function getComposicao(ano: number, lista: EleitoResumo[], uf?: string) {
  const ficam = await senadoresQueFicamDaApi(legislaturaDaPosse(ano));
  const falhou = "falha" in ficam;
  return {
    ...montarComposicao(lista, falhou ? [] : ficam, uf),
    falhaSenado: falhou ? ({ fonte: "o Senado", ...ficam.falha } satisfies Falha) : null,
  };
}
