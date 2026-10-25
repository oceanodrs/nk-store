import { describe, expect, it } from "vitest";
import { calculateTotals, evaluateCoupon, normalizeCouponCode, type CouponRule } from "@/lib/pricing";

const NOW = new Date("2026-10-25T12:00:00-03:00");

const coupon = (over: Partial<CouponRule> = {}): CouponRule => ({
  code: "TESTE",
  type: "PERCENT",
  value: 10,
  active: true,
  minSubtotal: null,
  startsAt: null,
  expiresAt: null,
  usageLimit: null,
  usedCount: 0,
  ...over,
});

describe("calculateTotals", () => {
  it("soma subtotal, aplica desconto e frete", () => {
    const t = calculateTotals({
      items: [
        { unitPrice: 24990, quantity: 2 },
        { unitPrice: 34990, quantity: 1 },
      ],
      shipping: 1890,
      discount: 5000,
    });
    expect(t).toEqual({ subtotal: 84970, discount: 5000, shipping: 1890, total: 81860 });
  });

  it("nunca deixa o desconto passar do subtotal nem o frete ser negativo", () => {
    const t = calculateTotals({ items: [{ unitPrice: 1000, quantity: 1 }], shipping: -50, discount: 99999 });
    expect(t).toEqual({ subtotal: 1000, discount: 1000, shipping: 0, total: 0 });
  });

  it("funciona sem desconto", () => {
    expect(calculateTotals({ items: [{ unitPrice: 18990, quantity: 1 }], shipping: 0 }).total).toBe(18990);
  });
});

describe("evaluateCoupon", () => {
  it("percentual: arredonda para o centavo mais próximo", () => {
    // 10% de R$ 189,90 = R$ 18,99
    expect(evaluateCoupon(coupon(), 18990, NOW)).toEqual({ ok: true, discount: 1899 });
    // 15% de R$ 199,99 = 29,9985 → R$ 30,00
    expect(evaluateCoupon(coupon({ value: 15 }), 19999, NOW)).toEqual({ ok: true, discount: 3000 });
  });

  it("valor fixo em centavos", () => {
    expect(evaluateCoupon(coupon({ type: "FIXED", value: 2000 }), 15000, NOW)).toEqual({ ok: true, discount: 2000 });
  });

  it("valor fixo maior que o subtotal é limitado ao subtotal", () => {
    expect(evaluateCoupon(coupon({ type: "FIXED", value: 50000 }), 18990, NOW)).toEqual({ ok: true, discount: 18990 });
  });

  it("percentual acima de 100% é tratado como 100%", () => {
    expect(evaluateCoupon(coupon({ value: 150 }), 10000, NOW)).toEqual({ ok: true, discount: 10000 });
  });

  it("recusa cupom inexistente ou inativo", () => {
    expect(evaluateCoupon(null, 10000, NOW).ok).toBe(false);
    expect(evaluateCoupon(coupon({ active: false }), 10000, NOW).ok).toBe(false);
  });

  it("respeita a compra mínima", () => {
    const c = coupon({ type: "FIXED", value: 2000, minSubtotal: 15000 });
    const r = evaluateCoupon(c, 14999, NOW);
    expect(r.ok).toBe(false);
    // o Intl usa espaço não separável entre "R$" e o valor
    if (!r.ok) expect(r.reason).toContain("R$ 150,00");
    expect(evaluateCoupon(c, 15000, NOW).ok).toBe(true);
  });

  it("respeita a validade (início e fim)", () => {
    expect(evaluateCoupon(coupon({ startsAt: new Date("2026-11-01T00:00:00-03:00") }), 10000, NOW)).toEqual({
      ok: false,
      reason: "Este cupom ainda não está valendo.",
    });
    expect(evaluateCoupon(coupon({ expiresAt: new Date("2026-10-24T23:59:59-03:00") }), 10000, NOW)).toEqual({
      ok: false,
      reason: "Este cupom expirou.",
    });
    expect(evaluateCoupon(coupon({ expiresAt: new Date("2026-10-25T23:59:59-03:00") }), 10000, NOW).ok).toBe(true);
  });

  it("respeita o limite de usos", () => {
    expect(evaluateCoupon(coupon({ usageLimit: 3, usedCount: 3 }), 10000, NOW).ok).toBe(false);
    expect(evaluateCoupon(coupon({ usageLimit: 3, usedCount: 2 }), 10000, NOW).ok).toBe(true);
  });

  it("recusa tipo desconhecido", () => {
    expect(evaluateCoupon(coupon({ type: "BRINDE" }), 10000, NOW).ok).toBe(false);
  });
});

describe("normalizeCouponCode", () => {
  it("remove espaços e coloca em maiúsculas", () => {
    expect(normalizeCouponCode("  bem vindo10 ")).toBe("BEMVINDO10");
  });
});
