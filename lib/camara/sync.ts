import type { PrismaClient } from "../prisma";
import type { CamaraClient } from "./client";
import { janelasMensais } from "./client";
import {
  escolherProposicao,
  eventoContaPresenca,
  mapearDeputado,
  mapearDespesa,
  mapearEvento,
  mapearProposicao,
  mapearVotacao,
  mapearVoto,
} from "./mapear";
import type { DeputadoResumo, VotacaoDetalhe } from "./types";

// Sincronização idempotente da Câmara. Cada etapa devolve quantos registros gravou (ou gravaria,
// no dry-run) e os 2 primeiros registros mapeados. Com `prisma: null` só busca e mapeia.

const CONCORRENCIA = 4;
const LOTE_UPSERT = 50;
const LOTE_CREATE = 1000;
const CHUNK = 40;

export interface Contexto {
  api: CamaraClient;
  /** `null` no dry-run: nada toca o banco. */
  prisma: PrismaClient | null;
  log: (mensagem: string) => void;
  /** Limita quantos deputados as etapas por deputado consultam (útil em testes e no dry-run). */
  limiteDeputados?: number;
}

export interface Resultado {
  registros: number;
  exemplos: unknown[];
}

function emLotes<T>(itens: T[], tamanho: number) {
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) lotes.push(itens.slice(i, i + tamanho));
  return lotes;
}

/** Executa `fn` sobre os itens com no máximo `limite` chamadas simultâneas, mantendo a ordem. */
async function emParalelo<T, R>(itens: T[], limite: number, fn: (item: T) => Promise<R>) {
  const resultados = new Array<R>(itens.length);
  let proximo = 0;

  async function trabalhador() {
    while (proximo < itens.length) {
      const indice = proximo++;
      resultados[indice] = await fn(itens[indice]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, trabalhador));
  return resultados;
}

/** Falhas isoladas (um deputado, um evento) não derrubam a etapa; ela termina com erro depois de gravar o resto. */
function coletorDeFalhas() {
  const falhas: string[] = [];
  return {
    falhas,
    async tentar<T>(rotulo: string, padrao: T, fn: () => Promise<T>) {
      try {
        return await fn();
      } catch (error) {
        falhas.push(`${rotulo}: ${String(error)}`);
        return padrao;
      }
    },
    encerrar() {
      if (falhas.length > 0) {
        throw new Error(`${falhas.length} falha(s); primeira: ${falhas[0]}`);
      }
    },
  };
}

/** Mapa idExterno (Câmara) -> id interno; cria os deputados que ainda não existem a partir do payload. */
async function garantirParlamentares(prisma: PrismaClient, deputados: DeputadoResumo[]) {
  const unicos = new Map(deputados.map((d) => [String(d.id), d]));
  if (unicos.size === 0) return new Map<string, string>();

  const buscar = () =>
    prisma.parlamentar.findMany({
      where: { casa: "CAMARA", idExterno: { in: [...unicos.keys()] } },
      select: { id: true, idExterno: true },
    });

  let existentes = await buscar();
  const conhecidos = new Set(existentes.map((e) => e.idExterno));
  const faltando = [...unicos.values()].filter((d) => !conhecidos.has(String(d.id)));

  if (faltando.length > 0) {
    // Quem votou/compareceu estava em exercício; a etapa "deputados" acerta o restante depois.
    await prisma.parlamentar.createMany({
      data: faltando.map((d) => mapearDeputado(d, true)),
      skipDuplicates: true,
    });
    existentes = await buscar();
  }
  return new Map(existentes.map((e) => [e.idExterno, e.id]));
}

async function idsProposicoes(prisma: PrismaClient, idsExternos: string[]) {
  const mapa = new Map<string, string>();
  for (const lote of emLotes(idsExternos, 5000)) {
    const linhas = await prisma.proposicao.findMany({
      where: { casa: "CAMARA", idExterno: { in: lote } },
      select: { id: true, idExterno: true },
    });
    for (const linha of linhas) mapa.set(linha.idExterno, linha.id);
  }
  return mapa;
}

// 1. Deputados ----------------------------------------------------------------------------------

export async function sincronizarDeputados({ api, prisma, log }: Contexto): Promise<Resultado> {
  const legislatura = await api.legislaturaAtual();
  log(`legislatura ${legislatura.id} (${legislatura.dataInicio} a ${legislatura.dataFim})`);

  const [daLegislatura, emExercicio] = await Promise.all([
    api.deputados(legislatura.id),
    api.deputadosEmExercicio(),
  ]);
  const idsEmExercicio = new Set(emExercicio.map((d) => d.id));

  // A lista pode repetir o mesmo deputado (troca de partido/status); vale o último.
  const unicos = new Map(daLegislatura.map((d) => [d.id, d]));
  const dados = [...unicos.values()].map((d) => mapearDeputado(d, idsEmExercicio.has(d.id)));
  log(`${dados.length} deputados na legislatura, ${dados.filter((d) => d.emExercicio).length} em exercício`);

  if (prisma) {
    for (const lote of emLotes(dados, LOTE_UPSERT)) {
      await prisma.$transaction(
        lote.map(({ casa, idExterno, ...resto }) =>
          prisma.parlamentar.upsert({
            where: { casa_idExterno: { casa, idExterno } },
            create: { casa, idExterno, ...resto },
            update: resto,
          }),
        ),
      );
    }
  }
  return { registros: dados.length, exemplos: dados.slice(0, 2) };
}

// 2. Votações e votos ---------------------------------------------------------------------------

export async function sincronizarVotacoes({ api, prisma, log }: Contexto, desde: string, ate: string): Promise<Resultado> {
  const exemplos: unknown[] = [];
  const { falhas, tentar, encerrar } = coletorDeFalhas();
  const cacheProposicoes = new Map<number, ReturnType<typeof mapearProposicao>>();
  let registros = 0;
  let totalVotos = 0;

  for (const janela of janelasMensais(desde, ate)) {
    const lista = [...new Map((await api.votacoes(janela.inicio, janela.fim)).map((v) => [v.id, v])).values()];
    log(`votações ${janela.inicio} a ${janela.fim}: ${lista.length}`);

    for (const [n, chunk] of emLotes(lista, CHUNK).entries()) {
      const coletadas = await emParalelo(chunk, CONCORRENCIA, (v) =>
        tentar(`votação ${v.id}`, null, async () => {
          // Sem objeto único na lista, o detalhe diz quais proposições foram afetadas.
          const detalhe: VotacaoDetalhe | null = v.uriProposicaoObjeto ? null : await api.votacao(v.id);
          const votos = (await api.votos(v.id)).map((voto) => ({ voto: mapearVoto(voto), deputado: voto.deputado_ }));
          return { votacao: v, idProposicao: escolherProposicao(v, detalhe), votos };
        }),
      );
      const validas = coletadas.filter((c) => c !== null);

      // Proposições ainda desconhecidas (no banco, ou neste run no dry-run).
      const idsProp = [...new Set(validas.flatMap((c) => (c.idProposicao ? [c.idProposicao] : [])))];
      const noBanco = prisma ? await idsProposicoes(prisma, idsProp.map(String)) : new Map<string, string>();
      const novas = idsProp.filter((id) => !noBanco.has(String(id)) && !cacheProposicoes.has(id));

      await emParalelo(novas, CONCORRENCIA, (id) =>
        tentar(`proposição ${id}`, undefined, async () => {
          cacheProposicoes.set(id, mapearProposicao(await api.proposicao(id)));
        }),
      );

      if (prisma) {
        const paraGravar = novas.flatMap((id) => cacheProposicoes.get(id) ?? []);
        for (const lote of emLotes(paraGravar, LOTE_CREATE)) {
          await prisma.proposicao.createMany({ data: lote, skipDuplicates: true });
        }
        const propIds = await idsProposicoes(prisma, idsProp.map(String));

        const votacoesMapeadas = validas.map((c) => ({
          ...mapearVotacao(c.votacao),
          proposicaoId: c.idProposicao ? (propIds.get(String(c.idProposicao)) ?? null) : null,
        }));
        for (const lote of emLotes(votacoesMapeadas, LOTE_UPSERT)) {
          await prisma.$transaction(
            lote.map(({ casa, idExterno, ...resto }) =>
              prisma.votacao.upsert({
                where: { casa_idExterno: { casa, idExterno } },
                create: { casa, idExterno, ...resto },
                update: resto,
              }),
            ),
          );
        }

        const votacaoIds = new Map(
          (
            await prisma.votacao.findMany({
              where: { casa: "CAMARA", idExterno: { in: validas.map((c) => c.votacao.id) } },
              select: { id: true, idExterno: true },
            })
          ).map((v) => [v.idExterno, v.id]),
        );
        const parlamentarIds = await garantirParlamentares(
          prisma,
          validas.flatMap((c) => c.votos.map((v) => v.deputado)),
        );

        const linhas = validas.flatMap((c) => {
          const votacaoId = votacaoIds.get(c.votacao.id);
          if (!votacaoId) return [];
          return c.votos.flatMap(({ voto }) => {
            const parlamentarId = parlamentarIds.get(voto.idDeputado);
            if (!parlamentarId) return [];
            return [{ votacaoId, parlamentarId, tipo: voto.tipo, votoOriginal: voto.votoOriginal, partido: voto.partido }];
          });
        });
        for (const lote of emLotes(linhas, LOTE_CREATE)) {
          await prisma.voto.createMany({ data: lote, skipDuplicates: true });
        }
      }

      for (const c of validas) {
        registros++;
        totalVotos += c.votos.length;
        if (exemplos.length < 2 && c.votos.length > 0) {
          exemplos.push({
            votacao: mapearVotacao(c.votacao),
            idProposicao: c.idProposicao,
            proposicao: c.idProposicao ? (cacheProposicoes.get(c.idProposicao) ?? "(já no banco)") : null,
            totalVotos: c.votos.length,
            votos: c.votos.slice(0, 2).map((v) => v.voto),
          });
        }
      }
      log(`  votações ${Math.min((n + 1) * CHUNK, lista.length)}/${lista.length} (${totalVotos} votos até aqui)`);
    }
  }

  log(`${registros} votações, ${totalVotos} votos`);
  if (falhas.length > 0) log(`${falhas.length} falha(s)`);
  encerrar();
  return { registros: registros + totalVotos, exemplos };
}

// 3. Eventos e presença -------------------------------------------------------------------------

export async function sincronizarEventos({ api, prisma, log }: Contexto, desde: string, ate: string): Promise<Resultado> {
  const exemplos: unknown[] = [];
  const { tentar, falhas, encerrar } = coletorDeFalhas();
  let totalEventos = 0;
  let totalPresencas = 0;

  for (const janela of janelasMensais(desde, ate)) {
    const todos = await api.eventos(janela.inicio, janela.fim);
    const eventos = [...new Map(todos.filter(eventoContaPresenca).map((e) => [e.id, e])).values()];
    log(`eventos ${janela.inicio} a ${janela.fim}: ${todos.length} no total, ${eventos.length} sessões/reuniões encerradas`);

    for (const [n, chunk] of emLotes(eventos, CHUNK).entries()) {
      const mapeados = chunk.map(mapearEvento);
      let jaComPresenca = new Set<string>();
      let eventoIds = new Map<string, string>();

      if (prisma) {
        for (const lote of emLotes(mapeados, LOTE_UPSERT)) {
          await prisma.$transaction(
            lote.map(({ casa, idExterno, ...resto }) =>
              prisma.evento.upsert({
                where: { casa_idExterno: { casa, idExterno } },
                create: { casa, idExterno, ...resto },
                update: resto,
              }),
            ),
          );
        }
        const linhas = await prisma.evento.findMany({
          where: { casa: "CAMARA", idExterno: { in: mapeados.map((e) => e.idExterno) } },
          select: { id: true, idExterno: true, _count: { select: { presencas: true } } },
        });
        eventoIds = new Map(linhas.map((l) => [l.idExterno, l.id]));
        // Evento encerrado não muda a lista de presentes; evita refazer a requisição.
        jaComPresenca = new Set(linhas.filter((l) => l._count.presencas > 0).map((l) => l.idExterno));
      }

      const presentes = await emParalelo(chunk, CONCORRENCIA, (e) =>
        jaComPresenca.has(String(e.id))
          ? Promise.resolve(null)
          : tentar(`evento ${e.id}`, null, () => api.eventoDeputados(e.id)),
      );

      if (prisma) {
        const parlamentarIds = await garantirParlamentares(prisma, presentes.flatMap((p) => p ?? []));
        const linhas = chunk.flatMap((e, i) => {
          const eventoId = eventoIds.get(String(e.id));
          if (!eventoId) return [];
          return (presentes[i] ?? []).flatMap((d) => {
            const parlamentarId = parlamentarIds.get(String(d.id));
            return parlamentarId ? [{ eventoId, parlamentarId, situacao: "PRESENTE" as const }] : [];
          });
        });
        for (const lote of emLotes(linhas, LOTE_CREATE)) {
          await prisma.presenca.createMany({ data: lote, skipDuplicates: true });
        }
      }

      for (const [i, evento] of mapeados.entries()) {
        totalEventos++;
        const lista = presentes[i];
        totalPresencas += lista?.length ?? 0;
        if (exemplos.length < 2 && lista?.length) {
          exemplos.push({ evento, presentes: lista.length, primeiros: lista.slice(0, 2).map((d) => d.nome) });
        }
      }
      log(`  eventos ${Math.min((n + 1) * CHUNK, eventos.length)}/${eventos.length} (${totalPresencas} presenças até aqui)`);
    }
  }

  log(`${totalEventos} eventos, ${totalPresencas} presenças (PRESENTE)`);
  if (falhas.length > 0) log(`${falhas.length} falha(s)`);
  encerrar();
  return { registros: totalEventos + totalPresencas, exemplos };
}

// 4. Despesas da cota parlamentar ---------------------------------------------------------------

/** Meses do intervalo agrupados por ano. */
function mesesDoIntervalo(desde: string, ate: string) {
  const porAno = new Map<number, number[]>();
  for (const { inicio } of janelasMensais(desde, ate)) {
    const ano = Number(inicio.slice(0, 4));
    porAno.set(ano, [...(porAno.get(ano) ?? []), Number(inicio.slice(5, 7))]);
  }
  return porAno;
}

/** Deputados a consultar: os do banco (se houver conexão) ou, no dry-run, a lista da API. */
async function deputadosParaConsulta({ api, prisma, limiteDeputados }: Contexto, idLegislatura: number) {
  const limitar = <T,>(itens: T[]) => (limiteDeputados ? itens.slice(0, limiteDeputados) : itens);

  if (prisma) {
    const linhas = await prisma.parlamentar.findMany({
      where: { casa: "CAMARA" },
      select: { id: true, idExterno: true },
    });
    if (linhas.length > 0) return limitar(linhas).map((l) => ({ idExterno: l.idExterno, parlamentarId: l.id as string | null }));
    throw new Error("Nenhum parlamentar da Câmara no banco; rode a etapa deputados antes.");
  }
  const lista = await api.deputados(idLegislatura);
  return limitar([...new Set(lista.map((d) => String(d.id)))]).map((idExterno) => ({
    idExterno,
    parlamentarId: null as string | null,
  }));
}

export async function sincronizarDespesas(contexto: Contexto, desde: string, ate: string): Promise<Resultado> {
  const { api, prisma, log } = contexto;
  const { tentar, falhas, encerrar } = coletorDeFalhas();
  const legislatura = await api.legislaturaAtual();
  const deputados = await deputadosParaConsulta(contexto, legislatura.id);
  const porAno = mesesDoIntervalo(desde, ate);
  log(`despesas ${desde} a ${ate}: ${deputados.length} deputados, meses ${[...porAno].map(([a, m]) => `${a}:${m.join(",")}`).join(" ")}`);

  const exemplos: unknown[] = [];
  let registros = 0;

  for (const [n, chunk] of emLotes(deputados, CHUNK).entries()) {
    const resultados = await emParalelo(chunk, CONCORRENCIA, (dep) =>
      tentar(`despesas do deputado ${dep.idExterno}`, [] as ReturnType<typeof mapearDespesa>[], async () => {
        const idDeputado = Number(dep.idExterno);
        const linhas = [];
        for (const [ano, meses] of porAno) {
          if (meses.length <= 2) {
            for (const mes of meses) linhas.push(...(await api.despesas(idDeputado, legislatura.id, ano, mes)));
          } else {
            // Muitos meses: um pedido por ano é mais barato; filtramos os meses do intervalo.
            const doAno = await api.despesas(idDeputado, legislatura.id, ano);
            linhas.push(...doAno.filter((d) => meses.includes(d.mes)));
          }
        }
        const unicas = new Map(linhas.map(mapearDespesa).map((d) => [d.idExterno, d]));
        return [...unicas.values()];
      }),
    );

    if (prisma) {
      const dados = resultados.flatMap((despesas, i) =>
        despesas.map((d) => ({ ...d, parlamentarId: chunk[i].parlamentarId! })),
      );
      for (const lote of emLotes(dados, LOTE_CREATE)) {
        await prisma.despesaCota.createMany({ data: lote, skipDuplicates: true });
      }
    }

    for (const [i, despesas] of resultados.entries()) {
      registros += despesas.length;
      if (exemplos.length < 2 && despesas.length > 0) exemplos.push({ deputado: chunk[i].idExterno, ...despesas[0] });
    }
    log(`  deputados ${Math.min((n + 1) * CHUNK, deputados.length)}/${deputados.length} (${registros} despesas até aqui)`);
  }

  if (falhas.length > 0) log(`${falhas.length} falha(s)`);
  encerrar();
  return { registros, exemplos };
}

// 5. Proposições de autoria ---------------------------------------------------------------------

/**
 * Uma consulta por deputado (`/proposicoes?idDeputadoAutor=`, paginada) devolve as proposições e,
 * pela própria consulta, a autoria. O caminho alternativo (listar todas as proposições do período e
 * chamar `/proposicoes/{id}/autores` em cada) custa uma requisição por proposição, milhares por mês.
 */
export async function sincronizarProposicoes(contexto: Contexto, desde: string, ate: string): Promise<Resultado> {
  const { api, prisma, log } = contexto;
  const { tentar, falhas, encerrar } = coletorDeFalhas();
  const legislatura = await api.legislaturaAtual();
  const deputados = await deputadosParaConsulta(contexto, legislatura.id);
  log(`proposições ${desde} a ${ate}: ${deputados.length} deputados`);

  const exemplos: unknown[] = [];
  const vistas = new Set<number>();
  let autorias = 0;

  for (const [n, chunk] of emLotes(deputados, CHUNK).entries()) {
    const resultados = await emParalelo(chunk, CONCORRENCIA, (dep) =>
      tentar(`proposições do deputado ${dep.idExterno}`, [] as Awaited<ReturnType<CamaraClient["proposicoesDoAutor"]>>, () =>
        api.proposicoesDoAutor(Number(dep.idExterno), desde, ate),
      ),
    );

    const proposicoes = new Map(resultados.flat().map((p) => [p.id, mapearProposicao(p)]));

    if (prisma) {
      // skipDuplicates: o que já veio com situação (via votação) não é sobrescrito pela lista, que não a traz.
      for (const lote of emLotes([...proposicoes.values()], LOTE_CREATE)) {
        await prisma.proposicao.createMany({ data: lote, skipDuplicates: true });
      }
      const ids = await idsProposicoes(prisma, [...proposicoes.keys()].map(String));
      const autoria = resultados.flatMap((lista, i) =>
        lista.flatMap((p) => {
          const proposicaoId = ids.get(String(p.id));
          return proposicaoId ? [{ proposicaoId, parlamentarId: chunk[i].parlamentarId!, proponente: true }] : [];
        }),
      );
      for (const lote of emLotes(autoria, LOTE_CREATE)) {
        await prisma.proposicaoAutor.createMany({ data: lote, skipDuplicates: true });
      }
    }

    for (const lista of resultados) {
      autorias += lista.length;
      for (const p of lista) {
        if (!vistas.has(p.id)) {
          vistas.add(p.id);
          if (exemplos.length < 2) exemplos.push(proposicoes.get(p.id));
        }
      }
    }
    log(`  deputados ${Math.min((n + 1) * CHUNK, deputados.length)}/${deputados.length} (${vistas.size} proposições, ${autorias} autorias)`);
  }

  if (falhas.length > 0) log(`${falhas.length} falha(s)`);
  encerrar();
  return { registros: vistas.size + autorias, exemplos };
}
