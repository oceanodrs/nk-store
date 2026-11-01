import { PrismaClient } from "@/generated/prisma/client";
import { createAdapter } from "@/lib/db-adapter";

// SQLite no desenvolvimento, PostgreSQL (Neon) em produção: o adapter é
// escolhido pela DATABASE_URL (veja src/lib/db-adapter.ts e prisma.config.ts).
function createClient() {
  return new PrismaClient({ adapter: createAdapter() });
}

// Reaproveita a conexão entre recarregamentos do `next dev`.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
