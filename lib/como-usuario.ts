import "server-only";

import { db } from "@/lib/db";
import { type ClienteDaPessoa, comoUsuarioNo, type OpcoesTransacao, type TransacaoDaPessoa } from "@/lib/rls";

export type { ClienteDaPessoa, TransacaoDaPessoa };

/**
 * Acesso do site aos dados pessoais (fixados, seguidos, notificações, perfil, listas, empresas vigiadas) em nome de
 * quem está logado. O banco só mostra e só aceita as linhas desse email (RLS, ver lib/rls.ts); sem passar por aqui, as
 * consultas a essas tabelas voltam vazias.
 *
 * `comoUsuario(email).lista.findMany(...)` para uma operação; `comoUsuario(email, async (tx) => ...)` para várias
 * juntas, na mesma transação (com `{ umaPorVez: true }` nas que conferem um teto antes de gravar).
 */
export function comoUsuario(usuario: string): ClienteDaPessoa;
export function comoUsuario<T>(
  usuario: string,
  operacoes: (tx: TransacaoDaPessoa) => Promise<T>,
  opcoes?: OpcoesTransacao,
): Promise<T>;
export function comoUsuario<T>(usuario: string, operacoes?: (tx: TransacaoDaPessoa) => Promise<T>, opcoes?: OpcoesTransacao) {
  return operacoes ? comoUsuarioNo(db, usuario, operacoes, opcoes) : comoUsuarioNo(db, usuario);
}
