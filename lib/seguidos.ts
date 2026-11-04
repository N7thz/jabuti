import "server-only";

import { cache } from "react";

import { comoUsuario } from "@/lib/como-usuario";
import { donoDa } from "@/lib/fixados";
import type { TipoSeguido } from "@/lib/generated/prisma/enums";
import { getSession } from "@/lib/session";

// Parlamentares e projetos seguidos por quem está logado. Seguir gera notificações (scripts/notificar.ts);
// fixar é só atalho. Dados pessoais: estas funções leem a sessão e nunca devem ir para "use cache".

export type { TipoSeguido };

/** Máximo de itens seguidos por pessoa: limita o trabalho da checagem diária e o tamanho do resumo. */
export const LIMITE_SEGUIDOS = 100;

export interface Seguidos {
  parlamentares: { chave: string; rotulo: string }[];
  leis: { chave: string; rotulo: string }[];
  noLimite: boolean;
  tem: (tipo: TipoSeguido, chave: string) => boolean;
}

/**
 * O que quem está logado segue, em ordem de criação; `null` para visitantes. Memorizado por requisição:
 * uma lista com vários botões "Seguir" faz uma consulta só.
 */
export const getSeguidos = cache(async (): Promise<Seguidos | null> => {
  const sessao = await getSession();
  if (!sessao) return null;

  const usuario = donoDa(sessao);
  const linhas = await comoUsuario(usuario).seguido.findMany({
    where: { usuario },
    orderBy: { criadoEm: "asc" },
    select: { tipo: true, chave: true, rotulo: true },
  });
  const chaves = new Set(linhas.map((l) => `${l.tipo}:${l.chave}`));
  const doTipo = (tipo: TipoSeguido) => linhas.filter((l) => l.tipo === tipo).map(({ chave, rotulo }) => ({ chave, rotulo }));

  return {
    parlamentares: doTipo("PARLAMENTAR"),
    leis: doTipo("LEI"),
    noLimite: linhas.length >= LIMITE_SEGUIDOS,
    tem: (tipo, chave) => chaves.has(`${tipo}:${chave}`),
  };
});

/** Quantas notificações ainda não lidas; 0 para visitantes. */
export async function contarNaoLidas() {
  const sessao = await getSession();
  if (!sessao) return 0;
  const usuario = donoDa(sessao);
  return comoUsuario(usuario).notificacao.count({ where: { usuario, lidaEm: null } });
}
