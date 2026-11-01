import "dotenv/config";
import { defineConfig } from "prisma/config";

// fallback só para permitir `prisma generate` antes de existir um .env
const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";

// SQLite no desenvolvimento; PostgreSQL (Neon) quando a URL for postgres://
// Cada banco tem seu schema e suas migrações (os modelos são os mesmos).
const isPostgres = /^postgres(ql)?:\/\//.test(url);

export default defineConfig({
  schema: isPostgres ? "prisma/postgres/schema.prisma" : "prisma/schema.prisma",
  migrations: {
    path: isPostgres ? "prisma/postgres/migrations" : "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // migrações usam a conexão direta do Neon (sem pooler), quando existir
    url: isPostgres ? (process.env.DATABASE_URL_UNPOOLED ?? url) : url,
  },
});
