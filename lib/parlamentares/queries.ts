import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { createCamaraClient } from "@/lib/camara/client";
import { asArray, createSenadoClient } from "@/lib/senado/client";
import { mapearComparecimento } from "@/lib/senado/mapear";
import type { VotacaoApi } from "@/lib/senado/types";
import { fontesQueFalharam, tentar } from "@/lib/erros";
import { mudancasCamara, periodosCamara, periodosSenado } from "@/lib/parlamentares/historico";
import { centavos, reais, somar } from "@/lib/format/dinheiro";
import { createFetcher, NA_PAGINA, naoEncontrado, normalizarNome } from "@/lib/sync/run";
import { getEmendas } from "@/lib/transparencia/queries";

const camara = createCamaraClient(NA_PAGINA);
// O JSON anual da CEAPS tem ~10 MB: precisa de mais tempo que o padrão das páginas.
const senado = createSenadoClient({ ...NA_PAGINA, timeoutMs: 45_000 });
const fetchJson = createFetcher({ minIntervalMs: 150, ...NA_PAGINA });

const iso = (d: Date) => d.toISOString().slice(0, 10);

// Cada casa tem o seu cache: se uma API cair, a outra continua servindo, e a falha não fica guardada.
async function deputadosEmExercicio() {
  "use cache";
  cacheLife("days");
  cacheTag("parlamentares");

  return (await camara.deputadosEmExercicio()).map((d) => ({
    casa: "camara" as const,
    id: String(d.id),
    nome: d.nome,
    partido: d.siglaPartido,
    uf: d.siglaUf,
    fotoUrl: d.urlFoto,
  }));
}

async function senadoresEmExercicio() {
  "use cache";
  cacheLife("days");
  cacheTag("parlamentares");

  return (await senado.senadoresEmExercicio()).map((s) => ({
    casa: "senado" as const,
    id: s.codigo,
    nome: s.nome,
    partido: s.partido,
    uf: s.uf,
    fotoUrl: s.fotoUrl,
  }));
}

/**
 * Deputados e senadores em exercício, no mesmo formato, ordenados por nome. Se uma das casas não
 * responder, a lista vem só com a outra e `indisponiveis` diz qual faltou (ver lib/erros).
 */
export async function listarParlamentares() {
  const [deputados, senadores] = await Promise.all([
    tentar("a Câmara dos Deputados", deputadosEmExercicio),
    tentar("o Senado", senadoresEmExercicio),
  ]);

  return {
    lista: [...(deputados.ok ? deputados.dados : []), ...(senadores.ok ? senadores.dados : [])].sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR"),
    ),
    indisponiveis: fontesQueFalharam(deputados, senadores),
  };
}

export type ParlamentarResumo = Awaited<ReturnType<typeof listarParlamentares>>["lista"][number];

interface DeputadoDetalhe {
  id: number;
  nomeCivil: string;
  /** Só para casar registros de outras fontes (TCU, TSE); nunca exibir. */
  cpf: string | null;
  dataNascimento: string | null;
  municipioNascimento: string | null;
  ufNascimento: string | null;
  escolaridade: string | null;
  redeSocial: string[];
  ultimoStatus: {
    nome: string;
    nomeEleitoral: string;
    siglaPartido: string | null;
    siglaUf: string | null;
    idLegislatura: number;
    /** Data do último status (posse, troca de partido...), AAAA-MM-DD. */
    data: string | null;
    urlFoto: string | null;
    email: string | null;
    situacao: string | null;
    condicaoEleitoral: string | null;
    gabinete: { sala: string | null; predio: string | null; telefone: string | null } | null;
  };
}

/**
 * Cadastro do deputado, ou `null` se o id não existir. Só o 404 vira `null`: com a Câmara fora do ar o
 * erro sobe (e não entra no cache), para a página mostrar "fonte indisponível" em vez de "não existe".
 */
export async function getDeputado(id: string) {
  "use cache";
  cacheLife("days");
  cacheTag("parlamentares", `deputado:${id}`);

  try {
    const { dados } = await fetchJson<{ dados: DeputadoDetalhe }>(
      `https://dadosabertos.camara.leg.br/api/v2/deputados/${encodeURIComponent(id)}`,
    );
    return dados;
  } catch (error) {
    if (naoEncontrado(error)) return null;
    throw error;
  }
}

/** Gastos da cota parlamentar (CEAP) no ano corrente, mais recentes primeiro. */
export async function getDespesasDeputado(id: number, idLegislatura: number) {
  "use cache";
  cacheLife("hours");
  cacheTag("parlamentares", `deputado:${id}`);

  const ano = new Date().getFullYear();
  const despesas = await camara.despesas(id, idLegislatura, ano);
  return {
    ano,
    despesas: despesas.sort((a, b) => (b.dataDocumento ?? "").localeCompare(a.dataDocumento ?? "")),
  };
}

/** Proposições apresentadas pelo deputado nos últimos 12 meses, mais recentes primeiro. */
export async function getProposicoesDeputado(id: number) {
  "use cache";
  cacheLife("hours");
  cacheTag("parlamentares", `deputado:${id}`);

  // A API aceita no máximo 3 meses por consulta: 4 janelas de ~91 dias cobrem o ano.
  const hoje = Date.now();
  const janelas = [3, 2, 1, 0].map((i) => ({
    desde: iso(new Date(hoje - (i + 1) * 91 * 86_400_000 + 86_400_000)),
    ate: iso(new Date(hoje - i * 91 * 86_400_000)),
  }));
  const proposicoes = (
    await Promise.all(janelas.map((j) => camara.proposicoesDoAutor(id, j.desde, j.ate)))
  ).flat();
  return proposicoes.sort((a, b) => (b.dataApresentacao ?? "").localeCompare(a.dataApresentacao ?? ""));
}

/** Partidos por onde o deputado passou e as mudanças de situação (licenças, afastamentos), da API da Câmara. */
export async function getHistoricoDeputado(id: number) {
  "use cache";
  cacheLife("days");
  cacheTag("parlamentares", `deputado:${id}`);

  const historico = await camara.historico(id);
  return { partidos: periodosCamara(historico), mudancas: mudancasCamara(historico) };
}

/** Filiações partidárias do senador, da API do Senado (não informa licenças). */
export async function getHistoricoSenador(codigo: string) {
  "use cache";
  cacheLife("days");
  cacheTag("parlamentares", `senador:${codigo}`);

  return { partidos: periodosSenado(await senado.filiacoes(codigo)), mudancas: [] };
}

/** Cadastro do senador, ou `null` se o código não existir (a API responde 200 sem o parlamentar). */
export async function getSenador(codigo: string) {
  "use cache";
  cacheLife("days");
  cacheTag("parlamentares", `senador:${codigo}`);

  return senado.senador(codigo);
}

/** Processos de autoria do senador nos últimos 12 meses, mais recentes primeiro. */
export async function getProcessosSenador(codigo: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("parlamentares", `senador:${codigo}`);

  const ate = new Date();
  const desde = new Date(ate.getTime() - 365 * 86_400_000);
  const processos = await senado.processosDoAutor(codigo, iso(desde), iso(ate));
  return processos.sort((a, b) => (b.dataApresentacao ?? "").localeCompare(a.dataApresentacao ?? ""));
}

/** Emendas do ano corrente em nome do parlamentar; a API só casa o nome exato, sem acento e em maiúsculas. */
export async function getEmendasDoAutor(nome: string) {
  "use cache";
  cacheLife("days");
  cacheTag("transparencia", "emendas");

  const ano = new Date().getFullYear();
  const emendas: Awaited<ReturnType<typeof getEmendas>> = [];
  for (let pagina = 1; pagina <= 10; pagina++) {
    const lote = await getEmendas({ ano, nomeAutor: normalizarNome(nome) }, pagina);
    emendas.push(...lote);
    if (lote.length < 15) break;
  }
  return { ano, emendas };
}

/**
 * CEAPS do ano corrente resumida por senador. O JSON anual tem ~10 MB, então o cache guarda
 * só o resumo (valores em centavos) e cada página de senador lê a sua parte.
 */
async function getResumoCeaps() {
  "use cache";
  cacheLife("hours");
  cacheTag("parlamentares", "ceaps");

  const ano = new Date().getFullYear();
  const porSenador = Object.groupBy(await senado.despesasCeaps(ano), (d) => String(d.codSenador));

  const resumo = Object.entries(porSenador).map(([codigo, despesas = []]) => {
    const porTipo = Object.entries(Object.groupBy(despesas, (d) => d.tipoDespesa ?? "Não informado"));
    return [
      codigo,
      {
        quantidade: despesas.length,
        total: centavos(somar(despesas.map((d) => reais(d.valorReembolsado)))),
        porTipo: porTipo
          .map(([tipo, itens = []]) => ({ tipo, total: centavos(somar(itens.map((d) => reais(d.valorReembolsado)))) }))
          .sort((a, b) => b.total - a.total),
        ultimas: despesas.sort((a, b) => (b.data ?? "").localeCompare(a.data ?? "")).slice(0, 8),
      },
    ] as const;
  });

  return { ano, senadores: Object.fromEntries(resumo) };
}

export async function getDespesasSenador(codigo: string) {
  const { ano, senadores } = await getResumoCeaps();
  return { ano, resumo: senadores[codigo] ?? null };
}

interface EventoCamara {
  id: number;
  dataHoraInicio: string;
  situacao: string | null;
  descricaoTipo: string;
  orgaos: { sigla: string }[];
}

/** Segue `links` rel="next" de uma listagem da Câmara. */
async function paginarCamara<T>(url: string) {
  const itens: T[] = [];
  let proxima: string | undefined = url;
  while (proxima) {
    const pagina: { dados: T[]; links: { rel: string; href: string }[] } = await fetchJson(proxima);
    itens.push(...pagina.dados);
    proxima = pagina.links.find((l) => l.rel === "next")?.href;
  }
  return itens;
}

const deliberativaDoPlenario = (e: EventoCamara) =>
  e.descricaoTipo === "Sessão Deliberativa" &&
  e.situacao === "Encerrada" &&
  e.orgaos.some((o) => o.sigla === "PLEN");

/**
 * Presença do deputado nas sessões deliberativas do plenário no ano corrente, a partir da
 * data em que entrou no mandato atual. A API da Câmara não informa ausências justificadas.
 */
export async function getPresencaDeputado(id: number, inicioMandato: string | null) {
  "use cache";
  cacheLife("hours");
  cacheTag("parlamentares", `deputado:${id}`);

  const hoje = iso(new Date());
  const inicioAno = `${hoje.slice(0, 4)}-01-01`;
  const desde = inicioMandato && inicioMandato > inicioAno ? inicioMandato.slice(0, 10) : inicioAno;
  const base = "https://dadosabertos.camara.leg.br/api/v2";

  const [sessoes, doDeputado] = await Promise.all([
    paginarCamara<EventoCamara>(`${base}/eventos?idOrgao=180&dataInicio=${desde}&dataFim=${hoje}&itens=100`),
    paginarCamara<EventoCamara>(`${base}/deputados/${id}/eventos?dataInicio=${desde}&dataFim=${hoje}&itens=100`),
  ]);

  const total = sessoes.filter(deliberativaDoPlenario);
  const presentes = new Set(doDeputado.filter(deliberativaDoPlenario).map((e) => e.id));
  return {
    desde,
    consultadoEm: new Date().toISOString(),
    sessoes: total.length,
    presencas: total.filter((e) => presentes.has(e.id)).length,
  };
}

/** Votações nominais do plenário do Senado no ano corrente, só com o registro do senador, mais recentes primeiro. */
async function votacoesDoSenadorNoAno(codigo: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("parlamentares", `senador:${codigo}`);

  const hoje = iso(new Date());
  const url = new URL("https://legis.senado.leg.br/dadosabertos/votacao");
  url.search = new URLSearchParams({
    codigoParlamentar: codigo,
    dataInicio: `${hoje.slice(0, 4)}-01-01`,
    dataFim: hoje,
  }).toString();

  const votacoes = asArray(await fetchJson<VotacaoApi[]>(url));
  return {
    consultadoEm: new Date().toISOString(),
    total: votacoes.length,
    votos: votacoes
      .flatMap((v) => {
        const voto = asArray(v.votos).find((o) => String(o.codigoParlamentar) === codigo);
        if (!voto) return [];
        return [
          {
            votacaoId: String(v.codigoSessaoVotacao),
            data: v.dataSessao,
            descricao: v.descricaoVotacao,
            resultado: v.resultadoVotacao === "A" ? "Aprovada" : v.resultadoVotacao === "R" ? "Rejeitada" : null,
            proposicao: v.identificacao
              ? {
                  rotulo: v.identificacao,
                  ementa: v.ementa,
                  url: v.codigoMateria
                    ? `https://www25.senado.leg.br/web/atividade/materias/-/materia/${v.codigoMateria}`
                    : null,
                }
              : null,
            sigla: voto.siglaVotoParlamentar,
            votoOriginal: voto.descricaoVotoParlamentar
              ? `${voto.siglaVotoParlamentar} - ${voto.descricaoVotoParlamentar}`
              : voto.siglaVotoParlamentar,
          },
        ];
      })
      .sort((a, b) => b.data.localeCompare(a.data)),
  };
}

/** Votos do senador no ano no formato do histórico do perfil (ver `VotoNoPerfil`). */
export async function getVotosSenador(codigo: string) {
  const { votos, consultadoEm } = await votacoesDoSenadorNoAno(codigo);
  return {
    consultadoEm,
    votos: votos.map(({ sigla, ...v }) => ({ ...v, tipo: mapearComparecimento(sigla).tipo })),
  };
}

/**
 * Comparecimento do senador nas votações nominais do ano.
 * Usa a mesma classificação do sync (`mapearComparecimento`).
 */
export async function getVotacoesSenador(codigo: string) {
  const { consultadoEm, total, votos } = await votacoesDoSenadorNoAno(codigo);
  const contagem: Record<string, number> = {};
  const presenca = { PRESENTE: 0, AUSENCIA_JUSTIFICADA: 0, AUSENTE: 0, naoConta: 0 };

  for (const v of votos) {
    const { tipo, presenca: situacao } = mapearComparecimento(v.sigla);
    contagem[tipo] = (contagem[tipo] ?? 0) + 1;
    if (situacao) presenca[situacao]++;
    else presenca.naoConta++;
  }

  return { consultadoEm, votacoes: total, votos: contagem, presenca };
}
