import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo/config";
import { resetDemoStore } from "@/lib/demo/reset";
import { expireStaleOrders } from "@/lib/orders";
import { revalidateCatalog } from "@/lib/revalidate";

// o reset recria catálogo e pedidos: pode levar alguns segundos
export const maxDuration = 60;

/**
 * Tarefa diária (Vercel Cron, ver vercel.json):
 * - cancela pedidos com reserva vencida e devolve o estoque;
 * - em DEMO_MODE, volta a loja de demonstração ao estado inicial.
 * A Vercel envia "Authorization: Bearer <CRON_SECRET>".
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  if (isDemoMode()) {
    const result = await resetDemoStore();
    revalidateCatalog();
    return NextResponse.json({ ok: true, demoReset: result });
  }

  const expired = await expireStaleOrders();
  return NextResponse.json({ ok: true, expired });
}
