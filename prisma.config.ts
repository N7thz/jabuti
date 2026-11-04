import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: [".env.local", ".env"], quiet: true });

// O CLI (migrate/studio) usa a conexão direta do Neon com o dono do banco; o app usa a conexão com pooling
// (DATABASE_URL) do papel restrito portal_app, que não pode mudar tabelas (ver scripts/papel-app.ts).
// A integração Neon/Vercel entrega a direta como DATABASE_URL_UNPOOLED; migrar pelo pooler quebra
// com "prepared statement already exists", por isso o pooler fica só como último recurso, e o do dono
// (DATABASE_URL_DONO) vem antes da DATABASE_URL, que localmente já é a do portal_app.
export default defineConfig({
  // Um arquivo por escopo em prisma/schema/ (o gerador e a conexão ficam em schema.prisma).
  schema: "prisma/schema",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // `||`, não `??`: variável vazia no .env cai para a próxima.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL_DONO || process.env.DATABASE_URL,
  },
});
