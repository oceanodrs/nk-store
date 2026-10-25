import "server-only";
import { randomBytes } from "node:crypto";
import { getStoreSettings } from "@/lib/catalog";
import { formatOrderNumber, ORDER_STATUS_LABELS, STATUS_TRANSITIONS, type OrderStatus } from "@/lib/constants";
import { db } from "@/lib/db";
import { PAYMENT_METHOD_LABELS, type VerifiedPayment } from "@/lib/payments/mercadopago";
import { calculateTotals, evaluateCoupon, normalizeCouponCode } from "@/lib/pricing";
import { quoteShipping } from "@/lib/shipping";
import { commitReservedStock, OutOfStockError, releaseReservedStock, reserveStock, takeAvailableStock } from "@/lib/stock";
import type { CheckoutInput } from "@/lib/validators/checkout";

/** Tempo que as unidades ficam reservadas aguardando o pagamento (cobre boleto). */
export const RESERVATION_HOURS = 72;

export class CheckoutError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
  }
}

/** Junta linhas repetidas do mesmo tamanho e carrega os dados atuais do banco. */
async function loadCartLines(items: { variantId: string; quantity: number }[]) {
  const merged = new Map<string, number>();
  for (const i of items) merged.set(i.variantId, (merged.get(i.variantId) ?? 0) + i.quantity);

  const variants = await db.productVariant.findMany({
    where: { id: { in: [...merged.keys()] } },
    select: {
      id: true,
      size: true,
      stock: true,
      reserved: true,
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          active: true,
          finalPrice: true,
          weightGrams: true,
          category: { select: { active: true } },
          images: { select: { url: true }, orderBy: { position: "asc" }, take: 1 },
        },
      },
    },
  });

  return [...merged].map(([variantId, quantity]) => {
    const v = variants.find((x) => x.id === variantId);
    if (!v || !v.product.active || !v.product.category.active) {
      throw new CheckoutError("Um dos produtos do carrinho não está mais disponível. Revise o carrinho.");
    }
    if (v.stock - v.reserved < quantity) {
      throw new CheckoutError(
        `Estoque insuficiente para ${v.product.name} (tam. ${v.size}). Disponível: ${Math.max(0, v.stock - v.reserved)}.`,
      );
    }
    return {
      variantId,
      quantity,
      size: v.size,
      productId: v.product.id,
      productName: v.product.name,
      productSlug: v.product.slug,
      unitPrice: v.product.finalPrice, // preço SEMPRE do banco
      weightGrams: v.product.weightGrams,
      imageUrl: v.product.images[0]?.url ?? null,
    };
  });
}

/** Calcula subtotal, cupom e total no servidor (usado no checkout e na prévia do cupom). */
export async function priceCart(items: { variantId: string; quantity: number }[], couponCode: string | null) {
  const lines = await loadCartLines(items);
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

  let discount = 0;
  let code: string | null = null;
  if (couponCode) {
    code = normalizeCouponCode(couponCode);
    const coupon = await db.coupon.findUnique({ where: { code } });
    const check = evaluateCoupon(coupon, subtotal);
    if (!check.ok) throw new CheckoutError(check.reason, "couponCode");
    discount = check.discount;
  }
  return { lines, subtotal, discount, couponCode: code };
}

export async function createOrder(input: CheckoutInput) {
  await expireStaleOrders();

  const { lines, discount, couponCode } = await priceCart(input.items, input.couponCode);
  const settings = await getStoreSettings();

  // frete recalculado no servidor; a opção escolhida precisa existir na nova cotação
  const options = await quoteShipping({
    originZip: settings.originZipCode,
    destinationZip: input.address.zipCode,
    freeShippingThreshold: settings.freeShippingThreshold,
    items: lines.map((l) => ({ weightGrams: l.weightGrams, quantity: l.quantity, unitPrice: l.unitPrice })),
  });
  const shipping = options.find((o) => o.id === input.shippingOptionId);
  if (!shipping) throw new CheckoutError("A opção de frete mudou. Escolha o frete novamente.", "shippingOptionId");

  const totals = calculateTotals({ items: lines, shipping: shipping.price, discount });
  if (totals.total <= 0) throw new CheckoutError("Valor do pedido inválido.");

  const { customer, address } = input;
  const accessToken = randomBytes(24).toString("base64url");
  const reservationExpiresAt = new Date(Date.now() + RESERVATION_HOURS * 60 * 60 * 1000);

  try {
    return await db.$transaction(async (tx) => {
      const savedCustomer = await tx.customer.upsert({
        where: { email: customer.email },
        update: { name: customer.name, phone: customer.phone, ...(customer.cpf ? { cpf: customer.cpf } : {}) },
        create: { email: customer.email, name: customer.name, phone: customer.phone, cpf: customer.cpf },
      });

      // reserva primeiro: se faltar estoque, nada é gravado
      await reserveStock(tx, lines);

      return tx.order.create({
        data: {
          accessToken,
          status: "AWAITING_PAYMENT",
          customerId: savedCustomer.id,
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          customerCpf: customer.cpf,
          ...address,
          subtotal: totals.subtotal,
          discount: totals.discount,
          shippingCost: totals.shipping,
          total: totals.total,
          shippingService: `${shipping.name} — ${shipping.company}`,
          shippingDays: shipping.days,
          couponCode,
          reservationExpiresAt,
          items: {
            create: lines.map((l) => ({
              variantId: l.variantId,
              productName: l.productName,
              productSlug: l.productSlug,
              size: l.size,
              unitPrice: l.unitPrice,
              quantity: l.quantity,
              imageUrl: l.imageUrl,
            })),
          },
          history: { create: { toStatus: "AWAITING_PAYMENT", note: "Pedido criado" } },
        },
        include: { items: true },
      });
    });
  } catch (err) {
    if (err instanceof OutOfStockError) {
      throw new CheckoutError("Alguém acabou de comprar a última unidade de um item. Revise o carrinho.");
    }
    throw err;
  }
}

/**
 * Aplica um pagamento JÁ VERIFICADO na API do Mercado Pago ao pedido.
 * Idempotente: pode ser chamado várias vezes para o mesmo pagamento
 * (webhooks repetidos, página de retorno) sem efeito duplicado.
 */
export async function applyVerifiedPayment(payment: VerifiedPayment) {
  const orderId = Number(payment.externalReference);
  if (!Number.isInteger(orderId) || orderId <= 0) return { handled: false, reason: "sem referência do pedido" };

  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return { handled: false, reason: "pedido não encontrado" };

  const lines = order.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }));
  const method = payment.paymentTypeId ? (PAYMENT_METHOD_LABELS[payment.paymentTypeId] ?? payment.paymentTypeId) : null;

  // o valor pago precisa bater com o total calculado no servidor
  if (payment.currency !== "BRL" || payment.amount !== order.total) {
    await addHistory(order.id, order.status, `Pagamento ${payment.id} ignorado: valor ${payment.amount} difere do total ${order.total}.`);
    return { handled: false, reason: "valor divergente" };
  }

  switch (payment.status) {
    case "approved": {
      if (order.status === "AWAITING_PAYMENT") {
        const done = await db.$transaction(async (tx) => {
          // trava otimista: só um processamento consegue mudar o status
          const claimed = await tx.order.updateMany({
            where: { id: order.id, status: "AWAITING_PAYMENT" },
            data: { status: "PAID", paidAt: new Date(), mpPaymentId: payment.id, paymentMethod: method },
          });
          if (claimed.count !== 1) return false;
          await commitReservedStock(tx, lines);
          if (order.couponCode) {
            await tx.coupon.updateMany({ where: { code: order.couponCode }, data: { usedCount: { increment: 1 } } });
          }
          await tx.orderStatusHistory.create({
            data: { orderId: order.id, fromStatus: "AWAITING_PAYMENT", toStatus: "PAID", note: `Pagamento aprovado (${method ?? "Mercado Pago"}) · ID ${payment.id}` },
          });
          return true;
        });
        return { handled: done, reason: done ? "pago" : "já processado" };
      }

      if (order.status === "CANCELED" && !order.paidAt) {
        // pagou depois da reserva expirar: tenta baixar do estoque disponível
        try {
          await db.$transaction(async (tx) => {
            const claimed = await tx.order.updateMany({
              where: { id: order.id, status: "CANCELED", paidAt: null },
              data: { status: "PAID", paidAt: new Date(), mpPaymentId: payment.id, paymentMethod: method },
            });
            if (claimed.count !== 1) return;
            await takeAvailableStock(tx, lines);
            await tx.orderStatusHistory.create({
              data: { orderId: order.id, fromStatus: "CANCELED", toStatus: "PAID", note: `Pagamento aprovado após expiração · ID ${payment.id}` },
            });
          });
          return { handled: true, reason: "pago após expiração" };
        } catch (err) {
          if (!(err instanceof OutOfStockError)) throw err;
          await db.order.update({ where: { id: order.id }, data: { mpPaymentId: payment.id, paymentMethod: method } });
          await addHistory(order.id, "CANCELED", `ATENÇÃO: pagamento ${payment.id} aprovado após cancelamento e sem estoque. Faça o estorno no Mercado Pago.`);
          return { handled: true, reason: "sem estoque: estornar" };
        }
      }
      return { handled: false, reason: "já processado" };
    }

    case "pending":
    case "in_process":
    case "authorized": {
      if (order.status === "AWAITING_PAYMENT" && order.mpPaymentId !== payment.id) {
        await db.order.update({ where: { id: order.id }, data: { mpPaymentId: payment.id, paymentMethod: method } });
        await addHistory(order.id, order.status, `Pagamento iniciado (${method ?? "Mercado Pago"}), aguardando confirmação.`);
      }
      return { handled: true, reason: "pendente" };
    }

    case "rejected": {
      // o cliente pode tentar de novo com outro cartão: o pedido continua aberto
      await addHistory(order.id, order.status, `Pagamento ${payment.id} recusado.`);
      return { handled: true, reason: "recusado" };
    }

    case "cancelled":
    case "refunded":
    case "charged_back": {
      if (order.status === "AWAITING_PAYMENT") {
        await cancelOrder(order.id, `Pagamento ${payment.status} no Mercado Pago.`);
      } else if (order.status !== "CANCELED") {
        await addHistory(order.id, order.status, `ATENÇÃO: pagamento ${payment.id} ${payment.status === "refunded" ? "estornado" : "contestado"}. Verifique o pedido.`);
      }
      return { handled: true, reason: payment.status };
    }

    default:
      return { handled: false, reason: `status ${payment.status} ignorado` };
  }
}

/** Cancela um pedido aguardando pagamento e devolve as unidades reservadas. */
export async function cancelOrder(orderId: number, note: string) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order || order.status === "CANCELED") return false;
    const wasAwaiting = order.status === "AWAITING_PAYMENT";
    const claimed = await tx.order.updateMany({
      where: { id: orderId, status: order.status },
      data: { status: "CANCELED" },
    });
    if (claimed.count !== 1) return false;
    if (wasAwaiting) {
      await releaseReservedStock(tx, order.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })));
    }
    await tx.orderStatusHistory.create({ data: { orderId, fromStatus: order.status, toStatus: "CANCELED", note } });
    return true;
  });
}

export class OrderTransitionError extends Error {}

/**
 * Mudança de status feita pelo painel (separação, envio, entrega, cancelamento).
 * Valida a transição e grava o histórico.
 */
export async function updateOrderStatus(params: {
  orderId: number;
  to: OrderStatus;
  trackingCode?: string | null;
  note?: string | null;
  restock?: boolean;
}) {
  const { orderId, to } = params;
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw new OrderTransitionError("Pedido não encontrado.");

  const from = order.status as OrderStatus;
  if (!STATUS_TRANSITIONS[from]?.includes(to)) {
    throw new OrderTransitionError(`Não é possível mudar de "${ORDER_STATUS_LABELS[from]}" para "${ORDER_STATUS_LABELS[to]}".`);
  }
  const tracking = params.trackingCode?.trim() || order.trackingCode;
  if (to === "SHIPPED" && !tracking) throw new OrderTransitionError("Informe o código de rastreio para marcar como enviado.");

  const lines = order.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }));
  const userNote = params.note?.trim() || null;

  await db.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id: orderId, status: from },
      data: { status: to, trackingCode: tracking },
    });
    if (claimed.count !== 1) throw new OrderTransitionError("O pedido foi alterado por outra pessoa. Recarregue a página.");

    let note = userNote;
    if (to === "CANCELED") {
      if (from === "AWAITING_PAYMENT") {
        await releaseReservedStock(tx, lines);
      } else {
        if (params.restock) {
          // pedido pago cancelado: devolve as unidades ao estoque
          for (const l of lines) {
            await tx.productVariant.update({ where: { id: l.variantId }, data: { stock: { increment: l.quantity } } });
          }
        }
        note = [userNote, params.restock ? "Itens devolvidos ao estoque." : null, "Lembre-se de estornar o pagamento no Mercado Pago."]
          .filter(Boolean)
          .join(" ");
      }
    }
    if (to === "SHIPPED") note = [userNote, `Rastreio: ${tracking}`].filter(Boolean).join(" · ");

    await tx.orderStatusHistory.create({ data: { orderId, fromStatus: from, toStatus: to, note: note ?? "Atualizado pelo painel" } });
  });
}

/** Atualiza só o código de rastreio (sem mudar status). */
export async function updateTrackingCode(orderId: number, trackingCode: string | null) {
  const order = await db.order.findUnique({ where: { id: orderId }, select: { status: true, trackingCode: true } });
  if (!order) throw new OrderTransitionError("Pedido não encontrado.");
  const code = trackingCode?.trim() || null;
  if (code === order.trackingCode) return;
  await db.order.update({ where: { id: orderId }, data: { trackingCode: code } });
  await addHistory(orderId, order.status, code ? `Código de rastreio: ${code}` : "Código de rastreio removido");
}

/** Cancela pedidos cuja reserva venceu sem pagamento. */
export async function expireStaleOrders() {
  const stale = await db.order.findMany({
    where: { status: "AWAITING_PAYMENT", reservationExpiresAt: { lt: new Date() } },
    select: { id: true },
    take: 50,
  });
  for (const o of stale) await cancelOrder(o.id, "Reserva expirada sem pagamento.");
  return stale.length;
}

async function addHistory(orderId: number, status: string, note: string) {
  await db.orderStatusHistory.create({ data: { orderId, fromStatus: status, toStatus: status, note } });
}

/** Dados do pedido para as páginas públicas (acesso só pelo token aleatório). */
export async function getOrderByToken(token: string) {
  if (!/^[\w-]{20,64}$/.test(token)) return null;
  return db.order.findUnique({
    where: { accessToken: token },
    include: { items: true, history: { orderBy: { createdAt: "asc" } } },
  });
}

export type PublicOrder = NonNullable<Awaited<ReturnType<typeof getOrderByToken>>>;
export const orderLabel = (o: { id: number }) => formatOrderNumber(o.id);
export type { OrderStatus };
