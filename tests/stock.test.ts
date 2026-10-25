import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { commitReservedStock, OutOfStockError, releaseReservedStock, reserveStock, takeAvailableStock } from "@/lib/stock";
import { makeVariant, variantState } from "./support/factories";

describe("reserveStock", () => {
  it("reserva quando há unidades disponíveis (estoque − reservado)", async () => {
    const v = await makeVariant({ stock: 5, reserved: 2 });
    await db.$transaction((tx) => reserveStock(tx, [{ variantId: v.id, quantity: 3 }]));
    expect(await variantState(v.id)).toEqual({ stock: 5, reserved: 5 });
  });

  it("recusa vender acima do estoque e desfaz a transação inteira", async () => {
    const a = await makeVariant({ stock: 10 });
    const b = await makeVariant({ stock: 1 });
    await expect(
      db.$transaction((tx) =>
        reserveStock(tx, [
          { variantId: a.id, quantity: 2 },
          { variantId: b.id, quantity: 2 }, // falta estoque aqui
        ]),
      ),
    ).rejects.toBeInstanceOf(OutOfStockError);
    // a reserva do primeiro item também foi desfeita
    expect(await variantState(a.id)).toEqual({ stock: 10, reserved: 0 });
    expect(await variantState(b.id)).toEqual({ stock: 1, reserved: 0 });
  });

  it("duas compras simultâneas pela última unidade: só uma consegue", async () => {
    const v = await makeVariant({ stock: 1 });
    const attempt = () => db.$transaction((tx) => reserveStock(tx, [{ variantId: v.id, quantity: 1 }]));
    const results = await Promise.allSettled([attempt(), attempt()]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    expect(await variantState(v.id)).toEqual({ stock: 1, reserved: 1 });
  });
});

describe("commitReservedStock (pagamento confirmado)", () => {
  it("baixa o estoque e consome a reserva", async () => {
    const v = await makeVariant({ stock: 8, reserved: 3 });
    await db.$transaction((tx) => commitReservedStock(tx, [{ variantId: v.id, quantity: 3 }]));
    expect(await variantState(v.id)).toEqual({ stock: 5, reserved: 0 });
  });

  it("não baixa o que não estava reservado", async () => {
    const v = await makeVariant({ stock: 8, reserved: 0 });
    await expect(db.$transaction((tx) => commitReservedStock(tx, [{ variantId: v.id, quantity: 1 }]))).rejects.toBeInstanceOf(
      OutOfStockError,
    );
    expect(await variantState(v.id)).toEqual({ stock: 8, reserved: 0 });
  });
});

describe("releaseReservedStock (cancelado/expirado)", () => {
  it("devolve a reserva sem mexer no estoque", async () => {
    const v = await makeVariant({ stock: 4, reserved: 2 });
    await db.$transaction((tx) => releaseReservedStock(tx, [{ variantId: v.id, quantity: 2 }]));
    expect(await variantState(v.id)).toEqual({ stock: 4, reserved: 0 });
  });

  it("nunca deixa a reserva negativa", async () => {
    const v = await makeVariant({ stock: 4, reserved: 1 });
    await db.$transaction((tx) => releaseReservedStock(tx, [{ variantId: v.id, quantity: 5 }]));
    expect(await variantState(v.id)).toEqual({ stock: 4, reserved: 0 });
  });
});

describe("takeAvailableStock (pago após a reserva expirar)", () => {
  it("baixa do disponível quando ainda há unidades", async () => {
    const v = await makeVariant({ stock: 3, reserved: 1 });
    await db.$transaction((tx) => takeAvailableStock(tx, [{ variantId: v.id, quantity: 2 }]));
    expect(await variantState(v.id)).toEqual({ stock: 1, reserved: 1 });
  });

  it("recusa se o disponível não cobre a quantidade", async () => {
    const v = await makeVariant({ stock: 3, reserved: 2 });
    await expect(db.$transaction((tx) => takeAvailableStock(tx, [{ variantId: v.id, quantity: 2 }]))).rejects.toBeInstanceOf(
      OutOfStockError,
    );
  });
});
