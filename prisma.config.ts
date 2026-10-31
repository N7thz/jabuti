import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: [".env.local", ".env"], quiet: true });

// O CLI (migrate/studio) usa a conexão direta do Neon; o app usa a conexão com pooling (DATABASE_URL).
// A integração Neon/Vercel entrega a direta como DATABASE_URL_UNPOOLED; migrar pelo pooler quebra
// com "prepared statement already exists", por isso o pooler fica só como último recurso.
export default defineConfig({
  // Um arquivo por escopo em prisma/schema/ (o gerador e a conexão ficam em schema.prisma).
  schema: "prisma/schema",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
  },
});
