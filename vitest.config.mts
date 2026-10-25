import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { defineConfig } from "vitest/config";

const TEST_DB = "file:./prisma/test.db";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // o pacote "server-only" só existe para o bundler do Next; nos testes é um módulo vazio
      "server-only": path.resolve(__dirname, "tests/support/empty.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // banco SQLite próprio dos testes, recriado do zero a cada execução
    env: { DATABASE_URL: TEST_DB },
    globalSetup: ["tests/support/global-setup.ts"],
    // os testes de banco compartilham o mesmo arquivo SQLite
    fileParallelism: false,
  },
});
