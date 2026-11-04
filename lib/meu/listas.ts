import "server-only";

import { comoUsuario } from "@/lib/como-usuario";
import type { TipoItemLista } from "@/lib/generated/prisma/enums";

// Listas privadas de quem está logado. Sempre filtradas pelo dono (e o banco confere de novo, pelo RLS): o id na URL
// não basta.

// Ficam aqui, e não em actions.ts: um arquivo "use server" só pode exportar funções async.
export const LIMITE_LISTAS = 50;
export const LIMITE_ITENS = 500;

export const ROTULO_TIPO: Record<TipoItemLista, string> = {
  VOTACAO: "Votação",
  LEI: "Lei ou projeto",
  EMPRESA: "Empresa",
  EMENDA: "Emenda",
  PARLAMENTAR: "Parlamentar",
  PAGINA: "Página",
};

export function getListas(usuario: string) {
  return comoUsuario(usuario).lista.findMany({
    where: { usuario },
    orderBy: { criadaEm: "desc" },
    select: { id: true, nome: true, criadaEm: true, _count: { select: { itens: true } } },
  });
}

/** Nomes das listas para o "Salvar em lista", e se o item já está em alguma. */
export async function getListasParaSalvar(usuario: string, tipo: TipoItemLista, chave: string) {
  const listas = await comoUsuario(usuario).lista.findMany({
    where: { usuario },
    orderBy: { criadaEm: "desc" },
    select: { id: true, nome: true, itens: { where: { tipo, chave }, select: { id: true } } },
  });
  return listas.map((l) => ({ id: l.id, nome: l.nome, temItem: l.itens.length > 0 }));
}

export function getLista(usuario: string, id: string) {
  return comoUsuario(usuario).lista.findFirst({
    where: { id, usuario },
    select: {
      id: true,
      nome: true,
      criadaEm: true,
      itens: {
        orderBy: { criadoEm: "desc" },
        select: { id: true, tipo: true, chave: true, rotulo: true, url: true, nota: true, criadoEm: true },
      },
    },
  });
}
