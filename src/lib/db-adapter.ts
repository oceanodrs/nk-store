// Escolhe o driver do banco pela URL. Sem imports com "@/" para poder ser
// usado também pelo prisma/seed.ts e por scripts.
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";

export const isPostgresUrl = (url: string) => /^postgres(ql)?:\/\//.test(url);

export function createAdapter(url = process.env.DATABASE_URL ?? "file:./prisma/dev.db") {
  return isPostgresUrl(url) ? new PrismaPg({ connectionString: url }) : new PrismaBetterSqlite3({ url });
}
