import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { reaisDeCentavos } from "@/components/emendas/valores";
import { anoCorrente } from "@/lib/anos";
import { asArray } from "@/lib/senado/client";
import { fontesQueFalharam, tentar } from "@/lib/erros";
import { formatarData } from "@/lib/format/datas";
import { centavos, reais, somar } from "@/lib/format/dinheiro";
import { lerChave } from "@/lib/parlamentares/comparacao";
import {
  getDeputado,
  getDespesasDeputado,
  getDespesasSenador,
  getPresencaDeputado,
  getProcessosSenador,
  getProposicoesDeputado,
  getSenador,
  getVotacoesSenador,
  getVotosSenador,
} from "@/lib/parlamentares/queries";
import { createFetcher, NA_PAGINA } from "@/lib/sync/run";
import { getVotosDeputado } from "@/lib/votacoes/queries";

import { fatoCota, fatoPresenca, fatoProjetos, fatoVoto, telefone, type Destinatario, type Fato } from "./texto";

const fetchJson = createFetcher(NA_PAGINA);

export interface Contato extends Destinatario {
  chave: string;
  id: string;
  cargo: string;
  fotoUrl: string | null;
  perfil: string;
  email: string | null;
  telefone: { exibir: string; href: string } | null;
  /** Endereço do gabinete, como a casa publica. */
  gabinete: string | null;
  redes: string[];
  /** Data em que o deputado entrou no mandato atual (base da presença). */
  inicioMandato: string | null;
}

interface DetalheSenadorContato {
  DetalheParlamentar: {
    Parlamentar?: {
      DadosBasicosParlamentar?: { EnderecoParlamentar?: string };
      Telefones?: { Telefone?: { NumeroTelefone: string; IndicadorFax?: string } | { NumeroTelefone: string; IndicadorFax?: string }[] };
    };
  };
}

/** Telefone e endereço do gabinete do senador: o cadastro normalizado de lib/senado não traz esses campos. */
async function contatoSenador(codigo: string) {
  "use cache";
  cacheLife("days");
  cacheTag("parlamentares", `senador:${codigo}`);

  const r = await fetchJson<DetalheSenadorContato>(`https://legis.senado.leg.br/dadosabertos/senador/${encodeURIComponent(codigo)}`);
  const p = r.DetalheParlamentar.Parlamentar;
  const fone = asArray(p?.Telefones?.Telefone).find((t) => t.IndicadorFax !== "Sim");
  return {
    telefone: fone?.NumeroTelefone ?? null,
    gabinete: p?.DadosBasicosParlamentar?.EnderecoParlamentar?.replace(/\s+/g, " ").trim() || null,
  };
}

/** Nome, partido e canais oficiais do parlamentar da chave ("camara-204379", "senado-5672"), ou `null`. */
export async function getContato(chave: string | undefined): Promise<Contato | null> {
  const alvo = lerChave(chave);
  if (!alvo) return null;

  if (alvo.casa === "camara") {
    const d = await getDeputado(alvo.id);
    if (!d) return null;
    const s = d.ultimoStatus;
    const g = s.gabinete;
    return {
      chave: chave!,
      id: alvo.id,
      casa: "camara",
      cargo: "Deputado(a) federal",
      nome: s.nome,
      partido: s.siglaPartido,
      uf: s.siglaUf,
      fotoUrl: s.urlFoto,
      perfil: `/parlamentares/deputado/${alvo.id}`,
      email: s.email,
      telefone: telefone(g?.telefone),
      gabinete: g?.sala ? `Gabinete ${g.sala}, Anexo ${g.predio ?? "—"}, Câmara dos Deputados, Brasília (DF)` : null,
      redes: d.redeSocial.filter((url) => /^https:\/\//.test(url)),
      inicioMandato: s.data,
    };
  }

  const sen = await getSenador(alvo.id);
  if (!sen) return null;
  // Sem o telefone a página ainda funciona: fica o email.
  const extra = await tentar("o Senado", contatoSenador(alvo.id));
  return {
    chave: chave!,
    id: alvo.id,
    casa: "senado",
    cargo: "Senador(a)",
    nome: sen.nome,
    partido: sen.partido,
    uf: sen.uf,
    fotoUrl: sen.fotoUrl,
    perfil: `/parlamentares/senador/${alvo.id}`,
    email: sen.email,
    telefone: extra.ok ? telefone(extra.dados.telefone) : null,
    gabinete: extra.ok && extra.dados.gabinete ? `${extra.dados.gabinete}, Brasília (DF)` : null,
    redes: [],
    inicioMandato: null,
  };
}

/** Quantos votos recentes oferecer como fato. */
const VOTOS_RECENTES = 5;

/**
 * Fatos do ano corrente para basear a mensagem: presença, gasto da cota, projetos e os votos mais
 * recentes. Cada fonte é consultada à parte: se uma cair, os outros fatos continuam.
 */
export async function getFatos(c: Contato) {
  const ano = anoCorrente();
  const rotuloAno = `${ano} (até ${formatarData(new Date())})`;

  if (c.casa === "camara") {
    const id = Number(c.id);
    const [presenca, cota, proposicoes, votos] = await Promise.all([
      tentar("a Câmara dos Deputados", getPresencaDeputado(id, c.inicioMandato, ano)),
      tentar("a Câmara dos Deputados", getDespesasDeputado(id, ano)),
      tentar("a Câmara dos Deputados", getProposicoesDeputado(id, ano)),
      tentar("o banco de votações", getVotosDeputado(c.id, VOTOS_RECENTES)),
    ]);
    const fatos: Fato[] = [];
    if (presenca.ok && presenca.dados.sessoes > 0) {
      fatos.push(fatoPresenca("camara", rotuloAno, presenca.dados.presencas, presenca.dados.sessoes));
    }
    if (cota.ok) {
      const porTipo = Object.entries(Object.groupBy(cota.dados.despesas, (d) => d.tipoDespesa || "Não informado"))
        .map(([tipo, itens = []]) => ({ tipo, total: centavos(somar(itens.map((d) => reais(d.valorLiquido)))) }))
        .sort((a, b) => b.total - a.total);
      const total = centavos(somar(cota.dados.despesas.map((d) => reais(d.valorLiquido))));
      fatos.push(
        fatoCota(rotuloAno, reaisDeCentavos(total), porTipo[0] ? { tipo: porTipo[0].tipo, total: reaisDeCentavos(porTipo[0].total) } : null),
      );
    }
    if (proposicoes.ok) {
      const p = proposicoes.dados[0];
      fatos.push(
        fatoProjetos(rotuloAno, proposicoes.dados.length, p ? { rotulo: `${p.siglaTipo} ${p.numero}/${p.ano}`, ementa: p.ementa } : null),
      );
    }
    if (votos.ok) {
      for (const v of votos.dados) {
        fatos.push(
          fatoVoto({
            id: v.votacaoId,
            data: formatarData(v.data),
            proposicao: v.proposicao?.rotulo ?? null,
            descricao: v.descricao,
            votoOriginal: v.votoOriginal,
          }),
        );
      }
    }
    return { fatos, indisponiveis: fontesQueFalharam(presenca, cota, proposicoes, votos) };
  }

  const [presenca, cota, processos, votos] = await Promise.all([
    tentar("o Senado", getVotacoesSenador(c.id, ano)),
    tentar("o Senado", getDespesasSenador(c.id, ano)),
    tentar("o Senado", getProcessosSenador(c.id, ano)),
    tentar("o Senado", getVotosSenador(c.id, ano)),
  ]);
  const fatos: Fato[] = [];
  if (presenca.ok) {
    const { PRESENTE, AUSENCIA_JUSTIFICADA, AUSENTE } = presenca.dados.presenca;
    const total = PRESENTE + AUSENCIA_JUSTIFICADA + AUSENTE;
    if (total > 0) fatos.push(fatoPresenca("senado", rotuloAno, PRESENTE, total));
  }
  if (cota.ok && cota.dados.resumo) {
    const maior = cota.dados.resumo.porTipo[0];
    fatos.push(
      fatoCota(rotuloAno, reaisDeCentavos(cota.dados.resumo.total), maior ? { tipo: maior.tipo, total: reaisDeCentavos(maior.total) } : null),
    );
  }
  if (processos.ok) {
    const p = processos.dados[0];
    fatos.push(fatoProjetos(rotuloAno, processos.dados.length, p ? { rotulo: p.identificacao, ementa: p.ementa } : null));
  }
  if (votos.ok) {
    for (const v of votos.dados.votos.slice(0, VOTOS_RECENTES)) {
      fatos.push(
        fatoVoto({
          id: v.votacaoId,
          data: formatarData(v.data),
          proposicao: v.proposicao?.rotulo ?? null,
          descricao: v.descricao,
          votoOriginal: v.votoOriginal,
        }),
      );
    }
  }
  return { fatos, indisponiveis: fontesQueFalharam(presenca, cota, processos, votos) };
}
