import { NextResponse } from "next/server";
import { jsonError, parseJson, tooManyRequests } from "@/lib/http";
import { CheckoutError, priceCart } from "@/lib/orders";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { couponPreviewSchema } from "@/lib/validators/checkout";

/** Prévia do desconto no checkout. O valor final é recalculado ao criar o pedido. */
export async function POST(req: Request) {
  // limite baixo para dificultar "chutar" códigos de cupom
  const limit = rateLimit(`cupom:${clientIp(req.headers)}`, 10, 10 * 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec);

  const parsed = await parseJson(req, couponPreviewSchema);
  if (parsed.error) return parsed.error;

  try {
    const { subtotal, discount, couponCode } = await priceCart(parsed.data.items, parsed.data.code);
    return NextResponse.json({ code: couponCode, subtotal, discount });
  } catch (err) {
    if (err instanceof CheckoutError) return jsonError(err.message, 422);
    throw err;
  }
}
