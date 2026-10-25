"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { couponFormSchema, fieldErrors, type FormState } from "@/lib/validators/admin";

export async function saveCoupon(couponId: string | null, _prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = couponFormSchema.safeParse({
    code: form.get("code") ?? "",
    type: form.get("type") ?? "",
    value: form.get("value") ?? "",
    minSubtotal: form.get("minSubtotal") ?? "",
    startsAt: form.get("startsAt") ?? "",
    expiresAt: form.get("expiresAt") ?? "",
    usageLimit: form.get("usageLimit") ?? "",
    active: form.get("active"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: "Confira os campos." };
  const d = parsed.data;

  const owner = await db.coupon.findUnique({ where: { code: d.code }, select: { id: true } });
  if (owner && owner.id !== couponId) return { errors: { code: "Já existe um cupom com este código." } };

  if (couponId) {
    // o código de um cupom já usado não muda (os pedidos guardam o código)
    const current = await db.coupon.findUnique({ where: { id: couponId } });
    if (!current) return { message: "Cupom não encontrado." };
    if (current.usedCount > 0 && current.code !== d.code) {
      return { errors: { code: "Este cupom já foi usado; o código não pode mudar." } };
    }
    await db.coupon.update({ where: { id: couponId }, data: d });
  } else {
    await db.coupon.create({ data: d });
  }
  revalidatePath("/admin/cupons");
  return { ok: true, message: couponId ? "Cupom atualizado." : "Cupom criado." };
}

export async function deleteCoupon(couponId: string): Promise<FormState> {
  await requireAdmin();
  const coupon = await db.coupon.findUnique({ where: { id: couponId } });
  if (!coupon) return { message: "Cupom não encontrado." };
  if (coupon.usedCount > 0) return { message: "Cupom já usado em pedidos: desative em vez de excluir." };
  await db.coupon.delete({ where: { id: couponId } });
  revalidatePath("/admin/cupons");
  return { ok: true, message: "Cupom excluído." };
}
