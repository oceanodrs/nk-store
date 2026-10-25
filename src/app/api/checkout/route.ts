import { NextResponse } from "next/server";
import { jsonError, parseJson, tooManyRequests } from "@/lib/http";
import { cancelOrder, CheckoutError, createOrder } from "@/lib/orders";
import { createPreference, isMercadoPagoConfigured } from "@/lib/payments/mercadopago";
import { db } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { checkoutSchema } from "@/lib/validators/checkout";

export async function POST(req: Request) {
  // 5 pedidos por minuto e 20 por hora por IP
  const ip = clientIp(req.headers);
  const perMinute = rateLimit(`checkout:min:${ip}`, 5, 60_000);
  const perHour = rateLimit(`checkout:hora:${ip}`, 20, 60 * 60_000);
  if (!perMinute.ok || !perHour.ok) return tooManyRequests(Math.max(perMinute.retryAfterSec, perHour.retryAfterSec));

  if (!isMercadoPagoConfigured()) {
    return jsonError("Pagamento indisponível no momento. Tente novamente mais tarde.", 503);
  }

  const parsed = await parseJson(req, checkoutSchema);
  if (parsed.error) return parsed.error;

  let order;
  try {
    // preços, frete e cupom são recalculados no servidor; o navegador só envia ids e quantidades
    order = await createOrder(parsed.data);
  } catch (err) {
    if (err instanceof CheckoutError) return jsonError(err.message, 422, { field: err.field });
    console.error("[checkout] erro ao criar pedido", err);
    return jsonError("Não foi possível finalizar o pedido. Tente novamente.", 500);
  }

  try {
    const pref = await createPreference(order);
    await db.order.update({ where: { id: order.id }, data: { mpPreferenceId: pref.id } });
    return NextResponse.json({ redirectUrl: pref.url, token: order.accessToken });
  } catch (err) {
    console.error("[checkout] erro no Mercado Pago", err);
    // sem link de pagamento o pedido não serve: devolve a reserva
    await cancelOrder(order.id, "Falha ao gerar o pagamento no Mercado Pago.");
    return jsonError("O Mercado Pago não respondeu. Tente novamente em instantes.", 502);
  }
}
