import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { createCamaraClient } from "@/lib/camara/client";
import { asArray, createSenadoClient } from "@/lib/senado/client";
import { mapearComparecimento } from "@/lib/senado/mapear";
import type { VotacaoApi } from "@/lib/senado/types";
import { centavos, reais, somar } from "@/lib/format/dinheiro";
import { createFetcher, normalizarNome } from "@/lib/sync/run";
import { getEmendas } from "@/lib/transparencia/queries";

const camara = createCamaraClient();
const senado = createSenadoClient();
const fetchJson = createFetcher({ minIntervalMs: 150 });

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Deputados e senadores em exercício, no mesmo formato, ordenados por nome. */
export async function listarParlamentares() {
  "use cache";
  cacheLife("days");
  cacheTag("parlamentares");

  const [deputados, senadores] = await Promise.all([
    camara.deputadosEmExercicio(),
    senado.senadoresEmExercicio(),
  ]);

  return [
    ...deputados.map((d) => ({
      casa: "camara" as const,
      id: String(d.id),
      nome: d.nome,
      partido: d.siglaPartido,
      uf: d.siglaUf,
      fotoUrl: d.urlFoto,
    })),
    ...senadores.map((s) => ({
      casa: "senado" as const,
      id: s.codigo,
      nome: s.nome,
      partido: s.partido,
      uf: s.uf,
      fotoUrl: s.fotoUrl,
    })),
  ].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export type ParlamentarResumo = Awaited<ReturnType<typeof listarParlamentares>>[number];

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

/** Cadastro do deputado, ou `null` se o id não existir. */
export async function getDeputado(id: string) {
  "use cache";
  cacheLife("days");
  cacheTag("parlamentares", `deputado:${id}`);

  try {
    const { dados } = await fetchJson<{ dados: DeputadoDetalhe }>(
      `https://dadosabertos.camara.leg.br/api/v2/deputados/${encodeURIComponent(id)}`,
    );
    return dados;
  } catch {
    return null;
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

export async function getSenador(codigo: string) {
  "use cache";
  cacheLife("days");
  cacheTag("parlamentares", `senador:${codigo}`);

  try {
    return await senado.senador(codigo);
  } catch {
    return null;
  }
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

/**
 * Votações nominais do plenário do Senado no ano corrente, só com o registro do senador.
 * O comparecimento usa a mesma classificação do sync (`mapearComparecimento`).
 */
export async function getVotacoesSenador(codigo: string) {
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
  const contagem: Record<string, number> = {};
  const presenca = { PRESENTE: 0, AUSENCIA_JUSTIFICADA: 0, AUSENTE: 0, naoConta: 0 };

  for (const v of votacoes) {
    const voto = asArray(v.votos).find((o) => String(o.codigoParlamentar) === codigo);
    if (!voto) continue;
    const { tipo, presenca: situacao } = mapearComparecimento(voto.siglaVotoParlamentar);
    contagem[tipo] = (contagem[tipo] ?? 0) + 1;
    if (situacao) presenca[situacao]++;
    else presenca.naoConta++;
  }

  return { consultadoEm: new Date().toISOString(), votacoes: votacoes.length, votos: contagem, presenca };
}
