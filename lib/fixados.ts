import "server-only";

import { db } from "@/lib/db";
import type { TipoFixado } from "@/lib/generated/prisma/enums";
import { getSession } from "@/lib/session";

// Atalhos fixados por quem está logado (parlamentar, partido, bancada). São dados pessoais:
// estas funções leem a sessão a cada chamada e nunca devem ser chamadas dentro de "use cache",
// senão a lista de uma pessoa ficaria no cache e apareceria para outra.

export type { TipoFixado };

/** Máximo de fixados por pessoa: mantém a barra de atalhos e os filtros utilizáveis. */
export const LIMITE_FIXADOS = 50;

/** Chave do parlamentar no Fixado: a mesma usada na lista ("camara-204379", "senado-5672"). */
export const chaveParlamentar = (p: { casa: "camara" | "senado"; id: number | string }) => `${p.casa}-${p.id}`;

/** Identificador do dono: o e-mail do Google, em minúsculas (o login é stateless, sem tabela de usuários). */
export const donoDa = (sessao: { user: { email: string } }) => sessao.user.email.trim().toLowerCase();

export interface Fixados {
  parlamentares: { chave: string; rotulo: string }[];
  partidos: { chave: string; rotulo: string }[];
  bancadas: { chave: string; rotulo: string }[];
  /** Já chegou a `LIMITE_FIXADOS`: só dá para desafixar. */
  noLimite: boolean;
  /** Consulta rápida: `tem("PARTIDO", "PL")`. */
  tem: (tipo: TipoFixado, chave: string) => boolean;
}

/** Fixados de quem está logado, em ordem de criação; `null` para visitantes. */
export async function getFixados(): Promise<Fixados | null> {
  const sessao = await getSession();
  if (!sessao) return null;

  const linhas = await db.fixado.findMany({
    where: { usuario: donoDa(sessao) },
    orderBy: { criadoEm: "asc" },
    select: { tipo: true, chave: true, rotulo: true },
  });
  const chaves = new Set(linhas.map((l) => `${l.tipo}:${l.chave}`));
  const doTipo = (tipo: TipoFixado) => linhas.filter((l) => l.tipo === tipo).map(({ chave, rotulo }) => ({ chave, rotulo }));

  return {
    parlamentares: doTipo("PARLAMENTAR"),
    partidos: doTipo("PARTIDO"),
    bancadas: doTipo("BANCADA"),
    noLimite: linhas.length >= LIMITE_FIXADOS,
    tem: (tipo, chave) => chaves.has(`${tipo}:${chave}`),
  };
}
