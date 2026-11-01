import "server-only";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { isPostgresUrl } from "@/lib/db-adapter";
import { applyVerifiedPayment, createOrder, updateOrderStatus } from "@/lib/orders";
import type { OrderStatus } from "@/lib/constants";
import { demoProducts, productSlug, seedCatalog } from "./catalog";
import { demoAdminCredentials, isDemoMode } from "./config";

export class DemoModeDisabledError extends Error {
  constructor() {
    super("Reset recusado: DEMO_MODE não está ativo. Isso apagaria dados de uma loja real.");
  }
}

/**
 * Volta a loja de demonstração ao estado inicial:
 * apaga pedidos, clientes, eventos e produtos/categorias criados por visitantes,
 * regrava o catálogo e as configurações, recria o admin de demonstração e
 * gera pedidos de exemplo. Só roda com DEMO_MODE=true.
 */
export async function resetDemoStore(opts: { force?: boolean } = {}) {
  if (!isDemoMode() && !opts.force) throw new DemoModeDisabledError();
  const started = Date.now();

  // 1. limpa tudo o que visitantes podem ter criado (na ordem das chaves estrangeiras)
  await db.$transaction([
    db.webhookEvent.deleteMany(),
    db.orderStatusHistory.deleteMany(),
    db.orderItem.deleteMany(),
    db.order.deleteMany(),
    db.customer.deleteMany(),
    db.coupon.deleteMany(),
    db.productImage.deleteMany(),
    db.productVariant.deleteMany(),
    db.product.deleteMany(),
    db.category.deleteMany(),
  ]);
  // numeração dos pedidos volta para NK-000001
  if (isPostgresUrl(process.env.DATABASE_URL ?? "")) {
    await db.$executeRawUnsafe(`ALTER SEQUENCE "Order_id_seq" RESTART WITH 1`);
  } else {
    await db.$executeRawUnsafe(`DELETE FROM sqlite_sequence WHERE name = 'Order'`);
  }

  // 2. catálogo, cupons e configurações originais
  await seedCatalog(db, { resetSettings: true });

  // 3. admin de demonstração (o admin "de verdade", do seed, não é tocado)
  const demo = demoAdminCredentials();
  if (demo) {
    const passwordHash = await bcrypt.hash(demo.password, 10);
    await db.user.upsert({
      where: { email: demo.email.toLowerCase() },
      update: { passwordHash, name: "Visitante (demo)" },
      create: { email: demo.email.toLowerCase(), name: "Visitante (demo)", passwordHash },
    });
  }

  // 4. pedidos de exemplo, para o dashboard e a lista de pedidos terem conteúdo
  const orders = await createSampleOrders();

  // 5. remove fotos enviadas por visitantes (Vercel Blob)
  const removedUploads = await removeUploadedImages();

  return { orders, removedUploads, ms: Date.now() - started };
}

const SAMPLE_CUSTOMERS = [
  { name: "Ana Paula Ribeiro", email: "ana.ribeiro@exemplo.com", zip: "01310100", city: "São Paulo", state: "SP", status: "DELIVERED" },
  { name: "Bruno Carvalho", email: "bruno.c@exemplo.com", zip: "20040002", city: "Rio de Janeiro", state: "RJ", status: "SHIPPED" },
  { name: "Camila Nogueira", email: "camila.n@exemplo.com", zip: "30130010", city: "Belo Horizonte", state: "MG", status: "PICKING" },
  { name: "Diego Martins", email: "diego.m@exemplo.com", zip: "80010000", city: "Curitiba", state: "PR", status: "PAID" },
  { name: "Eduarda Lima", email: "duda.lima@exemplo.com", zip: "90010000", city: "Porto Alegre", state: "RS", status: "PAID" },
  { name: "Felipe Andrade", email: "felipe.a@exemplo.com", zip: "40020000", city: "Salvador", state: "BA", status: "AWAITING_PAYMENT" },
] as const;

const NEXT_STEPS: Record<string, OrderStatus[]> = {
  PAID: [],
  PICKING: ["PICKING"],
  SHIPPED: ["PICKING", "SHIPPED"],
  DELIVERED: ["PICKING", "SHIPPED", "DELIVERED"],
};

async function createSampleOrders() {
  const featured = demoProducts.filter((p) => p.featured).map(productSlug);
  for (const [i, c] of SAMPLE_CUSTOMERS.entries()) {
    const product = await db.product.findUniqueOrThrow({
      where: { slug: featured[i % featured.length] },
      include: { variants: { where: { size: "M" } } },
    });
    const order = await createOrder({
      customer: { name: c.name, email: c.email, phone: "11987654321", cpf: null },
      address: { zipCode: c.zip, street: "Rua Exemplo", number: String(100 + i), complement: null, district: "Centro", city: c.city, state: c.state },
      items: [{ variantId: product.variants[0].id, quantity: i === 0 ? 2 : 1 }],
      shippingOptionId: "simulado:pac",
      couponCode: i === 1 ? "BEMVINDO10" : null,
    });
    // datas espalhadas nos últimos dias, para o gráfico de receita
    const createdAt = new Date(Date.now() - (11 - i * 2) * 24 * 3600_000);
    await db.order.update({ where: { id: order.id }, data: { createdAt } });
    await db.orderStatusHistory.updateMany({ where: { orderId: order.id }, data: { createdAt } });
    if (c.status === "AWAITING_PAYMENT") continue;

    // pagamento de exemplo (no reset não há Mercado Pago envolvido)
    await applyVerifiedPayment({
      id: `demo-${order.id}`,
      status: "approved",
      externalReference: String(order.id),
      amount: order.total,
      currency: "BRL",
      paymentTypeId: i % 2 ? "bank_transfer" : "credit_card",
      paymentMethodId: "demo",
    });
    await db.order.update({ where: { id: order.id }, data: { paidAt: new Date(createdAt.getTime() + 3600_000) } });
    for (const to of NEXT_STEPS[c.status]) {
      await updateOrderStatus({ orderId: order.id, to, trackingCode: to === "SHIPPED" ? `BR${400000000 + i}BR` : undefined });
    }
  }
  return SAMPLE_CUSTOMERS.length;
}

async function removeUploadedImages() {
  // Blob conectado pela Vercel: BLOB_STORE_ID (+ OIDC automático) ou o token antigo
  const hasBlob = process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN;
  if (process.env.STORAGE_DRIVER !== "vercel-blob" || !hasBlob) return 0;
  const { list, del } = await import("@vercel/blob");
  let removed = 0;
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: "produtos/", cursor, limit: 1000 });
    if (page.blobs.length) {
      await del(page.blobs.map((b) => b.url));
      removed += page.blobs.length;
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return removed;
}
