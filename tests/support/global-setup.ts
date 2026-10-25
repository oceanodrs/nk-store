import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";

const DB_FILE = path.resolve(__dirname, "../../prisma/test.db");

/** Recria o banco de testes aplicando as migrações (nunca toca no dev.db). */
export default function setup() {
  rmSync(DB_FILE, { force: true });
  execSync("npx prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: "file:./prisma/test.db" },
  });
  return () => rmSync(DB_FILE, { force: true });
}
