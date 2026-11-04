import { createFetcher, type OpcoesFetcher } from "../sync/run";
import type {
  AutorProposicaoApi,
  Despesa,
  DeputadoResumo,
  Detalhe,
  Evento,
  HistoricoDeputadoApi,
  Legislatura,
  MandatoExternoApi,
  OrientacaoApi,
  Pagina,
  ProposicaoDetalhe,
  ProposicaoResumo,
  Votacao,
  VotacaoDetalhe,
  VotoApi,
} from "./types";

const BASE = "https://dadosabertos.camara.leg.br/api/v2";
/** Teto de páginas de 100 itens numa listagem; a maior do portal (votações de um ano) fica bem abaixo. */
export const MAX_PAGINAS = 1_000;

/** Cliente tipado da API de Dados Abertos da Câmara. Chamadas simultâneas respeitam o mesmo intervalo mínimo. */
export function createCamaraClient({ minIntervalMs = 150, ...opcoes }: OpcoesFetcher = {}) {
  const get = createFetcher({ minIntervalMs, ...opcoes });

  function montar(caminho: string, params: Record<string, string | number | undefined> = {}) {
    const url = new URL(BASE + caminho);
    for (const [chave, valor] of Object.entries(params)) {
      if (valor !== undefined) url.searchParams.set(chave, String(valor));
    }
    return url.toString();
  }

  /**
   * Segue `links` rel="next" até acabar. Alguns endpoints (votos, eventos/deputados) não paginam.
   * Um "next" que aponta para uma página já lida, ou mais de MAX_PAGINAS páginas, é defeito da API: lança em
   * vez de ficar em laço.
   */
  async function paginar<T>(caminho: string, params: Record<string, string | number | undefined> = {}) {
    const itens: T[] = [];
    const lidas = new Set<string>();
    let url: string | undefined = montar(caminho, { itens: 100, ...params });

    while (url) {
      if (lidas.has(url) || lidas.size >= MAX_PAGINAS) {
        throw new Error(`Paginação da Câmara sem fim em ${caminho} (${lidas.size} páginas lidas).`);
      }
      lidas.add(url);
      const pagina: Pagina<T> = await get<Pagina<T>>(url);
      itens.push(...pagina.dados);
      url = pagina.links.find((link) => link.rel === "next")?.href;
    }
    return itens;
  }

  async function detalhe<T>(caminho: string) {
    return (await get<Detalhe<T>>(montar(caminho))).dados;
  }

  return {
    /** Legislatura que cobre a data (padrão: hoje); cai para a mais recente já iniciada. */
    async legislaturaAtual(hoje = new Date()) {
      const dia = hoje.toISOString().slice(0, 10);
      const { dados: recentes } = await get<Pagina<Legislatura>>(
        montar("/legislaturas", { ordem: "DESC", ordenarPor: "id", itens: 5 }),
      );
      const atual = recentes.find((l) => l.dataInicio <= dia && dia <= l.dataFim) ?? recentes.find((l) => l.dataInicio <= dia);
      if (!atual) throw new Error("Nenhuma legislatura encontrada na API da Câmara.");
      return atual;
    },

    /** Todos que exerceram mandato na legislatura (inclui quem saiu e suplentes). */
    deputados: (idLegislatura: number) => paginar<DeputadoResumo>("/deputados", { idLegislatura }),

    /** Deputados em exercício hoje (sem filtro, a API devolve só os 513 atuais). */
    deputadosEmExercicio: () => paginar<DeputadoResumo>("/deputados"),

    /** Votações do intervalo; a API aceita no máximo 3 meses por chamada. */
    votacoes: (dataInicio: string, dataFim: string) =>
      paginar<Votacao>("/votacoes", { dataInicio, dataFim, ordem: "ASC", ordenarPor: "dataHoraRegistro" }),

    votacao: (id: string) => detalhe<VotacaoDetalhe>(`/votacoes/${encodeURIComponent(id)}`),

    /** Votos nominais; vem tudo numa resposta só (não aceita itens/pagina) e vazio em votações simbólicas. */
    async votos(id: string) {
      return (await get<Pagina<VotoApi>>(montar(`/votacoes/${encodeURIComponent(id)}/votos`))).dados;
    },

    /** Trocas de partido, licenças e afastamentos em todos os mandatos, do mais antigo ao mais novo. */
    async historico(id: number | string) {
      return (await get<Pagina<HistoricoDeputadoApi>>(montar(`/deputados/${id}/historico`))).dados;
    },

    /** Cargos eletivos fora da Câmara que o próprio deputado informou (ver MandatoExternoApi). */
    async mandatosExternos(id: number | string) {
      return (await get<Pagina<MandatoExternoApi>>(montar(`/deputados/${id}/mandatosExternos`))).dados;
    },

    /** Orientação de cada partido, bloco e liderança; vazia em votações simbólicas. */
    async orientacoes(id: string) {
      return (await get<Pagina<OrientacaoApi>>(montar(`/votacoes/${encodeURIComponent(id)}/orientacoes`))).dados;
    },

    /**
     * Últimas proposições apresentadas dos tipos pedidos (ex.: ["PL", "PEC"]), das mais novas para as mais antigas.
     * `desde` (AAAA-MM-DD) limita a busca às apresentadas a partir da data: sem ela a API percorre o acervo
     * inteiro e leva de 7 a mais de 15 s; com 30 dias, de 0,5 a 4 s (medido em novembro de 2026).
     */
    async proposicoesRecentes(siglaTipo: string[], itens: number, desde?: string) {
      const url = montar("/proposicoes", {
        siglaTipo: siglaTipo.join(","),
        dataApresentacaoInicio: desde,
        ordem: "DESC",
        ordenarPor: "id",
        itens,
      });
      return (await get<Pagina<ProposicaoResumo>>(url)).dados;
    },

    proposicao: (id: number | string) => detalhe<ProposicaoDetalhe>(`/proposicoes/${id}`),

    eventos: (dataInicio: string, dataFim: string) =>
      paginar<Evento>("/eventos", { dataInicio, dataFim, ordem: "ASC", ordenarPor: "dataHoraInicio" }),

    /** Deputados registrados como presentes no evento. */
    async eventoDeputados(id: number) {
      return (await get<Pagina<DeputadoResumo>>(montar(`/eventos/${id}/deputados`))).dados;
    },

    /**
     * Despesas da cota. `idLegislatura` é obrigatório: sem ele a API devolve lista vazia.
     * Sem `mes`, traz o ano inteiro.
     */
    despesas: (idDeputado: number, idLegislatura: number, ano: number, mes?: number) =>
      paginar<Despesa>(`/deputados/${idDeputado}/despesas`, { idLegislatura, ano, mes }),

    /** Proposições do deputado, autor ou coautor, dos tipos pedidos, de toda a carreira (sem datas a API não limita). */
    proposicoesDoAutorPorTipo: (idDeputadoAutor: number, siglaTipo: string[]) =>
      paginar<ProposicaoResumo>("/proposicoes", { idDeputadoAutor, siglaTipo: siglaTipo.join(","), ordem: "DESC", ordenarPor: "id" }),

    /** Quem assina a proposição, na ordem de assinatura. */
    autores: (id: number) => get<Pagina<AutorProposicaoApi>>(montar(`/proposicoes/${id}/autores`)).then((p) => p.dados),

    /** Proposições em que o deputado consta como autor, apresentadas no intervalo. */
    proposicoesDoAutor: (idDeputadoAutor: number, dataApresentacaoInicio: string, dataApresentacaoFim: string) =>
      paginar<ProposicaoResumo>("/proposicoes", {
        idDeputadoAutor,
        dataApresentacaoInicio,
        dataApresentacaoFim,
        ordem: "ASC",
        ordenarPor: "id",
      }),
  };
}

export type CamaraClient = ReturnType<typeof createCamaraClient>;

/** Divide [desde, ate] (AAAA-MM-DD) em janelas mensais, respeitando o limite de 3 meses da API. */
export function janelasMensais(desde: string, ate: string) {
  const janelas: { inicio: string; fim: string }[] = [];
  let cursor = new Date(`${desde}T00:00:00Z`);
  const limite = new Date(`${ate}T00:00:00Z`);

  while (cursor <= limite) {
    const fimMes = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0));
    const fim = fimMes < limite ? fimMes : limite;
    janelas.push({ inicio: cursor.toISOString().slice(0, 10), fim: fim.toISOString().slice(0, 10) });
    cursor = new Date(fim.getTime() + 24 * 60 * 60 * 1000);
  }
  return janelas;
}
