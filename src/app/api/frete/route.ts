import { NextResponse } from "next/server";
import { getStoreSettings } from "@/lib/catalog";
import { db } from "@/lib/db";
import { jsonError, parseJson, tooManyRequests } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { quoteShipping } from "@/lib/shipping";
import { shippingQuoteSchema } from "@/lib/validators/cart";
import { lookupCep } from "@/lib/viacep";

export async function POST(req: Request) {
  const limit = rateLimit(`frete:${clientIp(req.headers)}`, 30, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec);

  const parsed = await parseJson(req, shippingQuoteSchema);
  if (parsed.error) return parsed.error;
  const { cep, items } = parsed.data;

  // peso e preço vêm sempre do banco, nunca do navegador
  const products = await db.product.findMany({
    where: { id: { in: items.map((i) => i.productId) }, active: true },
    select: { id: true, weightGrams: true, finalPrice: true },
  });
  if (products.length === 0) return jsonError("Produto não encontrado.", 404);

  const [lookup, settings] = await Promise.all([lookupCep(cep), getStoreSettings()]);
  if (lookup.status === "not_found") return jsonError("CEP não encontrado. Confira os números.", 422);

  const byId = new Map(products.map((p) => [p.id, p]));
  const options = await quoteShipping({
    originZip: settings.originZipCode,
    destinationZip: cep,
    freeShippingThreshold: settings.freeShippingThreshold,
    items: items
      .filter((i) => byId.has(i.productId))
      .map((i) => {
        const p = byId.get(i.productId)!;
        return { weightGrams: p.weightGrams, unitPrice: p.finalPrice, quantity: i.quantity };
      }),
  });

  return NextResponse.json({
    cep,
    address: lookup.status === "ok" ? lookup.address : null,
    options,
    freeShippingThreshold: settings.freeShippingThreshold,
  });
}
