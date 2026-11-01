import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(path.resolve(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

describe("schema do PostgreSQL", () => {
  it("é igual ao schema principal (SQLite), exceto banco e caminho de saída — rode `npm run db:pg:sync`", () => {
    const sqlite = read("prisma/schema.prisma");
    const postgres = read("prisma/postgres/schema.prisma")
      .replace(/^\/\/ ARQUIVO GERADO[^\n]*\n\/\/ Edite[^\n]*\n\n/, "")
      .replace('provider = "postgresql"', 'provider = "sqlite"')
      .replace('output   = "../../src/generated/prisma"', 'output   = "../src/generated/prisma"');
    expect(postgres).toBe(sqlite);
  });

  it("tem migração inicial para PostgreSQL com todas as tabelas", () => {
    const sql = read("prisma/postgres/migrations/0_inicial/migration.sql");
    for (const table of ["User", "Category", "Product", "ProductImage", "ProductVariant", "Customer", "Order", "OrderItem", "OrderStatusHistory", "Coupon", "StoreSettings", "WebhookEvent"]) {
      expect(sql).toContain(`CREATE TABLE "${table}"`);
    }
  });
});
