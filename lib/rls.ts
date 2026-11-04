import type { Prisma, PrismaClient } from "./generated/prisma/client";

// RLS ("row level security", segurança por linha) é uma regra do próprio Postgres: além de ter permissão na tabela,
// cada linha só aparece (ou pode ser gravada) se passar numa condição, a "policy". Nas tabelas de dados pessoais a
// condição é `usuario = current_setting('app.usuario', true)`: o banco só mostra as linhas da pessoa cujo email foi
// avisado antes, na mesma transação (ver prisma/migrations/20261104030000_papel_app_rls).
//
// Sem esse aviso, as consultas a essas tabelas voltam VAZIAS, sem erro. Por isso todo acesso do site a elas passa por
// `comoUsuario` (lib/como-usuario.ts). Os scripts de carga entram como dono do banco, que não segue o RLS.
//
// Sem `server-only` para o teste de integração (scripts/testar-rls.ts) usar o mesmo código do site.

/** Modelos com dado pessoal, presos ao email da pessoa pelo RLS. */
export const MODELOS_DA_PESSOA = new Set([
  "Fixado",
  "Seguido",
  "Notificacao",
  "PerfilUsuario",
  "Lista",
  "ItemLista",
  "EmpresaVigiada",
]);

/** Transação em que o banco já sabe quem é a pessoa. */
export type TransacaoDaPessoa = Prisma.TransactionClient;

/** O email vira o identificador do dono, como em `donoDa` (lib/fixados.ts). Vazio é erro de programação. */
function dono(usuario: string) {
  const email = usuario.trim().toLowerCase();
  if (!email) throw new Error("comoUsuario: email vazio; o RLS esconderia todas as linhas.");
  return email;
}

/**
 * Avisa ao banco quem é a pessoa, só até o fim da transação (o terceiro argumento `true` de `set_config`). Precisa ser
 * local: o pooler do Neon reaproveita a mesma conexão para pedidos de outras pessoas a cada transação.
 */
const avisarDono = (cliente: PrismaClient | TransacaoDaPessoa, email: string) =>
  cliente.$executeRaw`SELECT set_config('app.usuario', ${email}, true)`;

function clienteDaPessoa(cliente: PrismaClient, email: string) {
  return cliente.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, args, query }) {
          if (!MODELOS_DA_PESSOA.has(model)) return query(args);
          // Uma transação por operação: primeiro o aviso, depois a consulta, na mesma conexão.
          const [, resultado] = await cliente.$transaction([avisarDono(cliente, email), query(args)]);
          return resultado;
        },
      },
    },
  });
}

export type ClienteDaPessoa = ReturnType<typeof clienteDaPessoa>;

export interface OpcoesTransacao {
  /**
   * Faz as transações da mesma pessoa marcadas assim rodarem uma de cada vez (trava do Postgres que se solta no fim
   * da transação). Use em "confere, conta e grava": sem a trava, dois cliques ao mesmo tempo passariam do teto.
   */
  umaPorVez?: boolean;
}

/**
 * Acesso às tabelas de dados pessoais em nome de `usuario` (o email da sessão).
 *
 * - `comoUsuarioNo(cliente, email)` devolve um cliente em que cada operação roda numa transação própria, com o dono
 *   avisado antes: `comoUsuarioNo(cliente, email).fixado.findMany(...)`.
 * - `comoUsuarioNo(cliente, email, async (tx) => ...)` roda várias operações juntas numa transação só (tudo ou nada,
 *   e uma ida ao banco a menos por operação). Não chame `redirect()` lá dentro: ele desfaria a transação.
 */
export function comoUsuarioNo(cliente: PrismaClient, usuario: string): ClienteDaPessoa;
export function comoUsuarioNo<T>(
  cliente: PrismaClient,
  usuario: string,
  operacoes: (tx: TransacaoDaPessoa) => Promise<T>,
  opcoes?: OpcoesTransacao,
): Promise<T>;
export function comoUsuarioNo<T>(
  cliente: PrismaClient,
  usuario: string,
  operacoes?: (tx: TransacaoDaPessoa) => Promise<T>,
  opcoes: OpcoesTransacao = {},
): ClienteDaPessoa | Promise<T> {
  const email = dono(usuario);
  if (!operacoes) return clienteDaPessoa(cliente, email);
  return cliente.$transaction(async (tx) => {
    await avisarDono(tx, email);
    if (opcoes.umaPorVez) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`rls:${email}`}, 0))`;
    return operacoes(tx);
  });
}
