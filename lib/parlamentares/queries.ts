import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import { createCamaraClient } from "@/lib/camara/client";
import { asArray, createSenadoClient } from "@/lib/senado/client";
import { mapearComparecimento } from "@/lib/senado/mapear";
import type { VotacaoApi } from "@/lib/senado/types";
import { fontesQueFalharam, tentar } from "@/lib/erros";
import { mudancasCamara, periodosCamara, periodosSenado } from "@/lib/parlamentares/historico";
import {
  leiDaCamara,
  leisDeAutoriaSenado,
  leisRelatadasSenado,
  maisRecentes,
  papelNaCamara,
  virouLeiNaCamara,
} from "@/lib/parlamentares/leis";
import { centavos, reais, somar } from "@/lib/format/dinheiro";
import { createFetcher, NA_PAGINA, naoEncontrado, normalizarNome } from "@/lib/sync/run";
import { getEmendas } from "@/lib/transparencia/queries";
import { anoCorrente, inicioDaLegislaturaDoAno } from "@/lib/anos";

const camara = createCamaraClient(NA_PAGINA);
// O JSON anual da CEAPS tem ~10 MB: precisa de mais tempo que o padrão das páginas.
const senado = createSenadoClient({ ...NA_PAGINA, timeoutMs: 45_000 });
const fetchJson = createFetcher(NA_PAGINA);

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Primeiro e último dia do ano em "AAAA-MM-DD"; no ano corrente o fim é hoje. */
function limitesDoAno(ano: number) {
  const hoje = iso(new Date());
  const fim = `${ano}-12-31`;
  return { inicio: `${ano}-01-01`, fim: fim < hoje ? fim : hoje };
}

/** Dentro de "use cache": o cache dos anos fechados dura mais, os dados deles quase não mudam. */
function vidaDoCache(ano: number) {
  if (ano < anoCorrente()) cacheLife("days");
  else cacheLife("hours");
}

/**
 * Falha guardada como dado, não como erro. Dentro de "use cache", um erro lançado derruba o prerender do
 * build (o deploy inteiro cai se a Câmara demorar naquela hora), mesmo que quem chamou use `tentar`. Por isso a
 * função em cache devolve a falha com vida de segundos (não fica guardada; no build, a seção vira dinâmica) e
 * quem chama transforma de volta em erro, fora do cache.
 */
type FalhaEmCache = { falha: string };

function mensagemDe(erro: unknown) {
  return erro instanceof Error ? erro.message : String(erro);
}

function lancarSeFalhou<T>(r: T | FalhaEmCache): T {
  if (r && typeof r === "object" && "falha" in r) throw new Error(r.falha);
  return r as T;
}

// Cada casa tem o seu cache: se uma API cair, a outra continua servindo, e a falha não fica guardada.
async function deputadosEmExercicio() {
  "use cache";
  cacheTag("parlamentares");

  try {
    const lista = (await camara.deputadosEmExercicio()).map((d) => ({
      casa: "camara" as const,
      id: String(d.id),
      nome: d.nome,
      partido: d.siglaPartido,
      uf: d.siglaUf,
      fotoUrl: d.urlFoto,
    }));
    cacheLife("days");
    return lista;
  } catch (erro) {
    unstable_rethrow(erro);
    cacheLife("seconds");
    return { falha: mensagemDe(erro) } satisfies FalhaEmCache;
  }
}

async function senadoresEmExercicio() {
  "use cache";
  cacheTag("parlamentares");

  try {
    const lista = (await senado.senadoresEmExercicio()).map((s) => ({
      casa: "senado" as const,
      id: s.codigo,
      nome: s.nome,
      partido: s.partido,
      uf: s.uf,
      fotoUrl: s.fotoUrl,
    }));
    cacheLife("days");
    return lista;
  } catch (erro) {
    unstable_rethrow(erro);
    cacheLife("seconds");
    return { falha: mensagemDe(erro) } satisfies FalhaEmCache;
  }
}

/**
 * Deputados e senadores em exercício, no mesmo formato, ordenados por nome. Se uma das casas não
 * responder, a lista vem só com a outra e `indisponiveis` diz qual faltou (ver lib/erros).
 */
export async function listarParlamentares() {
  const [deputados, senadores] = await Promise.all([
    tentar("a Câmara dos Deputados", async () => lancarSeFalhou(await deputadosEmExercicio())),
    tentar("o Senado", async () => lancarSeFalhou(await senadoresEmExercicio())),
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

/**
 * Gastos da cota parlamentar (CEAP) no ano, mais recentes primeiro. A API pede a legislatura do ano
 * consultado (não a atual), então ela sai do próprio ano.
 */
export async function getDespesasDeputado(id: number, ano: number = anoCorrente()) {
  "use cache";
  vidaDoCache(ano);
  cacheTag("parlamentares", `deputado:${id}`);

  const idLegislatura = (inicioDaLegislaturaDoAno(ano) - 1795) / 4;
  const despesas = await camara.despesas(id, idLegislatura, ano);
  return {
    ano,
    despesas: despesas.sort((a, b) => (b.dataDocumento ?? "").localeCompare(a.dataDocumento ?? "")),
  };
}

/** Proposições apresentadas pelo deputado no ano (no corrente, até hoje), mais recentes primeiro. */
export async function getProposicoesDeputado(id: number, ano: number = anoCorrente()) {
  "use cache";
  vidaDoCache(ano);
  cacheTag("parlamentares", `deputado:${id}`);

  // A API aceita no máximo 3 meses por consulta: uma janela por trimestre, até hoje.
  const { fim } = limitesDoAno(ano);
  const janelas = [
    [`${ano}-01-01`, `${ano}-03-31`],
    [`${ano}-04-01`, `${ano}-06-30`],
    [`${ano}-07-01`, `${ano}-09-30`],
    [`${ano}-10-01`, `${ano}-12-31`],
  ]
    .filter(([desde]) => desde <= fim)
    .map(([desde, ate]) => ({ desde, ate: ate < fim ? ate : fim }));
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

/** Processos de autoria do senador apresentados no ano (no corrente, até hoje), mais recentes primeiro. */
export async function getProcessosSenador(codigo: string, ano: number = anoCorrente()) {
  "use cache";
  vidaDoCache(ano);
  cacheTag("parlamentares", `senador:${codigo}`);

  const { inicio, fim } = limitesDoAno(ano);
  const processos = await senado.processosDoAutor(codigo, inicio, fim);
  return processos.sort((a, b) => (b.dataApresentacao ?? "").localeCompare(a.dataApresentacao ?? ""));
}

/** Roda `fn` em todos os itens com no máximo `limite` chamadas ao mesmo tempo, na ordem original. */
async function emLotes<T, R>(itens: T[], limite: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const resultados = new Array<R>(itens.length);
  let proximo = 0;
  async function trabalhador() {
    while (proximo < itens.length) {
      const i = proximo++;
      resultados[i] = await fn(itens[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, trabalhador));
  return resultados;
}

/** Leis de autoria, coautoria e relatoria do senador, de toda a carreira: três chamadas ao Senado. */
export async function getLeisSenador(codigo: string, nome: string) {
  "use cache";
  cacheLife("days");
  cacheTag("parlamentares", `senador:${codigo}`);

  const [processos, relatadas, relatadasComVeto] = await Promise.all([
    senado.processosComoAutor(codigo),
    senado.relatorias(codigo, "TNJR"),
    senado.relatorias(codigo, "TNJRVETO"),
  ]);
  const autoria = leisDeAutoriaSenado(processos, nome);
  const relatoria = leisRelatadasSenado(
    [...relatadas.map((relatoria) => ({ relatoria, comVeto: false })), ...relatadasComVeto.map((relatoria) => ({ relatoria, comVeto: true }))],
    new Set(autoria.map((l) => l.identificacao)),
  );
  return { leis: [...autoria, ...relatoria].sort(maisRecentes), naoVerificados: 0 };
}

/** PL, PLP e PEC: o que o deputado pode propor e vira lei ou emenda à Constituição. */
const TIPOS_LEI_DEPUTADO = ["PL", "PLP", "PEC"];
/** Detalhes pedidos à Câmara ao mesmo tempo: quem tem centenas de projetos não dispara centenas de chamadas. */
const DETALHES_SIMULTANEOS = 6;

/**
 * Lei gerada por um projeto da Câmara, buscada no Senado (casa revisora). Só PL e PLP desde 2019, quando
 * as duas casas passaram a usar o mesmo número; antes, e nas PECs, o número no Senado é outro.
 */
async function normaNoSenado(p: { siglaTipo: string; numero: number; ano: number }) {
  if (p.siglaTipo === "PEC" || p.ano < 2019) return null;
  const processos = await senado.processoPorNumero(p.siglaTipo, p.numero, p.ano).catch(() => []);
  return processos.find((s) => s.normaGerada)?.normaGerada ?? null;
}

/**
 * Leis de autoria ou coautoria do deputado, de toda a carreira. A API da Câmara não filtra pela situação
 * (o parâmetro é ignorado), então cada projeto é conferido no detalhe. Projeto que não respondeu entra em
 * `naoVerificados`, e o resultado fica pouco tempo no cache para a próxima visita completar.
 */
export async function getLeisDeputado(id: number) {
  "use cache";
  cacheTag("parlamentares", `deputado:${id}`);

  const proposicoes = await camara.proposicoesDoAutorPorTipo(id, TIPOS_LEI_DEPUTADO);
  let naoVerificados = 0;
  const situacoes = await emLotes(proposicoes, DETALHES_SIMULTANEOS, (p) =>
    camara.proposicao(p.id).then(
      (d) => d.statusProposicao?.descricaoSituacao ?? null,
      () => {
        naoVerificados++;
        return null;
      },
    ),
  );
  if (proposicoes.length > 0 && naoVerificados === proposicoes.length) {
    throw new Error(`A Câmara não respondeu a nenhum dos ${proposicoes.length} projetos do deputado ${id}.`);
  }
  if (naoVerificados > 0) cacheLife("minutes");
  else cacheLife("days");

  const viraramLei = proposicoes.flatMap((p, i) => (virouLeiNaCamara(situacoes[i]) ? [{ p, comVeto: /veto parcial/i.test(situacoes[i] ?? "") }] : []));
  const leis = await Promise.all(
    viraramLei.map(async ({ p, comVeto }) => {
      const [autores, norma] = await Promise.all([camara.autores(p.id).catch(() => []), normaNoSenado(p)]);
      return leiDaCamara(p, papelNaCamara(autores, id), norma, comVeto);
    }),
  );
  return { leis: leis.sort(maisRecentes), naoVerificados };
}

/** Emendas do ano em nome do parlamentar; a API só casa o nome exato, sem acento e em maiúsculas. */
export async function getEmendasDoAutor(nome: string, ano: number = anoCorrente()) {
  "use cache";
  cacheLife("days");
  cacheTag("transparencia", "emendas");

  const emendas: Awaited<ReturnType<typeof getEmendas>> = [];
  for (let pagina = 1; pagina <= 10; pagina++) {
    const lote = await getEmendas({ ano, nomeAutor: normalizarNome(nome) }, pagina);
    emendas.push(...lote);
    if (lote.length < 15) break;
  }
  return { ano, emendas };
}

/**
 * CEAPS do ano resumida por senador. O JSON anual tem ~10 MB, então o cache guarda
 * só o resumo (valores em centavos) e cada página de senador lê a sua parte.
 */
async function getResumoCeaps(ano: number) {
  "use cache";
  vidaDoCache(ano);
  cacheTag("parlamentares", "ceaps");

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

export async function getDespesasSenador(codigo: string, ano: number = anoCorrente()) {
  const { senadores } = await getResumoCeaps(ano);
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
 * Presença do deputado nas sessões deliberativas do plenário no ano (no corrente, até hoje), a partir
 * da data em que entrou no mandato atual. A API da Câmara não informa ausências justificadas.
 */
export async function getPresencaDeputado(id: number, inicioMandato: string | null, ano: number = anoCorrente()) {
  "use cache";
  vidaDoCache(ano);
  cacheTag("parlamentares", `deputado:${id}`);

  const { inicio: inicioAno, fim: hoje } = limitesDoAno(ano);
  const desde = inicioMandato && inicioMandato > inicioAno ? inicioMandato.slice(0, 10) : inicioAno;
  const base = "https://dadosabertos.camara.leg.br/api/v2";
  if (desde > hoje) return { desde, consultadoEm: new Date().toISOString(), sessoes: 0, presencas: 0 };

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
async function votacoesDoSenadorNoAno(codigo: string, ano: number) {
  "use cache";
  vidaDoCache(ano);
  cacheTag("parlamentares", `senador:${codigo}`);

  const { inicio, fim } = limitesDoAno(ano);
  const url = new URL("https://legis.senado.leg.br/dadosabertos/votacao");
  url.search = new URLSearchParams({ codigoParlamentar: codigo, dataInicio: inicio, dataFim: fim }).toString();

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
export async function getVotosSenador(codigo: string, ano: number = anoCorrente()) {
  const { votos, consultadoEm } = await votacoesDoSenadorNoAno(codigo, ano);
  return {
    consultadoEm,
    votos: votos.map(({ sigla, ...v }) => ({ ...v, tipo: mapearComparecimento(sigla).tipo })),
  };
}

/**
 * Comparecimento do senador nas votações nominais do ano.
 * Usa a mesma classificação do sync (`mapearComparecimento`).
 */
export async function getVotacoesSenador(codigo: string, ano: number = anoCorrente()) {
  const { consultadoEm, total, votos } = await votacoesDoSenadorNoAno(codigo, ano);
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
