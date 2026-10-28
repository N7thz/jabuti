import { PrismaNeon } from "@prisma/adapter-neon";

import { PrismaClient } from "./generated/prisma/client";

/**
 * Cria o cliente Prisma sobre o driver serverless do Neon.
 * Sem `server-only` para poder ser usado pelos scripts de sincronização (bun scripts/sync-*.ts);
 * no app, importe `db` de `@/lib/db`.
 */
export function createPrisma() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL não definida. Copie .env.example para .env.local e preencha a conexão do Neon.",
    );
  }

  return new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
}

export type { PrismaClient };
