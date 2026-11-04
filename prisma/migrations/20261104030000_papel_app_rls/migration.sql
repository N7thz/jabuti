-- Papel restrito do site e RLS em todas as tabelas.
--
-- Papel ("role") é um usuário do Postgres. O site passa a entrar como `portal_app`, que só pode o que o site precisa:
-- ler os dados públicos e gravar só nas tabelas em que o site grava. O dono do banco (neondb_owner) fica para as
-- migrações e para os scripts de carga (GitHub Actions); como dono das tabelas, ele não segue o RLS.
--
-- RLS ("row level security", segurança por linha): além da permissão na tabela, cada linha precisa passar numa
-- condição (a "policy") para aparecer ou ser gravada. Nos dados pessoais, a condição é a linha ser da pessoa avisada
-- na transação com `set_config('app.usuario', <email>, true)` (lib/rls.ts). Sem esse aviso, o site vê zero linhas.
--
-- Sem FORCE ROW LEVEL SECURITY de propósito: o dono continua vendo tudo (cargas, notificações, migrações).
-- Tabela nova: dar o GRANT de escrita se o site gravar nela, ENABLE ROW LEVEL SECURITY e uma policy TO portal_app
-- (scripts/conferir-rls.ts acusa a que faltar). Para desfazer: scripts/sql/reverter-rls.sql.

-- 1. O papel. Criado sem login só para as policies poderem citá-lo; scripts/papel-app.ts liga o login e a senha.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'portal_app') THEN
    CREATE ROLE portal_app NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

-- 2. Ninguém além do dono mexe na estrutura nem lê tabela por padrão.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;

-- 3. Permissões do site.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'portal_app') THEN
    GRANT USAGE ON SCHEMA public TO portal_app;

    -- Leitura em tudo (o RLS decide quais linhas), menos o histórico de migrações. Ele pode não existir no banco
    -- sombra do `prisma migrate dev`, por isso o to_regclass.
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO portal_app;
    IF to_regclass('public."_prisma_migrations"') IS NOT NULL THEN
      REVOKE ALL ON "_prisma_migrations" FROM portal_app;
    END IF;

    -- Escrita só onde o código do site grava.
    GRANT INSERT, UPDATE, DELETE ON
      "Fixado", "Seguido", "Notificacao", "PerfilUsuario", "Lista", "ItemLista", "EmpresaVigiada",
      "user", "session", "account", "verification", "rateLimit"
    TO portal_app;
    -- Mural de apoiadores: o admin só inclui e apaga nomes.
    GRANT INSERT, DELETE ON "Apoiador" TO portal_app;

    GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO portal_app;

    -- Tabelas e sequences criadas depois pelo dono já nascem legíveis pelo site. O RLS delas é ligado à mão.
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO portal_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO portal_app;
  END IF;
END
$$;

-- 4. Dados pessoais: cada pessoa só vê e só grava as próprias linhas (dono = email em minúsculas, coluna "usuario").
ALTER TABLE "Fixado" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_app_da_pessoa" ON "Fixado" FOR ALL TO portal_app
  USING ("usuario" = NULLIF(current_setting('app.usuario', true), ''))
  WITH CHECK ("usuario" = NULLIF(current_setting('app.usuario', true), ''));

ALTER TABLE "Seguido" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_app_da_pessoa" ON "Seguido" FOR ALL TO portal_app
  USING ("usuario" = NULLIF(current_setting('app.usuario', true), ''))
  WITH CHECK ("usuario" = NULLIF(current_setting('app.usuario', true), ''));

ALTER TABLE "Notificacao" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_app_da_pessoa" ON "Notificacao" FOR ALL TO portal_app
  USING ("usuario" = NULLIF(current_setting('app.usuario', true), ''))
  WITH CHECK ("usuario" = NULLIF(current_setting('app.usuario', true), ''));

ALTER TABLE "PerfilUsuario" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_app_da_pessoa" ON "PerfilUsuario" FOR ALL TO portal_app
  USING ("usuario" = NULLIF(current_setting('app.usuario', true), ''))
  WITH CHECK ("usuario" = NULLIF(current_setting('app.usuario', true), ''));

ALTER TABLE "Lista" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_app_da_pessoa" ON "Lista" FOR ALL TO portal_app
  USING ("usuario" = NULLIF(current_setting('app.usuario', true), ''))
  WITH CHECK ("usuario" = NULLIF(current_setting('app.usuario', true), ''));

ALTER TABLE "EmpresaVigiada" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_app_da_pessoa" ON "EmpresaVigiada" FOR ALL TO portal_app
  USING ("usuario" = NULLIF(current_setting('app.usuario', true), ''))
  WITH CHECK ("usuario" = NULLIF(current_setting('app.usuario', true), ''));

-- O item não tem dono próprio: vale o dono da lista (que o RLS da "Lista" também confere).
ALTER TABLE "ItemLista" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_app_da_pessoa" ON "ItemLista" FOR ALL TO portal_app
  USING (EXISTS (
    SELECT 1 FROM "Lista" l
    WHERE l."id" = "ItemLista"."listaId" AND l."usuario" = NULLIF(current_setting('app.usuario', true), '')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "Lista" l
    WHERE l."id" = "ItemLista"."listaId" AND l."usuario" = NULLIF(current_setting('app.usuario', true), '')
  ));

-- 5. Login (Better Auth). Ele procura a conta pelo email e a sessão pelo token antes de saber quem é a pessoa, então
-- aqui o RLS não separa uma pessoa da outra: libera tudo para o site e fecha para qualquer outro papel.
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_app_login" ON "user" FOR ALL TO portal_app USING (true) WITH CHECK (true);

ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_app_login" ON "session" FOR ALL TO portal_app USING (true) WITH CHECK (true);

ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_app_login" ON "account" FOR ALL TO portal_app USING (true) WITH CHECK (true);

ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_app_login" ON "verification" FOR ALL TO portal_app USING (true) WITH CHECK (true);

-- Também guarda o limite de tentativas do portal (lib/limite.ts), com chaves por IP e por email.
ALTER TABLE "rateLimit" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_app_login" ON "rateLimit" FOR ALL TO portal_app USING (true) WITH CHECK (true);

-- 6. Dados públicos: o site só lê. Quem grava é a carga, como dono.
ALTER TABLE "Parlamentar" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_app_le" ON "Parlamentar" FOR SELECT TO portal_app USING (true);

ALTER TABLE "Votacao" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_app_le" ON "Votacao" FOR SELECT TO portal_app USING (true);

ALTER TABLE "Voto" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_app_le" ON "Voto" FOR SELECT TO portal_app USING (true);

ALTER TABLE "Orientacao" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_app_le" ON "Orientacao" FOR SELECT TO portal_app USING (true);

ALTER TABLE "Evento" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_app_le" ON "Evento" FOR SELECT TO portal_app USING (true);

ALTER TABLE "Presenca" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_app_le" ON "Presenca" FOR SELECT TO portal_app USING (true);

ALTER TABLE "Proposicao" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_app_le" ON "Proposicao" FOR SELECT TO portal_app USING (true);

ALTER TABLE "ProposicaoAutor" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_app_le" ON "ProposicaoAutor" FOR SELECT TO portal_app USING (true);

ALTER TABLE "DespesaCota" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_app_le" ON "DespesaCota" FOR SELECT TO portal_app USING (true);

ALTER TABLE "Emenda" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_app_le" ON "Emenda" FOR SELECT TO portal_app USING (true);

ALTER TABLE "Municipio" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_app_le" ON "Municipio" FOR SELECT TO portal_app USING (true);

ALTER TABLE "Candidatura" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_app_le" ON "Candidatura" FOR SELECT TO portal_app USING (true);

ALTER TABLE "BemDeclarado" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_app_le" ON "BemDeclarado" FOR SELECT TO portal_app USING (true);

ALTER TABLE "ReceitaCampanha" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_app_le" ON "ReceitaCampanha" FOR SELECT TO portal_app USING (true);

ALTER TABLE "VotoMunicipio" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_app_le" ON "VotoMunicipio" FOR SELECT TO portal_app USING (true);

ALTER TABLE "PatrimonioEleicao" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_app_le" ON "PatrimonioEleicao" FOR SELECT TO portal_app USING (true);

ALTER TABLE "SyncRun" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_app_le" ON "SyncRun" FOR SELECT TO portal_app USING (true);

-- Mural de /apoie: público para ler; o painel de admin (/admin/apoiadores) inclui e apaga. Quem é admin o código
-- confere (lib/admin.ts, ADMIN_EMAILS); o banco não tem como saber.
ALTER TABLE "Apoiador" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal_app_le" ON "Apoiador" FOR SELECT TO portal_app USING (true);
CREATE POLICY "portal_app_admin_inclui" ON "Apoiador" FOR INSERT TO portal_app WITH CHECK (true);
CREATE POLICY "portal_app_admin_apaga" ON "Apoiador" FOR DELETE TO portal_app USING (true);

-- 7. Histórico de migrações: só o dono. RLS ligado e nenhuma permissão para o site (se a tabela existir: no banco
-- sombra do `prisma migrate dev` ela pode faltar).
DO $$
BEGIN
  IF to_regclass('public."_prisma_migrations"') IS NOT NULL THEN
    ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
  END IF;
END
$$;
