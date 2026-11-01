// Gera prisma/postgres/schema.prisma a partir de prisma/schema.prisma (SQLite).
// Os modelos são idênticos; só mudam o provider do banco e o caminho de saída.
// Rode depois de alterar o schema principal:  npm run db:pg:sync
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function toPostgresSchema(sqliteSchema) {
  const out = sqliteSchema
    .replace('provider = "sqlite"', 'provider = "postgresql"')
    .replace('output   = "../src/generated/prisma"', 'output   = "../../src/generated/prisma"');
  if (out === sqliteSchema) throw new Error("schema.prisma não está no formato esperado (provider/output).");
  return (
    "// ARQUIVO GERADO por scripts/sync-postgres-schema.mjs — não edite à mão.\n" +
    "// Edite prisma/schema.prisma e rode: npm run db:pg:sync\n\n" +
    out
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const src = readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
  mkdirSync(path.join(root, "prisma/postgres"), { recursive: true });
  writeFileSync(path.join(root, "prisma/postgres/schema.prisma"), toPostgresSchema(src));
  console.log("✔ prisma/postgres/schema.prisma atualizado");
}
