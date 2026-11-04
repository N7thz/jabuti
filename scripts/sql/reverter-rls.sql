-- Desfaz a migração 20261104030000_papel_app_rls: tira as policies (regras por linha), desliga o RLS, retira as
-- permissões do portal_app e apaga o papel. Roda como dono do banco, numa transação só:
--   bunx prisma db execute --file scripts/sql/reverter-rls.sql   (usa a DIRECT_URL, ver prisma.config.ts)
--
-- ANTES, em produção: volte a DATABASE_URL da Vercel para a conexão do dono e faça o redeploy. Sem isso, o site
-- perde o acesso ao banco assim que o papel some.
--
-- Também apaga o registro da migração em _prisma_migrations, para `bunx prisma migrate deploy` poder aplicá-la de
-- novo depois. Se a ideia for abandonar a migração de vez, apague também a pasta dela em prisma/migrations/.
--
-- O REVOKE CREATE ON SCHEMA public FROM PUBLIC da migração não é desfeito: no Neon (Postgres 15 ou mais novo) o
-- PUBLIC já não tinha essa permissão.

BEGIN;

-- 1. Todas as policies do schema público que citam o portal_app.
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT pol.polname, c.relname
      FROM pg_policy pol
      JOIN pg_class c ON c.oid = pol.polrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_roles r ON r.oid = ANY (pol.polroles)
     WHERE n.nspname = 'public' AND r.rolname = 'portal_app'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.polname, p.relname);
  END LOOP;
END
$$;

-- 2. RLS desligado em todas as tabelas do schema público (como era antes da migração).
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND c.relrowsecurity
  LOOP
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', t.relname);
  END LOOP;
END
$$;

-- 3. Permissões e o papel.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'portal_app') THEN
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM portal_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM portal_app;
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM portal_app;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM portal_app;
    REVOKE ALL ON SCHEMA public FROM portal_app;
    EXECUTE format('REVOKE ALL ON DATABASE %I FROM portal_app', current_database());
    -- Fecha as conexões do papel. Sem isso, o pooler do Neon guarda as conexões dele abertas e, se o papel for criado
    -- de novo, responde "invalid role OID" até elas expirarem.
    PERFORM pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename = 'portal_app';
    DROP ROLE portal_app;
  END IF;
END
$$;

-- 4. Esquece a migração, para poder aplicá-la de novo.
DELETE FROM "_prisma_migrations" WHERE migration_name = '20261104030000_papel_app_rls';

COMMIT;
