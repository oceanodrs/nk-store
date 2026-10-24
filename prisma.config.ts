import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // fallback só para permitir `prisma generate` antes de existir um .env
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  },
});
