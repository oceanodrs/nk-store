"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { ORDER_STATUSES } from "@/lib/constants";
import { db } from "@/lib/db";
import { applyVerifiedPayment, OrderTransitionError, updateOrderStatus, updateTrackingCode } from "@/lib/orders";
import { findPaymentIdsForOrder, getPayment } from "@/lib/payments/mercadopago";
import { revalidateCatalog } from "@/lib/revalidate";
import type { FormState } from "@/lib/validators/admin";

const statusSchema = z.object({
  to: z.enum(ORDER_STATUSES, "Escolha o novo status."),
  trackingCode: z
    .string()
    .trim()
    .toUpperCase()
    .refine((s) => s === "" || /^[A-Z0-9-]{5,40}$/.test(s), "Código de rastreio inválido.")
    .optional(),
  note: z.string().trim().max(300).optional(),
  restock: z.preprocess((v) => v === "on", z.boolean()),
});

function refresh(orderId: number) {
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin");
}

export async function changeOrderStatus(orderId: number, _prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = statusSchema.safeParse({
    to: form.get("to") ?? "",
    trackingCode: form.get("trackingCode") ?? "",
    note: form.get("note") ?? "",
    restock: form.get("restock"),
  });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  try {
    await updateOrderStatus({ orderId, ...parsed.data });
  } catch (err) {
    if (err instanceof OrderTransitionError) return { message: err.message };
    throw err;
  }
  refresh(orderId);
  // cancelamento com devolução ao estoque muda a vitrine
  if (parsed.data.to === "CANCELED") revalidateCatalog();
  return { ok: true, message: "Status atualizado." };
}

export async function saveTrackingCode(orderId: number, _prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const code = String(form.get("trackingCode") ?? "").trim().toUpperCase();
  if (code && !/^[A-Z0-9-]{5,40}$/.test(code)) return { message: "Código de rastreio inválido." };
  try {
    await updateTrackingCode(orderId, code || null);
  } catch (err) {
    if (err instanceof OrderTransitionError) return { message: err.message };
    throw err;
  }
  refresh(orderId);
  return { ok: true, message: code ? "Código de rastreio salvo." : "Código de rastreio removido." };
}

/** Consulta o Mercado Pago e aplica o pagamento, se houver (útil se um webhook se perdeu). */
export async function verifyOrderPayment(orderId: number): Promise<FormState> {
  await requireAdmin();
  const order = await db.order.findUnique({ where: { id: orderId }, select: { status: true } });
  if (!order) return { message: "Pedido não encontrado." };

  let ids: string[];
  try {
    ids = await findPaymentIdsForOrder(orderId);
  } catch {
    return { message: "Não foi possível consultar o Mercado Pago agora." };
  }
  if (ids.length === 0) return { message: "Nenhum pagamento encontrado no Mercado Pago para este pedido." };

  const results: string[] = [];
  for (const id of ids) {
    const payment = await getPayment(id);
    const r = await applyVerifiedPayment(payment);
    results.push(`${id}: ${payment.status} (${r.reason})`);
  }
  refresh(orderId);
  revalidateCatalog();
  const now = await db.order.findUnique({ where: { id: orderId }, select: { status: true } });
  return {
    ok: now?.status !== order.status,
    message: now?.status !== order.status ? "Pagamento confirmado pelo Mercado Pago." : `Sem mudança. Pagamentos: ${results.join("; ")}`,
  };
}
