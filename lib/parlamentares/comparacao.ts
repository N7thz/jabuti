import "server-only";

import { centavos, deCentavos, reais, reaisDoTexto, somar } from "@/lib/format/dinheiro";
import type { TipoVoto } from "@/lib/generated/prisma/enums";
import { getVotosDeputado } from "@/lib/votacoes/queries";
import { concordancia } from "@/lib/votacoes/rotulos";

import {
  getDeputado,
  getDespesasDeputado,
  getDespesasSenador,
  getEmendasDoAutor,
  getPresencaDeputado,
  getProcessosSenador,
  getProposicoesDeputado,
  getSenador,
  getVotacoesSenador,
  getVotosSenador,
} from "./queries";

/** "camara-204379" ou "senado-5672", o mesmo formato dos fixados. */
export const CHAVE_PARLAMENTAR = /^(camara|senado)-(\d{1,10})$/;

export function lerChave(chave: string | undefined) {
  const m = chave?.match(CHAVE_PARLAMENTAR);
  return m ? { casa: m[1] as "camara" | "senado", id: m[2] } : null;
}

const emendasEmCentavos = (emendas: Awaited<ReturnType<typeof getEmendasDoAutor>>["emendas"]) => ({
  quantidade: emendas.length,
  empenhado: centavos(somar(emendas.map((e) => reaisDoTexto(e.valorEmpenhado)))),
  pago: centavos(somar(emendas.map((e) => reaisDoTexto(e.valorPago)))),
});

/** Indicadores do ano corrente no mesmo formato para deputado e senador (valores em centavos), ou `null`. */
export async function getResumoComparavel(chave: string) {
  const alvo = lerChave(chave);
  if (!alvo) return null;

  if (alvo.casa === "camara") {
    const d = await getDeputado(alvo.id);
    if (!d) return null;
    const s = d.ultimoStatus;
    const [presenca, cota, proposicoes, emendas] = await Promise.all([
      getPresencaDeputado(d.id, s.data),
      getDespesasDeputado(d.id, s.idLegislatura),
      getProposicoesDeputado(d.id),
      getEmendasDoAutor(s.nomeEleitoral || s.nome),
    ]);
    return {
      chave,
      casa: alvo.casa,
      id: alvo.id,
      nome: s.nome,
      cargo: "Deputado(a) federal",
      partido: s.siglaPartido,
      uf: s.siglaUf,
      fotoUrl: s.urlFoto,
      perfil: `/parlamentares/deputado/${alvo.id}`,
      ano: cota.ano,
      presenca: { parte: presenca.presencas, total: presenca.sessoes, base: "sessões deliberativas do plenário" },
      cota: centavos(somar(cota.despesas.map((x) => reais(x.valorLiquido)))),
      proposicoes: proposicoes.length,
      emendas: emendasEmCentavos(emendas.emendas),
    };
  }

  const sen = await getSenador(alvo.id);
  if (!sen) return null;
  const [votacoes, cota, processos, emendas] = await Promise.all([
    getVotacoesSenador(alvo.id),
    getDespesasSenador(alvo.id),
    getProcessosSenador(alvo.id),
    getEmendasDoAutor(sen.nome),
  ]);
  const { PRESENTE, AUSENCIA_JUSTIFICADA, AUSENTE } = votacoes.presenca;
  return {
    chave,
    casa: alvo.casa,
    id: alvo.id,
    nome: sen.nome,
    cargo: "Senador(a)",
    partido: sen.partido,
    uf: sen.uf,
    fotoUrl: sen.fotoUrl,
    perfil: `/parlamentares/senador/${alvo.id}`,
    ano: cota.ano,
    presenca: { parte: PRESENTE, total: PRESENTE + AUSENCIA_JUSTIFICADA + AUSENTE, base: "votações nominais do plenário" },
    cota: cota.resumo?.total ?? centavos(deCentavos(0)),
    proposicoes: processos.length,
    emendas: emendasEmCentavos(emendas.emendas),
  };
}

export type ResumoComparavel = NonNullable<Awaited<ReturnType<typeof getResumoComparavel>>>;

async function votosPorVotacao(casa: "camara" | "senado", id: string) {
  const votos = casa === "camara" ? await getVotosDeputado(id, 2000) : (await getVotosSenador(id)).votos;
  return new Map<string, TipoVoto>(votos.map((v) => [v.votacaoId, v.tipo]));
}

/** Concordância nas votações nominais; só faz sentido entre parlamentares da mesma casa. */
export async function getConcordancia(a: ResumoComparavel, b: ResumoComparavel) {
  if (a.casa !== b.casa) return null;
  const [votosA, votosB] = await Promise.all([votosPorVotacao(a.casa, a.id), votosPorVotacao(b.casa, b.id)]);
  return concordancia(votosA, votosB);
}
