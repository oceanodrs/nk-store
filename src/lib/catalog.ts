import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

/** Campos usados pelos cards de produto em toda a loja. */
export const productCardSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  salePrice: true,
  createdAt: true,
  category: { select: { name: true, slug: true } },
  images: { select: { url: true, alt: true }, orderBy: { position: "asc" }, take: 2 },
  variants: { select: { size: true, stock: true, reserved: true } },
} as const;

export const getStoreSettings = cache(async () => {
  const settings = await db.storeSettings.findUnique({ where: { id: 1 } });
  return (
    settings ?? {
      id: 1,
      storeName: "NK STORE",
      logoUrl: null,
      email: null,
      phone: null,
      whatsapp: null,
      instagram: null,
      address: null,
      originZipCode: "01310100",
      freeShippingThreshold: null,
      updatedAt: new Date(),
    }
  );
});

export const getNavCategories = cache(async () =>
  db.category.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: { name: true, slug: true },
  }),
);

export async function getCategoriesWithCount() {
  const categories = await db.category.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { products: { where: { active: true } } } },
      products: {
        where: { active: true },
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
        take: 1,
        select: { images: { select: { url: true }, orderBy: { position: "asc" }, take: 1 } },
      },
    },
  });
  return categories.map((c) => ({
    name: c.name,
    slug: c.slug,
    description: c.description,
    count: c._count.products,
    image: c.products[0]?.images[0]?.url ?? null,
  }));
}

export async function getFeaturedProducts(limit = 8) {
  return db.product.findMany({
    where: { active: true, featured: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: productCardSelect,
  });
}

export async function getNewArrivals(limit = 8) {
  return db.product.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: productCardSelect,
  });
}

export type ProductCardData = Awaited<ReturnType<typeof getNewArrivals>>[number];

/** Produto lançado nos últimos 15 dias recebe o selo "Novo". */
export function isNew(createdAt: Date) {
  return Date.now() - createdAt.getTime() < 15 * 24 * 60 * 60 * 1000;
}
