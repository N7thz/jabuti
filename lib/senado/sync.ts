import { tipoDaOrientacao } from "../fidelidade";
import type { Prisma } from "../generated/prisma/client";
import type { PrismaClient } from "../prisma";
import { emLotes, gravarEmLote } from "../sync/lote";
import type { SenadoClient } from "./client";
import {
  ehProponente,
  idEventoPlenario,
  mapearDespesa,
  mapearMateriaVotada,
  mapearProcesso,
  mapearReuniao,
  mapearSenador,
  mapearSenadorDoVoto,
  mapearSessao,
  mapearSessaoDaVotacao,
  mapearVotacao,
  mapearVoto,
  presencasPorSessao,
  reuniaoConta,
  sessaoConta,
  type PresencaMapeada,
} from "./mapear";
import type { OrientacaoBancadaApi, ReuniaoComissao, Senador, SessaoPlenario, VotacaoPlenario } from "./types";

// Cada etapa tem `buscar*` (API + mapeamento, sem banco; é o que o --dry-run usa) e `gravar*`
// (idempotente: upsert por casa+idExterno, filhos apagados e recriados por pai).

type ParlamentarInput = Prisma.ParlamentarCreateManyInput;
type ProposicaoInput = Prisma.ProposicaoCreateManyInput;

/**
 * Apaga e recria uma CEAPS anual inteira (milhares de linhas, lotes de 1000) numa transação só, para
 * a tabela nunca ficar com o ano pela metade. Do runner nos EUA isso passa dos 5 s padrão do Prisma.
 */
const TIMEOUT_DESPESAS_MS = 120_000;

/** Tira a chave (casa + idExterno) dos dados do update. */
function semChave<T extends { casa?: unknown; idExterno?: unknown }>({ casa: _casa, idExterno: _id, ...resto }: T) {
  return resto;
}

/** Mapa idExterno -> id a partir de uma busca por idExterno. */
async function mapaIds(buscar: (ids: string[]) => Promise<{ id: string; idExterno: string }[]>, idsExternos: string[]) {
  const mapa = new Map<string, string>();
  for (const lote of emLotes([...new Set(idsExternos)], 5000)) {
    for (const linha of await buscar(lote)) mapa.set(linha.idExterno, linha.id);
  }
  return mapa;
}

/** No update, campo null não apaga o que outra fonte já preencheu (ex.: situação da proposição). */
function semNulos<T extends object>(dados: T) {
  return Object.fromEntries(Object.entries(dados).filter(([, v]) => v !== null && v !== undefined)) as Partial<T>;
}

async function mapaParlamentares(prisma: PrismaClient) {
  const linhas = await prisma.parlamentar.findMany({
    where: { casa: "SENADO" },
    select: { id: true, idExterno: true },
  });
  return new Map(linhas.map((p) => [p.idExterno, p.id]));
}

/** Cria (sem sobrescrever) os senadores que só aparecem em votos/despesas e devolve o mapa código -> id. */
async function garantirParlamentares(prisma: PrismaClient, minimos: ParlamentarInput[]) {
  let mapa = await mapaParlamentares(prisma);
  const faltantes = minimos.filter((p) => !mapa.has(p.idExterno));
  if (faltantes.length > 0) {
    await prisma.parlamentar.createMany({ data: faltantes, skipDuplicates: true });
    mapa = await mapaParlamentares(prisma);
  }
  return mapa;
}

async function upsertProposicoes(prisma: PrismaClient, proposicoes: ProposicaoInput[]) {
  await gravarEmLote({
    dados: proposicoes,
    chave: (p) => p.idExterno,
    buscar: (ids) => prisma.proposicao.findMany({ where: { casa: "SENADO", idExterno: { in: ids } } }),
    chaveDaLinha: (l) => l.idExterno,
    criar: (novas) => prisma.proposicao.createMany({ data: novas, skipDuplicates: true }),
    atualizar: (l, d) => prisma.proposicao.update({ where: { id: l.id }, data: d as Prisma.ProposicaoUpdateInput }),
    paraAtualizar: (p) => semNulos(semChave(p)),
  });
  return mapaIds(
    (ids) =>
      prisma.proposicao.findMany({ where: { casa: "SENADO", idExterno: { in: ids } }, select: { id: true, idExterno: true } }),
    proposicoes.map((p) => p.idExterno),
  );
}

// ---------------------------------- 1. senadores ----------------------------------

export async function buscarSenadores(client: SenadoClient, hoje: string) {
  const atuais = await client.senadoresEmExercicio();
  const legislatura = await client.legislatura(hoje);
  const daLegislatura = legislatura ? await client.senadoresDaLegislatura(legislatura) : [];

  const porCodigo = new Map<string, ParlamentarInput>();
  for (const s of daLegislatura) porCodigo.set(s.codigo, mapearSenador(s, false));
  // A lista atual vem depois porque traz partido/foto mais frescos.
  for (const s of atuais) porCodigo.set(s.codigo, mapearSenador(s, true));

  return { legislatura, atuais, senadores: [...porCodigo.values()] };
}

export async function gravarSenadores(
  prisma: PrismaClient,
  { senadores, atuais }: Awaited<ReturnType<typeof buscarSenadores>>,
) {
  await gravarEmLote({
    dados: senadores,
    chave: (s) => s.idExterno,
    buscar: (ids) => prisma.parlamentar.findMany({ where: { casa: "SENADO", idExterno: { in: ids } } }),
    chaveDaLinha: (l) => l.idExterno,
    criar: (novos) => prisma.parlamentar.createMany({ data: novos, skipDuplicates: true }),
    atualizar: (l, d) => prisma.parlamentar.update({ where: { id: l.id }, data: d as Prisma.ParlamentarUpdateInput }),
    paraAtualizar: semChave,
  });

  // Quem saiu da lista atual (fim de mandato, licença longa, suplente que devolveu a vaga).
  if (atuais.length > 0) {
    await prisma.parlamentar.updateMany({
      where: { casa: "SENADO", emExercicio: true, idExterno: { notIn: atuais.map((s) => s.codigo) } },
      data: { emExercicio: false },
    });
  }
  return senadores.length;
}

// ---------------------------------- 2. votações ----------------------------------

function senadoresDosVotos(votacoes: VotacaoPlenario[]) {
  const porCodigo = new Map<string, ParlamentarInput>();
  for (const v of votacoes) {
    for (const voto of v.votos) porCodigo.set(voto.codigoParlamentar, mapearSenadorDoVoto(voto));
  }
  return [...porCodigo.values()];
}

export function mapearVotacoes(votacoes: VotacaoPlenario[]) {
  return {
    senadores: senadoresDosVotos(votacoes),
    votacoes: votacoes.map((v) => ({
      votacao: mapearVotacao(v),
      proposicao: v.materia ? mapearMateriaVotada(v.materia) : null,
      votos: v.votos.map(mapearVoto),
    })),
  };
}

export async function gravarVotacoes(prisma: PrismaClient, dados: ReturnType<typeof mapearVotacoes>) {
  const parlamentares = await garantirParlamentares(prisma, dados.senadores);

  const proposicoes = new Map<string, ProposicaoInput>();
  for (const { proposicao } of dados.votacoes) {
    if (proposicao) proposicoes.set(proposicao.idExterno, proposicao);
  }
  const idsProposicao = await upsertProposicoes(prisma, [...proposicoes.values()]);

  const votacoes = dados.votacoes.map(({ votacao, proposicao }) => ({
    ...votacao,
    proposicaoId: proposicao ? (idsProposicao.get(proposicao.idExterno) ?? null) : null,
  }));
  await gravarEmLote({
    dados: votacoes,
    chave: (v) => v.idExterno,
    buscar: (ids) => prisma.votacao.findMany({ where: { casa: "SENADO", idExterno: { in: ids } } }),
    chaveDaLinha: (l) => l.idExterno,
    criar: (novas) => prisma.votacao.createMany({ data: novas, skipDuplicates: true }),
    atualizar: (l, d) => prisma.votacao.update({ where: { id: l.id }, data: d as Prisma.VotacaoUncheckedUpdateInput }),
    paraAtualizar: semChave,
  });
  const idsVotacao = await mapaIds(
    (ids) => prisma.votacao.findMany({ where: { casa: "SENADO", idExterno: { in: ids } }, select: { id: true, idExterno: true } }),
    votacoes.map((v) => v.idExterno),
  );

  let registros = 0;
  for (const lote of emLotes(dados.votacoes, 20)) {
    const gravadas = lote.flatMap(({ votacao }) => idsVotacao.get(votacao.idExterno) ?? []).map((id) => ({ id }));

    // Apagar e recriar os votos de 20 votações são 2 comandos: a transação fica bem abaixo dos 5 s.
    const votos = lote.flatMap(({ votacao, votos: lista }) => {
      const votacaoId = idsVotacao.get(votacao.idExterno);
      if (!votacaoId) return [];
      return lista.flatMap(({ codigoParlamentar, ...voto }) => {
        const parlamentarId = parlamentares.get(codigoParlamentar);
        return parlamentarId ? [{ ...voto, votacaoId, parlamentarId }] : [];
      });
    });

    await prisma.$transaction([
      prisma.voto.deleteMany({ where: { votacaoId: { in: gravadas.map((g) => g.id) } } }),
      prisma.voto.createMany({ data: votos }),
    ]);
    registros += gravadas.length + votos.length;
  }
  return registros;
}

// ---------------------------------- 2b. orientações de bancada ----------------------------------

/** Casa a orientação com a votação pelo sequencial (o serviço não traz o código) e confere o dia. */
export function mapearOrientacoes(votacoes: VotacaoPlenario[], orientacoes: OrientacaoBancadaApi[]) {
  const porSequencial = new Map(votacoes.flatMap((v) => (v.sequencial === null ? [] : [[v.sequencial, v]])));
  return orientacoes.flatMap((o) => {
    const votacao = porSequencial.get(o.sequencialVotacao);
    if (!votacao || votacao.data !== o.dataInicioVotacao.slice(0, 10)) return [];
    // Liderança sem orientação vem com o voto vazio.
    const unicas = new Map(
      (o.orientacoesLideranca ?? []).filter((l) => l.voto.trim()).map((l) => [l.partido.trim(), l.voto.trim()]),
    );
    return [
      {
        codigoVotacao: votacao.codigo,
        orientacoes: [...unicas].map(([sigla, orientacao]) => ({ sigla, orientacao, tipo: tipoDaOrientacao(orientacao) })),
      },
    ];
  });
}

export async function gravarOrientacoes(prisma: PrismaClient, dados: ReturnType<typeof mapearOrientacoes>) {
  const ids = new Map(
    (
      await prisma.votacao.findMany({
        where: { casa: "SENADO", idExterno: { in: dados.map((d) => d.codigoVotacao) } },
        select: { id: true, idExterno: true },
      })
    ).map((v) => [v.idExterno, v.id]),
  );

  let registros = 0;
  for (const lote of emLotes(dados, 50)) {
    const comId = lote.flatMap((d) => {
      const votacaoId = ids.get(d.codigoVotacao);
      return votacaoId ? [{ votacaoId, orientacoes: d.orientacoes }] : [];
    });
    const linhas = comId.flatMap((d) => d.orientacoes.map((o) => ({ ...o, votacaoId: d.votacaoId })));
    await prisma.$transaction([
      prisma.orientacao.deleteMany({ where: { votacaoId: { in: comId.map((d) => d.votacaoId) } } }),
      prisma.orientacao.createMany({ data: linhas }),
    ]);
    registros += linhas.length;
  }
  return registros;
}

// ---------------------------------- 3. eventos ----------------------------------

export function mapearEventos(
  sessoes: SessaoPlenario[],
  reunioes: ReuniaoComissao[],
  votacoes: VotacaoPlenario[],
) {
  const presencas = presencasPorSessao(votacoes);
  const eventos = new Map<string, { evento: Prisma.EventoCreateManyInput; presencas: PresencaMapeada[] | null }>();

  for (const v of votacoes) {
    const evento = mapearSessaoDaVotacao(v);
    eventos.set(evento.idExterno, { evento, presencas: null });
  }
  // A agenda tem horário e descrição melhores; sobrescreve o que veio só da votação.
  for (const s of sessoes.filter(sessaoConta)) {
    const evento = mapearSessao(s);
    eventos.set(evento.idExterno, { evento, presencas: null });
  }
  for (const [codigoSessao, porSenador] of presencas) {
    const item = eventos.get(idEventoPlenario(codigoSessao));
    if (item) item.presencas = [...porSenador.values()];
  }
  for (const r of reunioes.filter(reuniaoConta)) {
    const evento = mapearReuniao(r);
    // A API não publica presença em reuniões de comissão.
    eventos.set(evento.idExterno, { evento, presencas: null });
  }

  return { senadores: senadoresDosVotos(votacoes), eventos: [...eventos.values()] };
}

export async function gravarEventos(prisma: PrismaClient, dados: ReturnType<typeof mapearEventos>) {
  const parlamentares = await garantirParlamentares(prisma, dados.senadores);

  await gravarEmLote({
    dados: dados.eventos.map(({ evento }) => evento),
    chave: (e) => e.idExterno,
    buscar: (ids) => prisma.evento.findMany({ where: { casa: "SENADO", idExterno: { in: ids } } }),
    chaveDaLinha: (l) => l.idExterno,
    criar: (novos) => prisma.evento.createMany({ data: novos, skipDuplicates: true }),
    atualizar: (l, d) => prisma.evento.update({ where: { id: l.id }, data: d as Prisma.EventoUpdateInput }),
    paraAtualizar: semChave,
  });
  const idsEvento = await mapaIds(
    (ids) => prisma.evento.findMany({ where: { casa: "SENADO", idExterno: { in: ids } }, select: { id: true, idExterno: true } }),
    dados.eventos.map(({ evento }) => evento.idExterno),
  );

  let registros = 0;
  for (const lote of emLotes(dados.eventos, 30)) {
    const gravados = lote.flatMap((item) => {
      const id = idsEvento.get(item.evento.idExterno);
      return id ? [{ ...item, id }] : [];
    });

    // Só mexe nas presenças de eventos que têm votação nominal no intervalo buscado.
    const comPresenca = gravados.filter((item) => item.presencas);
    const presencas = comPresenca.flatMap(({ id, presencas: lista }) =>
      (lista ?? []).flatMap(({ codigoParlamentar, ...p }) => {
        const parlamentarId = parlamentares.get(codigoParlamentar);
        return parlamentarId ? [{ ...p, eventoId: id, parlamentarId }] : [];
      }),
    );
    if (comPresenca.length > 0) {
      await prisma.$transaction([
        prisma.presenca.deleteMany({ where: { eventoId: { in: comPresenca.map((e) => e.id) } } }),
        prisma.presenca.createMany({ data: presencas }),
      ]);
    }
    registros += gravados.length + presencas.length;
  }
  return registros;
}

// ---------------------------------- 4. despesas (CEAPS) ----------------------------------

export async function buscarDespesas(client: SenadoClient, anos: number[]) {
  const porAno: { ano: number; itens: { codSenador: string; nomeSenador: string; despesa: ReturnType<typeof mapearDespesa> }[] }[] = [];
  for (const ano of anos) {
    const despesas = await client.despesasCeaps(ano);
    porAno.push({
      ano,
      itens: despesas.map((d) => ({
        codSenador: String(d.codSenador),
        nomeSenador: d.nomeSenador,
        despesa: mapearDespesa(d),
      })),
    });
  }
  return porAno;
}

/**
 * Por ano, apaga e recria as despesas do Senado numa transação: a CEAPS é publicada por ano inteiro
 * e o Senado corrige/estorna lançamentos antigos, então é o jeito mais simples de ficar igual à fonte.
 */
export async function gravarDespesas(
  prisma: PrismaClient,
  client: SenadoClient,
  porAno: Awaited<ReturnType<typeof buscarDespesas>>,
) {
  let parlamentares = await mapaParlamentares(prisma);

  // Ex-senadores fora da legislatura atual: busca o cadastro antes de gravar as despesas.
  const faltantes = [...new Set(porAno.flatMap((a) => a.itens.map((i) => i.codSenador)))].filter(
    (codigo) => !parlamentares.has(codigo),
  );
  const novos: ParlamentarInput[] = [];
  for (const codigo of faltantes) {
    const senador = await client.senador(codigo);
    if (senador) novos.push(mapearSenador(senador, false));
  }
  if (novos.length > 0) parlamentares = await garantirParlamentares(prisma, novos);

  let registros = 0;
  for (const { ano, itens } of porAno) {
    const data = itens.flatMap(({ codSenador, despesa }) => {
      const parlamentarId = parlamentares.get(codSenador);
      return parlamentarId ? [{ ...despesa, parlamentarId }] : [];
    });
    if (data.length === 0) continue;

    await prisma.$transaction([
      prisma.despesaCota.deleteMany({ where: { ano, parlamentar: { casa: "SENADO" } } }),
      ...emLotes(data, 1000).map((lote) => prisma.despesaCota.createMany({ data: lote, skipDuplicates: true })),
    ], { timeout: TIMEOUT_DESPESAS_MS, maxWait: 10_000 });
    registros += data.length;
  }
  return registros;
}

// ---------------------------------- 5. matérias (autoria) ----------------------------------

/**
 * Uma consulta a /processo por senador em exercício (~81 requisições), filtrando pela data de
 * apresentação. Inclui coautorias; o proponente é o primeiro nome do texto de autoria.
 */
export async function buscarMaterias(client: SenadoClient, senadores: Senador[], desde: string, ate: string) {
  type Materia = {
    proposicao: ProposicaoInput;
    autores: { codigoParlamentar: string; proponente: boolean }[];
  };
  const porProcesso = new Map<string, Materia>();

  for (const s of senadores) {
    for (const processo of await client.processosDoAutor(s.codigo, desde, ate)) {
      const proposicao = mapearProcesso(processo);
      if (!proposicao) continue;
      const item: Materia = porProcesso.get(proposicao.idExterno) ?? { proposicao, autores: [] };
      item.autores.push({ codigoParlamentar: s.codigo, proponente: ehProponente(processo.autoria, s.nome) });
      porProcesso.set(proposicao.idExterno, item);
    }
  }
  return [...porProcesso.values()];
}

export async function gravarMaterias(prisma: PrismaClient, materias: Awaited<ReturnType<typeof buscarMaterias>>) {
  const parlamentares = await mapaParlamentares(prisma);
  const ids = await upsertProposicoes(
    prisma,
    materias.map((m) => m.proposicao),
  );

  const autorias = materias.flatMap(({ proposicao, autores }) =>
    autores.flatMap(({ codigoParlamentar, proponente }) => {
      const proposicaoId = ids.get(proposicao.idExterno);
      const parlamentarId = parlamentares.get(codigoParlamentar);
      return proposicaoId && parlamentarId ? [{ proposicaoId, parlamentarId, proponente }] : [];
    }),
  );

  // Autoria nova entra por createMany; a que já existe só muda se o proponente mudou (até 2 updateMany por lote).
  const chaveAutoria = (a: { proposicaoId: string; parlamentarId: string }) => `${a.proposicaoId}|${a.parlamentarId}`;
  for (const lote of emLotes(autorias, 1000)) {
    const pares = lote.map(({ proposicaoId, parlamentarId }) => ({ proposicaoId, parlamentarId }));
    const existentes = new Map(
      (await prisma.proposicaoAutor.findMany({ where: { OR: pares } })).map((a) => [chaveAutoria(a), a.proponente]),
    );
    const novas = lote.filter((a) => !existentes.has(chaveAutoria(a)));
    if (novas.length > 0) await prisma.proposicaoAutor.createMany({ data: novas, skipDuplicates: true });

    for (const proponente of [true, false]) {
      const mudaram = lote.filter((a) => a.proponente === proponente && existentes.get(chaveAutoria(a)) === !proponente);
      if (mudaram.length > 0) {
        await prisma.proposicaoAutor.updateMany({
          where: { OR: mudaram.map(({ proposicaoId, parlamentarId }) => ({ proposicaoId, parlamentarId })) },
          data: { proponente },
        });
      }
    }
  }
  return materias.length + autorias.length;
}
