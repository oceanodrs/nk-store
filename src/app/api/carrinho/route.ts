import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseJson, tooManyRequests } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { cartValidateSchema } from "@/lib/validators/cart";

/**
 * Revalida o carrinho guardado no navegador: devolve preço atual,
 * disponibilidade e os outros tamanhos de cada produto.
 * Os valores do navegador são só para exibição; o checkout recalcula tudo.
 */
export async function POST(req: Request) {
  const limit = rateLimit(`carrinho:${clientIp(req.headers)}`, 60, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec);

  const parsed = await parseJson(req, cartValidateSchema);
  if (parsed.error) return parsed.error;

  const variants = await db.productVariant.findMany({
    where: { id: { in: parsed.data.items.map((i) => i.variantId) } },
    select: {
      id: true,
      size: true,
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          active: true,
          finalPrice: true,
          price: true,
          category: { select: { active: true } },
          images: { select: { url: true }, orderBy: { position: "asc" }, take: 1 },
          variants: { select: { id: true, size: true, stock: true, reserved: true } },
        },
      },
    },
  });

  const items = variants.map((v) => {
    const p = v.product;
    const sizes = p.variants.map((s) => ({
      variantId: s.id,
      size: s.size,
      available: Math.max(0, s.stock - s.reserved),
    }));
    return {
      variantId: v.id,
      productId: p.id,
      name: p.name,
      slug: p.slug,
      size: v.size,
      image: p.images[0]?.url ?? null,
      unitPrice: p.finalPrice,
      listPrice: p.price,
      active: p.active && p.category.active,
      available: sizes.find((s) => s.variantId === v.id)?.available ?? 0,
      sizes,
    };
  });

  return NextResponse.json({ items });
}
