import type { createCamaraClient } from "../camara/client";
import type { Prisma } from "../generated/prisma/client";
import type { PrismaClient } from "../prisma";
import type { createSenadoClient } from "../senado/client";
import { estadoDoProjeto, hashCurto, lerChave, textoEstado, textoVotos, tituloVotacao } from "./textos";

// Gera as notificações de quem segue parlamentares e projetos. Roda fora das requisições
// (scripts/notificar.ts), depois da carga diária da Câmara e do Senado:
// - votos e projetos apresentados vêm do banco, que a carga acabou de atualizar;
// - a situação dos projetos seguidos vem direto da API de cada Casa (o banco não guarda todos).
// Cada acontecimento tem uma chave (`evento`) única por pessoa, então rodar de novo não duplica.

const DIA = 24 * 60 * 60 * 1000;
/** Não volta mais que isso no passado: a carga diária cobre os últimos 30 dias. */
const JANELA_DIAS = 30;
/** Notificações mais antigas que isso são apagadas. */
export const RETENCAO_DIAS = 180;

export interface ContextoNotificar {
  prisma: PrismaClient;
  camara: ReturnType<typeof createCamaraClient>;
  senado: ReturnType<typeof createSenadoClient>;
  agora?: Date;
  log?: (mensagem: string) => void;
}

type NovaNotificacao = Prisma.NotificacaoCreateManyInput;

/** A partir de quando notificar alguém que segue desde `criadoEm`: um dia antes (votação do mesmo dia), no máximo 30 dias. */
const inicioPara = (criadoEm: Date, agora: Date) =>
  new Date(Math.max(criadoEm.getTime() - DIA, agora.getTime() - JANELA_DIAS * DIA));

async function notificacoesDeParlamentares({ prisma, agora = new Date() }: ContextoNotificar) {
  const seguidos = await prisma.seguido.findMany({ where: { tipo: "PARLAMENTAR" } });
  if (seguidos.length === 0) return [];

  const chaves = [...new Set(seguidos.map((s) => s.chave))].map(lerChave).filter((c) => c !== null);
  const parlamentares = await prisma.parlamentar.findMany({
    where: {
      OR: chaves.map((c) => ({ casa: c.casa === "camara" ? ("CAMARA" as const) : ("SENADO" as const), idExterno: c.id })),
    },
    select: { id: true, casa: true, idExterno: true, nome: true },
  });
  const porChave = new Map(parlamentares.map((p) => [`${p.casa === "CAMARA" ? "camara" : "senado"}-${p.idExterno}`, p]));
  const ids = parlamentares.map((p) => p.id);
  if (ids.length === 0) return [];

  const desde = new Date(Math.min(...seguidos.map((s) => inicioPara(s.criadoEm, agora).getTime())));

  const [votos, autorias] = await Promise.all([
    prisma.voto.findMany({
      where: { parlamentarId: { in: ids }, votacao: { data: { gte: desde } } },
      select: {
        parlamentarId: true,
        tipo: true,
        votacao: {
          select: {
            id: true,
            casa: true,
            idExterno: true,
            data: true,
            descricao: true,
            proposicao: { select: { siglaTipo: true, numero: true, ano: true } },
          },
        },
      },
    }),
    prisma.proposicaoAutor.findMany({
      where: { parlamentarId: { in: ids }, proposicao: { dataApresentacao: { gte: desde } } },
      select: {
        parlamentarId: true,
        proposicao: { select: { id: true, siglaTipo: true, numero: true, ano: true, ementa: true, dataApresentacao: true, url: true } },
      },
    }),
  ]);

  // Seguidores de cada parlamentar (id do banco) com o início da janela de cada um.
  const seguidores = new Map<string, { usuario: string; desde: Date }[]>();
  for (const s of seguidos) {
    const p = porChave.get(s.chave);
    if (!p) continue;
    const lista = seguidores.get(p.id) ?? [];
    lista.push({ usuario: s.usuario, desde: inicioPara(s.criadoEm, agora) });
    seguidores.set(p.id, lista);
  }
  const nomeDe = new Map(parlamentares.map((p) => [p.id, p.nome]));

  // Uma notificação por pessoa e votação, juntando todos os seguidos que votaram nela.
  const porVotacao = new Map<string, { votacao: (typeof votos)[number]["votacao"]; votos: { nome: string; tipo: (typeof votos)[number]["tipo"] }[] }>();
  for (const v of votos) {
    for (const { usuario, desde: inicio } of seguidores.get(v.parlamentarId) ?? []) {
      if (v.votacao.data < inicio) continue;
      const chave = `${usuario}|${v.votacao.id}`;
      const grupo = porVotacao.get(chave) ?? { votacao: v.votacao, votos: [] };
      grupo.votos.push({ nome: nomeDe.get(v.parlamentarId) ?? "Parlamentar", tipo: v.tipo });
      porVotacao.set(chave, grupo);
    }
  }

  const novas: NovaNotificacao[] = [];
  for (const [chave, { votacao, votos: lista }] of porVotacao) {
    const usuario = chave.slice(0, chave.lastIndexOf("|"));
    novas.push({
      usuario,
      tipo: "VOTO",
      evento: `voto:${votacao.id}`,
      titulo: tituloVotacao(votacao),
      texto: textoVotos(lista),
      url: `/votacoes/${votacao.casa === "CAMARA" ? "camara" : "senado"}/${encodeURIComponent(votacao.idExterno)}`,
      ocorridoEm: votacao.data,
    });
  }

  // Uma notificação por pessoa e projeto, mesmo que ela siga mais de um dos autores.
  const porProjeto = new Map<string, { proposicao: (typeof autorias)[number]["proposicao"]; autores: string[] }>();
  for (const a of autorias) {
    const data = a.proposicao.dataApresentacao;
    if (!data) continue;
    for (const { usuario, desde: inicio } of seguidores.get(a.parlamentarId) ?? []) {
      if (data < inicio) continue;
      const chave = `${usuario}|${a.proposicao.id}`;
      const grupo = porProjeto.get(chave) ?? { proposicao: a.proposicao, autores: [] };
      grupo.autores.push(nomeDe.get(a.parlamentarId) ?? "Parlamentar");
      porProjeto.set(chave, grupo);
    }
  }
  for (const [chave, { proposicao: p, autores }] of porProjeto) {
    const ementa = p.ementa.trim();
    novas.push({
      usuario: chave.slice(0, chave.lastIndexOf("|")),
      tipo: "PROPOSICAO",
      evento: `proposicao:${p.id}`,
      titulo: `${autores.sort((a, b) => a.localeCompare(b, "pt-BR")).join(", ")} apresentou o ${p.siglaTipo} ${p.numero}/${p.ano}`,
      texto: ementa.length > 280 ? `${ementa.slice(0, 279)}…` : ementa,
      url: p.url,
      ocorridoEm: p.dataApresentacao ?? agora,
    });
  }
  return novas;
}

/** Situação atual de um projeto na API da Casa; `null` se não achar. */
async function situacaoAtual({ camara, senado }: ContextoNotificar, chave: string) {
  const c = lerChave(chave);
  if (!c) return null;
  if (c.casa === "senado") {
    const [p] = await senado.processos({ idProcesso: Number(c.id) });
    if (!p) return null;
    // Virar lei é a notícia mais importante; vem antes da situação.
    const situacao = p.normaGerada ? `Virou norma: ${p.normaGerada}` : p.situacaoAtual;
    return {
      estado: estadoDoProjeto(situacao, p.dataSituacaoAtual),
      url: p.codigoMateria ? `https://www25.senado.leg.br/web/atividade/materias/-/materia/${p.codigoMateria}` : null,
    };
  }
  const d = await camara.proposicao(c.id);
  const st = d.statusProposicao;
  // A situação da Câmara muda pouco; o último andamento (tramitação) mostra que o projeto se mexeu.
  const situacao = st?.descricaoSituacao && st.descricaoTramitacao
    ? `${st.descricaoSituacao}. Último andamento: ${st.descricaoTramitacao}`
    : (st?.descricaoSituacao ?? st?.descricaoTramitacao);
  return { estado: estadoDoProjeto(situacao, st?.dataHora), url: `https://www.camara.leg.br/propostas-legislativas/${c.id}` };
}

async function notificacoesDeLeis(ctx: ContextoNotificar) {
  const { prisma, agora = new Date(), log } = ctx;
  const seguidos = await prisma.seguido.findMany({ where: { tipo: "LEI" } });
  const porChave = Map.groupBy(seguidos, (s) => s.chave);
  const novas: NovaNotificacao[] = [];

  for (const [chave, lista] of porChave) {
    let atual: Awaited<ReturnType<typeof situacaoAtual>>;
    try {
      atual = await situacaoAtual(ctx, chave);
    } catch (erro) {
      // Uma API fora do ar não impede os outros projetos; tenta de novo na próxima execução.
      log?.(`${chave}: falha ao consultar (${String(erro)})`);
      continue;
    }
    if (!atual?.estado) continue;
    const estado = atual.estado;

    for (const s of lista) {
      if (s.estado === estado) continue;
      // Primeira checagem: só guarda a situação de partida, sem notificar o que já era assim.
      if (s.estado !== null) {
        novas.push({
          usuario: s.usuario,
          tipo: "LEI",
          evento: `lei:${chave}:${hashCurto(estado)}`,
          titulo: `${s.rotulo} mudou de situação`,
          texto: textoEstado(estado),
          url: atual.url,
          ocorridoEm: (() => {
            const data = estado.split("|")[1];
            return data ? new Date(`${data}T12:00:00Z`) : agora;
          })(),
        });
      }
      await prisma.seguido.update({ where: { id: s.id }, data: { estado } });
    }
  }
  return novas;
}

/** Gera e grava as notificações novas; devolve quantas entraram (as repetidas são ignoradas). */
export async function gerarNotificacoes(ctx: ContextoNotificar) {
  const { prisma, agora = new Date(), log } = ctx;
  const [deParlamentares, deLeis] = await Promise.all([notificacoesDeParlamentares(ctx), notificacoesDeLeis(ctx)]);
  const todas = [...deParlamentares, ...deLeis];
  log?.(`${deParlamentares.length} de parlamentares, ${deLeis.length} de projetos (antes de tirar repetidas)`);

  const { count } = todas.length > 0 ? await prisma.notificacao.createMany({ data: todas, skipDuplicates: true }) : { count: 0 };
  const apagadas = await prisma.notificacao.deleteMany({ where: { criadaEm: { lt: new Date(agora.getTime() - RETENCAO_DIAS * DIA) } } });
  log?.(`${count} notificações novas; ${apagadas.count} antigas apagadas`);
  return count;
}
