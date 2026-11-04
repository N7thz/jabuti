/**
 * Confere a segurança por linha (RLS) do banco. Só lê; não muda nada.
 *
 * RLS ("row level security") é a regra do Postgres que decide, linha a linha, o que cada papel (usuário do banco) vê e
 * grava. O site entra como `portal_app` (ver scripts/papel-app.ts). Este script acusa:
 *   - tabela do schema público sem RLS ligado;
 *   - tabela que o `portal_app` pode ler ou gravar sem nenhuma policy (regra) para ele;
 *   - tabela aberta para PUBLIC (qualquer papel);
 *   - `portal_app` inexistente, com poder de ignorar o RLS ou de superusuário.
 * Sai com código 1 se achar algum problema. Rode depois de toda migração que criar tabela.
 *
 * Uso: bun scripts/conferir-rls.ts   (usa a DIRECT_URL, a conexão do dono)
 */
import { Pool } from "@neondatabase/serverless";

import { PAPEL_APP } from "../lib/prisma";
import { hostDe, urlDiretaDoDono } from "./banco";

interface Tabela {
  tabela: string;
  rls: boolean;
  acesso: string[];
  policies: string[];
  publica: boolean;
}

async function main() {
  const url = urlDiretaDoDono();
  const pool = new Pool({ connectionString: url });
  const problemas: string[] = [];
  try {
    console.log(`Banco: ${hostDe(url)}`);
    const papel = await pool.query<{ rolsuper: boolean; rolbypassrls: boolean; rolcanlogin: boolean }>(
      "SELECT rolsuper, rolbypassrls, rolcanlogin FROM pg_roles WHERE rolname = $1",
      [PAPEL_APP],
    );
    const p = papel.rows[0];
    if (!p) {
      problemas.push(`O papel ${PAPEL_APP} não existe (aplique as migrações).`);
    } else {
      if (p.rolsuper) problemas.push(`${PAPEL_APP} é superusuário.`);
      if (p.rolbypassrls) problemas.push(`${PAPEL_APP} pode ignorar o RLS (BYPASSRLS).`);
      if (!p.rolcanlogin) console.log(`Aviso: ${PAPEL_APP} ainda não tem login (rode scripts/papel-app.ts).`);
    }

    const { rows } = await pool.query<Tabela>(
      `SELECT c.relname AS tabela,
              c.relrowsecurity AS rls,
              CASE WHEN r.oid IS NULL THEN '{}'::text[] ELSE ARRAY(
                SELECT priv FROM unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE']) AS priv
                WHERE has_table_privilege(r.oid, c.oid, priv)
              ) END AS acesso,
              ARRAY(
                SELECT pol.polname || ' (' || CASE pol.polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT'
                  WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' ELSE 'ALL' END || ')'
                FROM pg_policy pol
                WHERE pol.polrelid = c.oid AND (r.oid = ANY (pol.polroles) OR 0::oid = ANY (pol.polroles))
                ORDER BY pol.polname
              ) AS policies,
              EXISTS (SELECT 1 FROM aclexplode(COALESCE(c.relacl, '{}'::aclitem[])) a WHERE a.grantee = 0) AS publica
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         LEFT JOIN pg_roles r ON r.rolname = $1
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
        ORDER BY c.relname`,
      [PAPEL_APP],
    );

    for (const t of rows) {
      const erros: string[] = [];
      if (!t.rls) erros.push("RLS desligado");
      if (t.acesso.length > 0 && t.policies.length === 0) erros.push(`sem policy para ${PAPEL_APP}`);
      if (t.publica) erros.push("aberta para PUBLIC");
      const acesso = t.acesso.length ? t.acesso.join(",") : "sem acesso";
      const situacao = erros.length ? `PROBLEMA: ${erros.join("; ")}` : "ok";
      console.log(`${t.tabela.padEnd(20)} ${acesso.padEnd(28)} ${t.policies.join(", ") || "-"}  → ${situacao}`);
      for (const e of erros) problemas.push(`${t.tabela}: ${e}`);
    }
  } finally {
    await pool.end();
  }

  if (problemas.length) {
    console.error(`\n${problemas.length} problema(s):\n- ${problemas.join("\n- ")}`);
    process.exit(1);
  }
  console.log("\nTudo certo: todas as tabelas com RLS e com policy para o site.");
}

main().catch((erro) => {
  console.error("Falhou:", erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
