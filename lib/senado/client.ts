import { createFetcher, type OpcoesFetcher } from "../sync/run";
import type {
  AgendaComissaoApi,
  AgendaPlenarioApi,
  DespesaCeaps,
  DespesaCeapsApi,
  DetalheSenadorApi,
  LegislaturaApi,
  ListaAtualApi,
  ListaLegislaturaSenadoresApi,
  ParlamentarListaApi,
  ProcessoApi,
  ProcessoAutoria,
  ReuniaoApi,
  ReuniaoComissao,
  Senador,
  SessaoAgendaApi,
  SessaoPlenario,
  UmOuVarios,
  VotacaoApi,
  VotacaoPlenario,
} from "./types";

export const BASE_URL = "https://legis.senado.leg.br/dadosabertos";
/** API administrativa (transparência): CEAPS em JSON com o código do senador, ao contrário do CSV. */
export const ADM_URL = "https://adm.senado.gov.br/adm-dadosabertos/api/v1";

/** A API devolve objeto único quando há 1 item e omite a chave quando não há nenhum. */
export function asArray<T>(valor: UmOuVarios<T> | null | undefined): T[] {
  if (valor === null || valor === undefined) return [];
  return Array.isArray(valor) ? valor : [valor];
}

/** Strings vazias ou só com espaços viram null; o resto é aparado. */
function texto(valor: string | null | undefined) {
  const limpo = valor?.replace(/\s+/g, " ").trim();
  return limpo ? limpo : null;
}

function numero(valor: string | number | null | undefined) {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

/** AAAA-MM-DD -> AAAAMMDD, formato dos serviços antigos (agendas). */
const compacta = (data: string) => data.replaceAll("-", "");

const paraIso = (d: Date) => d.toISOString().slice(0, 10);

function somaDias(data: string, dias: number) {
  const d = new Date(`${data}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return paraIso(d);
}

/** Quebra [desde, ate] em janelas de até `maxDias` dias (limites dos serviços de agenda/votação). */
export function janelas(desde: string, ate: string, maxDias: number) {
  const resultado: { desde: string; ate: string }[] = [];
  for (let ini = desde; ini <= ate; ini = somaDias(ini, maxDias)) {
    const fim = somaDias(ini, maxDias - 1);
    resultado.push({ desde: ini, ate: fim < ate ? fim : ate });
  }
  return resultado;
}

function normalizarSenador(p: ParlamentarListaApi): Senador {
  const id = p.IdentificacaoParlamentar;
  const mandatos = [...asArray(p.Mandato), ...asArray(p.Mandatos?.Mandato)];

  return {
    codigo: id.CodigoParlamentar,
    nome: id.NomeParlamentar.trim(),
    nomeCompleto: texto(id.NomeCompletoParlamentar),
    partido: texto(id.SiglaPartidoParlamentar),
    uf: texto(id.UfParlamentar) ?? texto(mandatos[0]?.UfParlamentar),
    // A API ainda publica http://; o servidor redireciona para https.
    fotoUrl: texto(id.UrlFotoParlamentar)?.replace(/^http:/, "https:") ?? null,
    email: texto(id.EmailParlamentar),
  };
}

function normalizarVotacao(v: VotacaoApi): VotacaoPlenario {
  const numeroMateria = numero(v.numero);
  const materia =
    v.idProcesso && v.sigla && numeroMateria !== null && v.ano
      ? {
          idProcesso: v.idProcesso,
          codigoMateria: v.codigoMateria,
          sigla: v.sigla,
          numero: numeroMateria,
          ano: v.ano,
          ementa: texto(v.ementa),
          dataApresentacao: v.dataApresentacao,
        }
      : null;

  return {
    codigo: String(v.codigoSessaoVotacao),
    codigoSessao: String(v.codigoSessao),
    siglaTipoSessao: v.siglaTipoSessao,
    data: v.dataSessao,
    descricao: texto(v.descricaoVotacao) ?? "(sem descrição)",
    identificacao: texto(v.identificacao),
    secreta: v.votacaoSecreta === "S",
    aprovada: v.resultadoVotacao === "A" ? true : v.resultadoVotacao === "R" ? false : null,
    totais: { sim: v.totalVotosSim, nao: v.totalVotosNao, abstencao: v.totalVotosAbstencao },
    materia,
    votos: asArray(v.votos).map((o) => ({
      codigoParlamentar: String(o.codigoParlamentar),
      nome: o.nomeParlamentar.trim(),
      partido: texto(o.siglaPartidoParlamentar),
      uf: texto(o.siglaUFParlamentar),
      sigla: o.siglaVotoParlamentar.trim(),
      descricao: texto(o.descricaoVotoParlamentar),
    })),
  };
}

function normalizarSessao(s: SessaoAgendaApi): SessaoPlenario {
  return {
    codigo: s.CodigoSessao,
    data: s.Data,
    hora: texto(s.Hora),
    numero: texto(s.NumeroSessao),
    tipo: texto(s.TipoSessao) ?? "SESSÃO",
    local: texto(s.LocalSessao),
    casa: s.Casa,
    situacao: texto(s.SituacaoSessao),
    realizada: s.Realizada?.Status === "Sim",
    descricao: texto(s.Evento?.DescricaoEvento),
  };
}

function normalizarReuniao(r: ReuniaoApi): ReuniaoComissao {
  return {
    codigo: r.codigo,
    titulo: texto(r.titulo) ?? texto(r.descricao) ?? "Reunião",
    dataInicio: r.dataInicio,
    realizada: r.realizada === "true",
    situacao: texto(r.situacao),
    status: texto(r.status),
    local: texto(r.local),
    colegiadoCodigo: r.colegiadoCriador?.codigo ?? null,
    colegiadoSigla: texto(r.colegiadoCriador?.sigla),
    colegiadoNome: texto(r.colegiadoCriador?.nome),
    colegiadoCasa: texto(r.colegiadoCriador?.siglaCasa),
    partes: asArray(r.partes).map((p) => ({
      tipo: texto(p.descricaoTipo),
      finalidade: texto(p.evento?.finalidade),
      itens: asArray(p.itens)
        .map((i) => texto(i.nome))
        .filter((nome): nome is string => nome !== null),
    })),
  };
}

/**
 * Cliente da API de Dados Abertos do Senado. Só usa serviços não depreciados no OpenAPI oficial
 * (https://legis.senado.leg.br/dadosabertos/v3/api-docs) e devolve tudo normalizado
 * (arrays de verdade, números como number, strings aparadas).
 */
export function createSenadoClient({ minIntervalMs = 250, ...opcoes }: OpcoesFetcher = {}) {
  const fetchJson = createFetcher({ minIntervalMs, ...opcoes });
  const get = <T>(caminho: string, params?: Record<string, string>) => {
    const url = new URL(`${BASE_URL}${caminho}`);
    for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v);
    return fetchJson<T>(url);
  };

  return {
    async senadoresEmExercicio(): Promise<Senador[]> {
      const r = await get<ListaAtualApi>("/senador/lista/atual");
      return asArray(r.ListaParlamentarEmExercicio.Parlamentares?.Parlamentar).map(normalizarSenador);
    },

    /** Só quem entrou em exercício (`exercicio=S`); sem o filtro vêm todos os suplentes. */
    async senadoresDaLegislatura(legislatura: number): Promise<Senador[]> {
      const r = await get<ListaLegislaturaSenadoresApi>(`/senador/lista/legislatura/${legislatura}`, {
        exercicio: "S",
      });
      return asArray(r.ListaParlamentarLegislatura.Parlamentares?.Parlamentar).map(normalizarSenador);
    },

    async senador(codigo: string): Promise<Senador | null> {
      const r = await get<DetalheSenadorApi>(`/senador/${codigo}`);
      const p = r.DetalheParlamentar.Parlamentar;
      return p ? normalizarSenador(p) : null;
    },

    /** Número da legislatura vigente na data (AAAA-MM-DD). */
    async legislatura(data: string): Promise<number | null> {
      const r = await get<LegislaturaApi>(`/plenario/legislatura/${compacta(data)}`);
      return numero(asArray(r.ListaLegislatura.Legislaturas?.Legislatura)[0]?.NumeroLegislatura);
    },

    /**
     * Votações do plenário com voto nominal de cada senador (em secretas, só "Votou").
     * `/votacao` aceita no máximo 1 ano por consulta; substitui o depreciado `plenario/lista/votacao`.
     */
    async votacoes(desde: string, ate: string): Promise<VotacaoPlenario[]> {
      const todas: VotacaoPlenario[] = [];
      for (const j of janelas(desde, ate, 365)) {
        const r = await get<VotacaoApi[]>("/votacao", { dataInicio: j.desde, dataFim: j.ate });
        todas.push(...asArray(r).map(normalizarVotacao));
      }
      return todas;
    },

    /** Sessões do plenário (SF e CN). O serviço devolve da data informada até o fim do mês. */
    async sessoesPlenario(desde: string, ate: string): Promise<SessaoPlenario[]> {
      const sessoes: SessaoPlenario[] = [];
      for (let ini = desde; ini <= ate; ini = `${somaDias(`${ini.slice(0, 7)}-28`, 4).slice(0, 7)}-01`) {
        const r = await get<AgendaPlenarioApi>(`/plenario/agenda/mes/${compacta(ini)}`);
        sessoes.push(...asArray(r.AgendaPlenario.Sessoes?.Sessao).map(normalizarSessao));
      }
      return sessoes.filter((s) => s.data >= desde && s.data <= ate);
    },

    /** Reuniões de comissões; o serviço aceita no máximo 30 dias por consulta. */
    async reunioesComissoes(desde: string, ate: string): Promise<ReuniaoComissao[]> {
      const reunioes = new Map<string, ReuniaoComissao>();
      for (const j of janelas(desde, ate, 30)) {
        const r = await get<AgendaComissaoApi>(
          `/comissao/agenda/${compacta(j.desde)}/${compacta(j.ate)}`,
        );
        for (const reuniao of asArray(r.AgendaReuniao.reunioes?.reuniao)) {
          reunioes.set(reuniao.codigo, normalizarReuniao(reuniao));
        }
      }
      return [...reunioes.values()];
    },

    /**
     * Processos de autoria (ou coautoria) do senador apresentados no intervalo.
     * Substitui o depreciado `senador/{codigo}/autorias`.
     */
    async processosDoAutor(codigo: string, desde: string, ate: string): Promise<ProcessoAutoria[]> {
      const r = await get<ProcessoApi[]>("/processo", {
        codigoParlamentarAutor: codigo,
        dataInicioApresentacao: desde,
        dataFimApresentacao: ate,
      });
      return asArray(r);
    },

    /** Todas as despesas CEAPS do ano (~10 MB de JSON). */
    async despesasCeaps(ano: number): Promise<DespesaCeaps[]> {
      return asArray(await fetchJson<DespesaCeapsApi[]>(`${ADM_URL}/senadores/despesas_ceaps/${ano}`));
    },
  };
}

export type SenadoClient = ReturnType<typeof createSenadoClient>;
