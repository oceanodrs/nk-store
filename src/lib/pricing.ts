// Regras de preço puras (sem banco): usadas pelo checkout no servidor e cobertas
// por testes automatizados. Todos os valores em centavos.

export type CouponRule = {
  code: string;
  type: string; // PERCENT | FIXED
  value: number;
  active: boolean;
  minSubtotal: number | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  usageLimit: number | null;
  usedCount: number;
};

export type CouponCheck = { ok: true; discount: number } | { ok: false; reason: string };

/** Valida o cupom e calcula o desconto sobre o subtotal dos produtos (o frete não entra). */
export function evaluateCoupon(coupon: CouponRule | null, subtotal: number, now = new Date()): CouponCheck {
  if (!coupon || !coupon.active) return { ok: false, reason: "Cupom inválido." };
  if (coupon.startsAt && now < coupon.startsAt) return { ok: false, reason: "Este cupom ainda não está valendo." };
  if (coupon.expiresAt && now > coupon.expiresAt) return { ok: false, reason: "Este cupom expirou." };
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, reason: "Este cupom atingiu o limite de uso." };
  }
  if (coupon.minSubtotal != null && subtotal < coupon.minSubtotal) {
    const min = (coupon.minSubtotal / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    return { ok: false, reason: `Este cupom vale para compras a partir de ${min}.` };
  }

  let discount = 0;
  if (coupon.type === "PERCENT") {
    const pct = Math.min(100, Math.max(0, coupon.value));
    discount = Math.round((subtotal * pct) / 100);
  } else if (coupon.type === "FIXED") {
    discount = Math.max(0, coupon.value);
  } else {
    return { ok: false, reason: "Cupom inválido." };
  }
  // nunca deixa o valor dos produtos negativo
  return { ok: true, discount: Math.min(discount, subtotal) };
}

export type Totals = { subtotal: number; discount: number; shipping: number; total: number };

export function calculateTotals(params: {
  items: { unitPrice: number; quantity: number }[];
  shipping: number;
  discount?: number;
}): Totals {
  const subtotal = params.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const discount = Math.min(Math.max(0, params.discount ?? 0), subtotal);
  const shipping = Math.max(0, params.shipping);
  return { subtotal, discount, shipping, total: subtotal - discount + shipping };
}

/** Normaliza o código digitado: "  nk20 " => "NK20" */
export const normalizeCouponCode = (code: string) => code.trim().toUpperCase().replace(/\s+/g, "");
