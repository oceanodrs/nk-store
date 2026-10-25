import { NextResponse } from "next/server";
import { expireStaleOrders } from "@/lib/orders";

/**
 * Cancela pedidos com reserva vencida e devolve o estoque.
 * Na Vercel é chamado pelo Vercel Cron (vercel.json), que envia
 * "Authorization: Bearer <CRON_SECRET>". Também roda a cada novo checkout.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const expired = await expireStaleOrders();
  return NextResponse.json({ ok: true, expired });
}
