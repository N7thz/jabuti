import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { createCamaraClient } from "@/lib/camara/client";
import { createSenadoClient } from "@/lib/senado/client";
import type { FiltrosProcesso, ProcessoApi } from "@/lib/senado/types";
import { NA_PAGINA } from "@/lib/sync/run";

import {
  decisaoLegivel,
  ehTipoDeLei,
  lerNorma,
  origemNoSenado,
  siglaDe,
  situacaoLegivel,
  TIPOS_CAMARA,
  urlMateriaSenado,
  urlProposicaoCamara,
} from "./etapas";

const senado = createSenadoClient(NA_PAGINA);
const camara = createCamaraClient(NA_PAGINA);

const iso = (d: Date) => d.toISOString().slice(0, 10);
const diasAtras = (dias: number) => iso(new Date(Date.now() - dias * 86_400_000));

/** Um projeto na lista de /leis, já no formato da página (o mesmo para as duas casas). */
export interface Projeto {
  chave: string;
  casa: "camara" | "senado";
  /** "PL 5649/2026". */
  identificacao: string;
  sigla: string;
  ementa: string;
  autoria: string | null;
  situacao: string | null;
  /** Data que ordena a lista (da lei, da decisão, da situação ou da apresentação), AAAA-MM-DD. */
  data: string | null;
  norma: string | null;
  comVeto: boolean;
  decisao: ReturnType<typeof decisaoLegivel>;
  origem: string | null;
  url: string | null;
}

// O "use cache" guarda só o que a página usa: a resposta crua do Senado tem dezenas de campos por processo.
function doSenado(p: ProcessoApi, data: string | null): Projeto {
  const situacao = situacaoLegivel(p.situacaoAtual);
  return {
    chave: `senado-${p.id}`,
    casa: "senado",
    identificacao: p.identificacao,
    sigla: siglaDe(p.identificacao),
    ementa: p.ementa?.trim() || "Sem ementa publicada.",
    autoria: p.autoria?.trim() || null,
    situacao,
    data,
    norma: lerNorma(p.normaGerada)?.texto ?? null,
    comVeto: /veto parcial/i.test(p.situacaoAtual ?? ""),
    decisao: decisaoLegivel(p.siglaTipoDeliberacao),
    origem: origemNoSenado(p.objetivo),
    url: p.codigoMateria ? urlMateriaSenado(p.codigoMateria) : null,
  };
}

const maisRecentes = (a: Projeto, b: Projeto) =>
  (b.data ?? "").localeCompare(a.data ?? "") || b.identificacao.localeCompare(a.identificacao, "pt-BR", { numeric: true });

async function processosDeLei(...filtros: FiltrosProcesso[]) {
  const listas = await Promise.all(filtros.map((f) => senado.processos(f)));
  const vistos = new Set<number>();
  return listas.flat().filter((p) => ehTipoDeLei(p.identificacao) && !vistos.has(p.id) && vistos.add(p.id));
}

/** Leis, leis complementares e emendas à Constituição deste ano e do anterior, da mais nova para a mais antiga. */
export async function getLeisRecentes() {
  "use cache";
  cacheLife("hours");
  cacheTag("leis");

  const ano = new Date().getFullYear();
  const processos = await processosDeLei({ anoNorma: ano }, { anoNorma: ano - 1 });
  // Uma mesma lei pode vir de dois processos (a medida provisória e o projeto de conversão): fica um só.
  const porNorma = new Map<string, Projeto>();
  for (const p of processos) {
    const norma = lerNorma(p.normaGerada);
    if (norma && !porNorma.has(norma.texto)) porNorma.set(norma.texto, doSenado(p, norma.data));
  }
  return [...porNorma.values()].sort(maisRecentes);
}

/** Aprovados pelo Congresso e enviados ao presidente (sanção) ou à promulgação, pelo Senado. */
export async function getAguardandoSancao() {
  "use cache";
  cacheLife("hours");
  cacheTag("leis");

  const processos = await processosDeLei(
    { siglaSituacao: "RMSAN", tramitouLegislaturaAtual: "S" },
    { siglaSituacao: "RMPRO", tramitouLegislaturaAtual: "S" },
  );
  return processos.map((p) => doSenado(p, p.dataSituacaoAtual ?? null)).sort(maisRecentes);
}

/** Prontos para o Plenário do Senado ou já incluídos na Ordem do Dia. */
export async function getProntosParaVotar() {
  "use cache";
  cacheLife("hours");
  cacheTag("leis");

  const processos = await processosDeLei(
    { siglaSituacao: "INCLOD", tramitouLegislaturaAtual: "S" },
    { siglaSituacao: "PRONDEPLEN", tramitouLegislaturaAtual: "S" },
  );
  return processos.map((p) => doSenado(p, p.dataSituacaoAtual ?? null)).sort(maisRecentes);
}

export const DIAS_DECIDIDOS = 30;

/** Projetos com decisão no Senado (Plenário ou comissão) nos últimos 30 dias. */
export async function getDecididosRecentes() {
  "use cache";
  cacheLife("hours");
  cacheTag("leis");

  const processos = await processosDeLei({
    dataInicioDeliberacao: diasAtras(DIAS_DECIDIDOS),
    dataFimDeliberacao: diasAtras(0),
  });
  return processos.map((p) => doSenado(p, p.dataDeliberacao ?? null)).sort(maisRecentes);
}

export const DIAS_NOVOS = 30;
/** A Câmara não filtra por situação: a de cada projeto exige uma consulta à parte, então o lote é pequeno. */
export const LIMITE_NOVOS_CAMARA = 30;

/** Projetos apresentados no Senado nos últimos 30 dias. */
export async function getNovosNoSenado() {
  "use cache";
  cacheLife("hours");
  cacheTag("leis");

  const processos = await processosDeLei({
    dataInicioApresentacao: diasAtras(DIAS_NOVOS),
    dataFimApresentacao: diasAtras(0),
  });
  return processos.map((p) => doSenado(p, p.dataApresentacao ?? null)).sort(maisRecentes);
}

/** Os últimos projetos apresentados na Câmara, com a situação de cada um. */
export async function getNovosNaCamara() {
  "use cache";
  cacheLife("hours");
  cacheTag("leis");

  const recentes = await camara.proposicoesRecentes(TIPOS_CAMARA, LIMITE_NOVOS_CAMARA);
  return Promise.all(
    recentes.map(async (p): Promise<Projeto> => {
      // Sem a situação o projeto continua na lista: falta um detalhe, não o projeto.
      const status = await camara.proposicao(p.id).then((d) => d.statusProposicao, () => null);
      return {
        chave: `camara-${p.id}`,
        casa: "camara",
        identificacao: `${p.siglaTipo} ${p.numero}/${p.ano}`,
        sigla: p.siglaTipo,
        ementa: p.ementa?.trim() || "Sem ementa publicada.",
        autoria: null,
        situacao: situacaoLegivel(status?.descricaoSituacao ?? status?.descricaoTramitacao),
        data: p.dataApresentacao?.slice(0, 10) ?? null,
        norma: null,
        comVeto: false,
        decisao: null,
        origem: "Começou na Câmara",
        url: urlProposicaoCamara(p.id),
      };
    }),
  );
}
