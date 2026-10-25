import "server-only";
import type { Prisma } from "@/generated/prisma/client";

// Movimentações de estoque. Cada uma é um UPDATE atômico com condição no WHERE:
// se duas compras disputam a última unidade, só uma consegue (a outra afeta 0 linhas).
//   reservar   → ao criar o pedido (reserved += qtd), só se houver disponível
//   confirmar  → pagamento aprovado (stock -= qtd, reserved -= qtd)
//   liberar    → pedido cancelado/expirado (reserved -= qtd)
// O SQL usado é compatível com SQLite e PostgreSQL.

type Tx = Prisma.TransactionClient;
export type StockLine = { variantId: string; quantity: number };

export class OutOfStockError extends Error {
  constructor(public variantId: string) {
    super("Estoque insuficiente.");
  }
}

/** Reserva unidades. Lança OutOfStockError (e a transação é desfeita) se faltar estoque. */
export async function reserveStock(tx: Tx, lines: StockLine[]) {
  for (const { variantId, quantity } of lines) {
    const updated = await tx.$executeRaw`
      UPDATE "ProductVariant"
      SET "reserved" = "reserved" + ${quantity}
      WHERE "id" = ${variantId} AND "stock" - "reserved" >= ${quantity}`;
    if (updated !== 1) throw new OutOfStockError(variantId);
  }
}

/** Pagamento confirmado: baixa o estoque e consome a reserva. */
export async function commitReservedStock(tx: Tx, lines: StockLine[]) {
  for (const { variantId, quantity } of lines) {
    const updated = await tx.$executeRaw`
      UPDATE "ProductVariant"
      SET "stock" = "stock" - ${quantity}, "reserved" = "reserved" - ${quantity}
      WHERE "id" = ${variantId} AND "reserved" >= ${quantity} AND "stock" >= ${quantity}`;
    if (updated !== 1) throw new OutOfStockError(variantId);
  }
}

/** Pedido cancelado/expirado: devolve as unidades reservadas. */
export async function releaseReservedStock(tx: Tx, lines: StockLine[]) {
  for (const { variantId, quantity } of lines) {
    await tx.$executeRaw`
      UPDATE "ProductVariant"
      SET "reserved" = CASE WHEN "reserved" >= ${quantity} THEN "reserved" - ${quantity} ELSE 0 END
      WHERE "id" = ${variantId}`;
  }
}

/**
 * Pagamento aprovado depois que a reserva já tinha sido liberada (pedido expirado):
 * tenta baixar direto do disponível. Lança OutOfStockError se não houver mais unidades.
 */
export async function takeAvailableStock(tx: Tx, lines: StockLine[]) {
  for (const { variantId, quantity } of lines) {
    const updated = await tx.$executeRaw`
      UPDATE "ProductVariant"
      SET "stock" = "stock" - ${quantity}
      WHERE "id" = ${variantId} AND "stock" - "reserved" >= ${quantity}`;
    if (updated !== 1) throw new OutOfStockError(variantId);
  }
}
