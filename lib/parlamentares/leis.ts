// Leis em que o parlamentar teve a mão: as que propôs (autor), as que assinou junto (coautor) e as que
// relatou (só Senado: a Câmara não publica relatorias por deputado). Só contam leis, leis complementares
// e emendas à Constituição (ver lerNorma); decretos legislativos e resoluções ficam de fora.

import type { AutorProposicaoApi } from "@/lib/camara/types";
import { ehTipoDeLei, lerNorma, urlMateriaSenado, urlProposicaoCamara } from "@/lib/leis/etapas";
import type { ProcessoApi, RelatoriaApi } from "@/lib/senado/types";
import { normalizarNome } from "@/lib/sync/run";

export type Papel = "autor" | "coautor" | "relator";

export interface LeiDoParlamentar {
  chave: string;
  papel: Papel;
  /** "PL 2832/2021". */
  identificacao: string;
  ementa: string;
  /** "Lei nº 14.419, de 20/07/2022"; null quando a fonte não diz qual norma o projeto gerou. */
  norma: string | null;
  /** AAAA-MM-DD da norma ou, sem ela, da apresentação. Ordena a lista. */
  data: string | null;
  comVeto: boolean;
  /** Onde relatou: "CAS", "Plenário". Só para relator. */
  colegiado: string | null;
  url: string | null;
}

export const maisRecentes = (a: LeiDoParlamentar, b: LeiDoParlamentar) => (b.data ?? "").localeCompare(a.data ?? "");

/**
 * O primeiro nome da autoria é o proponente: "Senador Fulano (PT/RS) e outros." ou
 * "Senador Fulano (PT/RS), Senadora Beltrana (PL/DF)". Se ele não for o parlamentar, foi coautoria.
 */
export function papelNaAutoria(autoria: string | null | undefined, nome: string): "autor" | "coautor" {
  const primeiro = (autoria ?? "").split(/\)|,| e outros/)[0];
  return normalizarNome(primeiro).includes(normalizarNome(nome)) ? "autor" : "coautor";
}

/** Processos do senador (autoria ou coautoria) que viraram lei. Medida provisória e projeto de conversão da mesma lei contam uma vez. */
export function leisDeAutoriaSenado(processos: ProcessoApi[], nome: string): LeiDoParlamentar[] {
  const porNorma = new Map<string, LeiDoParlamentar>();
  for (const p of processos) {
    const norma = lerNorma(p.normaGerada);
    if (!norma || !ehTipoDeLei(p.identificacao) || porNorma.has(norma.texto)) continue;
    porNorma.set(norma.texto, {
      chave: `senado-${p.id}`,
      papel: papelNaAutoria(p.autoria, nome),
      identificacao: p.identificacao,
      ementa: p.ementa?.trim() || "Sem ementa publicada.",
      norma: norma.texto,
      data: norma.data,
      comVeto: /veto parcial/i.test(p.situacaoAtual ?? ""),
      colegiado: null,
      url: p.codigoMateria ? urlMateriaSenado(p.codigoMateria) : null,
    });
  }
  return [...porNorma.values()].sort(maisRecentes);
}

/**
 * Relatorias em processos que viraram lei. O mesmo processo volta a cada comissão ou redistribuição:
 * fica um item por processo, com o colegiado da designação mais recente. Processos de que ele é autor
 * já aparecem como autoria e saem daqui.
 */
export function leisRelatadasSenado(
  relatorias: { relatoria: RelatoriaApi; comVeto: boolean }[],
  jaListados: Set<string>,
): LeiDoParlamentar[] {
  const porProcesso = new Map<number, { relatoria: RelatoriaApi; comVeto: boolean }>();
  for (const r of relatorias) {
    if (!ehTipoDeLei(r.relatoria.identificacaoProcesso) || jaListados.has(r.relatoria.identificacaoProcesso)) continue;
    const atual = porProcesso.get(r.relatoria.idProcesso);
    if (!atual || (r.relatoria.dataDesignacao ?? "") > (atual.relatoria.dataDesignacao ?? "")) porProcesso.set(r.relatoria.idProcesso, r);
  }
  return [...porProcesso.values()]
    .map(({ relatoria: r, comVeto }) => ({
      chave: `relatoria-${r.idProcesso}`,
      papel: "relator" as const,
      identificacao: r.identificacaoProcesso,
      ementa: r.ementaProcesso?.trim() || "Sem ementa publicada.",
      norma: null,
      data: r.dataApresentacaoProcesso?.slice(0, 10) ?? null,
      comVeto,
      colegiado: r.siglaColegiado === "PLEN" ? "Plenário" : r.siglaColegiado,
      url: r.codigoMateria ? urlMateriaSenado(r.codigoMateria) : null,
    }))
    .sort(maisRecentes);
}

/** Situação da Câmara para proposição que virou lei. */
export const virouLeiNaCamara = (descricaoSituacao: string | null | undefined) =>
  /transformad[ao] em norma jur[ií]dica/i.test(descricaoSituacao ?? "");

/** Autor se assinou primeiro; coautor se assinou depois. Sem o deputado na lista (não deveria acontecer), coautor. */
export function papelNaCamara(autores: AutorProposicaoApi[], idDeputado: number): "autor" | "coautor" {
  const dele = autores.find((a) => a.uri?.endsWith(`/deputados/${idDeputado}`));
  return dele?.ordemAssinatura === 1 ? "autor" : "coautor";
}

/** Item de uma lei da Câmara; a norma vem do Senado quando dá para casar o número (ver getLeisDeputado). */
export function leiDaCamara(
  p: { id: number; siglaTipo: string; numero: number; ano: number; ementa: string; dataApresentacao: string | null },
  papel: "autor" | "coautor",
  normaGerada: string | null,
  comVeto: boolean,
): LeiDoParlamentar {
  const norma = lerNorma(normaGerada);
  return {
    chave: `camara-${p.id}`,
    papel,
    identificacao: `${p.siglaTipo} ${p.numero}/${p.ano}`,
    ementa: p.ementa?.trim() || "Sem ementa publicada.",
    norma: norma?.texto ?? null,
    data: norma?.data ?? p.dataApresentacao?.slice(0, 10) ?? null,
    comVeto,
    colegiado: null,
    url: urlProposicaoCamara(p.id),
  };
}
