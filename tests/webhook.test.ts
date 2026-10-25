import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import type { VerifiedPayment } from "@/lib/payments/mercadopago";
import { makeAwaitingOrder, makeVariant, variantState } from "./support/factories";

// A API do Mercado Pago é simulada: cada teste define o que "o MP responde".
const mpPayments = new Map<string, VerifiedPayment>();
vi.mock("@/lib/payments/mercadopago", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/payments/mercadopago")>();
  return {
    ...original,
    getPayment: vi.fn(async (id: string) => {
      const p = mpPayments.get(id);
      if (!p) throw Object.assign(new Error("not found"), { status: 404 });
      return p;
    }),
  };
});

const { POST } = await import("@/app/api/webhooks/mercadopago/route");

let n = 0;
const nextPaymentId = () => String(900000000000 + ++n);

function notify(paymentId: string, headers: Record<string, string> = {}) {
  return POST(
    new Request(`http://localhost/api/webhooks/mercadopago?data.id=${paymentId}&type=payment`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${n}`, ...headers },
      body: JSON.stringify({ action: "payment.updated", type: "payment", data: { id: paymentId } }),
    }),
  );
}

function payment(over: Partial<VerifiedPayment> & { externalReference: string; amount: number }): VerifiedPayment {
  return { id: nextPaymentId(), status: "approved", currency: "BRL", paymentTypeId: "credit_card", paymentMethodId: "visa", ...over };
}

async function scenario(opts: { stock?: number; quantity?: number; unitPrice?: number; shipping?: number } = {}) {
  const variant = await makeVariant({ stock: opts.stock ?? 5 });
  const order = await makeAwaitingOrder({
    variantId: variant.id,
    quantity: opts.quantity ?? 2,
    unitPrice: opts.unitPrice ?? 10000,
    shipping: opts.shipping ?? 1890,
  });
  return { variant, order };
}

const orderStatus = async (id: number) => (await db.order.findUniqueOrThrow({ where: { id } })).status;

beforeEach(() => {
  mpPayments.clear();
  delete process.env.MP_WEBHOOK_SECRET;
  delete process.env.MP_WEBHOOK_STRICT_SIGNATURE;
});
afterEach(() => vi.clearAllMocks());

describe("webhook do Mercado Pago", () => {
  it("pagamento aprovado e com valor certo: pedido vira Pago e o estoque baixa", async () => {
    const { variant, order } = await scenario();
    const p = payment({ externalReference: String(order.id), amount: order.total });
    mpPayments.set(p.id, p);

    const res = await notify(p.id);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ handled: true, reason: "pago" });
    expect(await orderStatus(order.id)).toBe("PAID");
    expect(await variantState(variant.id)).toEqual({ stock: 3, reserved: 0 });
  });

  it("é idempotente: a mesma notificação repetida não baixa o estoque de novo", async () => {
    const { variant, order } = await scenario();
    const p = payment({ externalReference: String(order.id), amount: order.total });
    mpPayments.set(p.id, p);

    await notify(p.id);
    const second = await notify(p.id);
    expect(await second.json()).toMatchObject({ handled: false, reason: "já processado" });
    expect(await variantState(variant.id)).toEqual({ stock: 3, reserved: 0 });
  });

  it("nunca confia na notificação: valor divergente na API é ignorado", async () => {
    const { variant, order } = await scenario();
    const p = payment({ externalReference: String(order.id), amount: order.total - 1890 }); // sem o frete
    mpPayments.set(p.id, p);

    const res = await notify(p.id);
    expect(await res.json()).toMatchObject({ handled: false, reason: "valor divergente" });
    expect(await orderStatus(order.id)).toBe("AWAITING_PAYMENT");
    expect(await variantState(variant.id)).toEqual({ stock: 5, reserved: 2 });
  });

  it("notificação forjada (pagamento inexistente na API) é ignorada", async () => {
    const res = await notify("123456");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ignored: true });
  });

  it("pagamento recusado mantém o pedido aberto (o cliente pode tentar de novo)", async () => {
    const { order } = await scenario();
    const p = payment({ externalReference: String(order.id), amount: order.total, status: "rejected" });
    mpPayments.set(p.id, p);

    await notify(p.id);
    expect(await orderStatus(order.id)).toBe("AWAITING_PAYMENT");
  });

  it("pagamento cancelado (ex.: Pix/boleto vencido) cancela o pedido e libera a reserva", async () => {
    const { variant, order } = await scenario();
    const p = payment({ externalReference: String(order.id), amount: order.total, status: "cancelled" });
    mpPayments.set(p.id, p);

    await notify(p.id);
    expect(await orderStatus(order.id)).toBe("CANCELED");
    expect(await variantState(variant.id)).toEqual({ stock: 5, reserved: 0 });
  });

  it("conta o uso do cupom só quando o pagamento é confirmado", async () => {
    const coupon = await db.coupon.create({ data: { code: `CUPOM${Date.now()}`, type: "PERCENT", value: 10 } });
    const variant = await makeVariant({ stock: 5 });
    const order = await makeAwaitingOrder({ variantId: variant.id, quantity: 1, unitPrice: 10000, couponCode: coupon.code });
    expect((await db.coupon.findUniqueOrThrow({ where: { id: coupon.id } })).usedCount).toBe(0);

    const p = payment({ externalReference: String(order.id), amount: order.total });
    mpPayments.set(p.id, p);
    await notify(p.id);
    expect((await db.coupon.findUniqueOrThrow({ where: { id: coupon.id } })).usedCount).toBe(1);
  });

  describe("assinatura x-signature", () => {
    const sign = (dataId: string, requestId: string, ts: string, secret: string) =>
      `ts=${ts},v1=${createHmac("sha256", secret).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest("hex")}`;

    it("modo estrito: assinatura inválida é recusada com 401 e nada muda", async () => {
      process.env.MP_WEBHOOK_SECRET = "segredo";
      process.env.MP_WEBHOOK_STRICT_SIGNATURE = "true";
      const { order } = await scenario();
      const p = payment({ externalReference: String(order.id), amount: order.total });
      mpPayments.set(p.id, p);

      const res = await notify(p.id, { "x-signature": sign(p.id, "req-1", "1792896393", "segredo-errado"), "x-request-id": "req-1" });
      expect(res.status).toBe(401);
      expect(await orderStatus(order.id)).toBe("AWAITING_PAYMENT");
    });

    it("modo estrito: assinatura válida é aceita", async () => {
      process.env.MP_WEBHOOK_SECRET = "segredo";
      process.env.MP_WEBHOOK_STRICT_SIGNATURE = "true";
      const { order } = await scenario();
      const p = payment({ externalReference: String(order.id), amount: order.total });
      mpPayments.set(p.id, p);

      const res = await notify(p.id, { "x-signature": sign(p.id, "req-2", "1792896393", "segredo"), "x-request-id": "req-2" });
      expect(res.status).toBe(200);
      expect(await orderStatus(order.id)).toBe("PAID");
    });

    it("modo padrão (sandbox): assinatura inválida não bloqueia, mas o pagamento ainda é conferido na API", async () => {
      process.env.MP_WEBHOOK_SECRET = "segredo";
      const { order } = await scenario();
      const p = payment({ externalReference: String(order.id), amount: order.total + 100 }); // valor errado na API
      mpPayments.set(p.id, p);

      const res = await notify(p.id, { "x-signature": sign(p.id, "req-3", "1792896393", "outro"), "x-request-id": "req-3" });
      expect(res.status).toBe(200);
      expect(await orderStatus(order.id)).toBe("AWAITING_PAYMENT");
    });
  });
});
