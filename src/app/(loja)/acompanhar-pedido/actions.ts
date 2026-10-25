"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { parseOrderNumber } from "@/lib/constants";
import { db } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export type TrackState = { error?: string };

const schema = z.object({
  number: z.string().trim().min(1).max(20),
  email: z.email().max(200).transform((s) => s.toLowerCase().trim()),
});

const GENERIC = "Não encontramos um pedido com esse número e e-mail. Confira os dados.";

export async function trackOrder(_prev: TrackState, form: FormData): Promise<TrackState> {
  const ip = clientIp(await headers());
  const limit = rateLimit(`rastreio:${ip}`, 10, 15 * 60_000);
  if (!limit.ok) return { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." };

  const parsed = schema.safeParse({ number: form.get("number") ?? "", email: form.get("email") ?? "" });
  const id = parsed.success ? parseOrderNumber(parsed.data.number) : null;
  if (!parsed.success || !id) return { error: GENERIC };

  // número + e-mail precisam bater; a resposta é a mesma para "não existe" e "e-mail errado"
  const order = await db.order.findFirst({
    where: { id, customerEmail: parsed.data.email },
    select: { accessToken: true },
  });
  if (!order) return { error: GENERIC };

  redirect(`/pedido/detalhes?token=${order.accessToken}`);
}
