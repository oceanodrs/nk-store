import { afterEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { demoProducts } from "@/lib/demo/catalog";
import { DemoModeDisabledError, resetDemoStore } from "@/lib/demo/reset";

afterEach(() => {
  delete process.env.DEMO_MODE;
  delete process.env.DEMO_ADMIN_EMAIL;
  delete process.env.DEMO_ADMIN_PASSWORD;
});

describe("reset da loja de demonstração", () => {
  it("se recusa a rodar sem DEMO_MODE (protege uma loja real)", async () => {
    await expect(resetDemoStore()).rejects.toBeInstanceOf(DemoModeDisabledError);
  });

  it("apaga o que visitantes criaram e restaura catálogo, pedidos de exemplo e admin de demonstração", async () => {
    process.env.DEMO_MODE = "true";
    process.env.DEMO_ADMIN_EMAIL = "Demo@NKStore.dev";
    process.env.DEMO_ADMIN_PASSWORD = "demo-1234";

    // um "visitante" bagunça a loja
    const cat = await db.category.create({ data: { name: "Bagunça", slug: "baguncca" } });
    await db.product.create({
      data: { name: "Produto do visitante", slug: "produto-do-visitante", description: "x", price: 100, finalPrice: 100, categoryId: cat.id },
    });
    await db.storeSettings.upsert({ where: { id: 1 }, update: { whatsapp: "5599999999999" }, create: { id: 1, whatsapp: "5599999999999" } });

    const result = await resetDemoStore();
    expect(result.orders).toBe(6);

    expect(await db.product.count()).toBe(demoProducts.length);
    expect(await db.product.findUnique({ where: { slug: "produto-do-visitante" } })).toBeNull();
    expect(await db.category.count()).toBe(4);
    expect((await db.storeSettings.findUniqueOrThrow({ where: { id: 1 } })).whatsapp).toBe("5511900000000");
    expect(await db.coupon.count()).toBe(2);
    expect(await db.user.findUnique({ where: { email: "demo@nkstore.dev" } })).not.toBeNull();

    // pedidos de exemplo em vários status, numerados a partir de NK-000001
    const orders = await db.order.findMany({ orderBy: { id: "asc" }, select: { id: true, status: true } });
    expect(orders.map((o) => o.id)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(orders.map((o) => o.status)).toEqual(["DELIVERED", "SHIPPED", "PICKING", "PAID", "PAID", "AWAITING_PAYMENT"]);

    // pode rodar de novo (todo dia) com o mesmo resultado
    await resetDemoStore();
    expect(await db.order.count()).toBe(6);
    expect((await db.order.findFirstOrThrow({ orderBy: { id: "asc" } })).id).toBe(1);
    expect(await db.product.count()).toBe(demoProducts.length);
    // dois resets completos (catálogo + pedidos + hash de senha) levam alguns segundos
  }, 30_000);
});
