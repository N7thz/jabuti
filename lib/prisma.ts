import { PrismaNeon } from "@prisma/adapter-neon";

import { PrismaClient } from "./generated/prisma/client";

/** Papel (usuário do Postgres) restrito com que o site entra no banco; ver scripts/papel-app.ts. */
export const PAPEL_APP = "portal_app";

/**
 * Cria o cliente Prisma sobre o driver serverless do Neon.
 * Sem `server-only` para poder ser usado pelos scripts de sincronização (bun scripts/sync-*.ts);
 * no app, importe `db` de `@/lib/db`.
 *
 * - Site: `createPrisma()` lê `DATABASE_URL`, a conexão do papel `portal_app`, que só lê os dados públicos, só grava
 *   onde o site grava e só vê os dados pessoais da pessoa avisada (RLS, ver lib/rls.ts).
 * - Scripts de carga: `createPrisma({ dono: true })` prefere `DATABASE_URL_DONO` (a conexão do dono do banco, que
 *   grava em tudo e não segue o RLS). No GitHub Actions ela não existe e a `DATABASE_URL` de lá já é a do dono.
 */
export function createPrisma({ dono = false }: { dono?: boolean } = {}) {
  const connectionString = (dono && process.env.DATABASE_URL_DONO) || process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL não definida. Copie .env.example para .env.local e preencha a conexão do Neon.",
    );
  }
  // Com o papel do site, a carga falharia por falta de permissão, e a checagem de notificações leria os seguidos
  // vazios (RLS) sem avisar. Melhor parar logo.
  if (dono && decodeURIComponent(new URL(connectionString).username) === PAPEL_APP) {
    throw new Error(
      `Os scripts de carga precisam da conexão do dono do banco, não do papel ${PAPEL_APP}. Defina DATABASE_URL_DONO.`,
    );
  }

  return new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
}

export type { PrismaClient };
