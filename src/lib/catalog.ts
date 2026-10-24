import "server-only";
import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { normalizeSearch } from "@/lib/product-fields";
import { PAGE_SIZE, PRICE_RANGES, type CatalogFilters } from "@/lib/validators/catalog";

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

/** Variante com unidades disponíveis (estoque maior que o reservado). */
const availableVariant = () => ({ stock: { gt: db.productVariant.fields.reserved } });

export async function listProducts(f: CatalogFilters) {
  const range = PRICE_RANGES.find((r) => r.value === f.preco);
  const terms = f.q ? normalizeSearch(f.q).split(" ").filter(Boolean).slice(0, 6) : [];

  const where: Prisma.ProductWhereInput = {
    active: true,
    category: { active: true, ...(f.categoria ? { slug: f.categoria } : {}) },
    AND: [
      ...terms.map((t) => ({ searchText: { contains: t } })),
      ...(f.tamanhos.length ? [{ variants: { some: { size: { in: f.tamanhos }, ...availableVariant() } } }] : []),
      ...(range ? [{ finalPrice: { ...(range.min != null && { gte: range.min }), ...(range.max != null && { lte: range.max }) } }] : []),
      ...(f.promocao ? [{ salePrice: { not: null, lt: db.product.fields.price } }] : []),
    ],
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput[] = {
    relevancia: [{ featured: "desc" as const }, { createdAt: "desc" as const }],
    novidades: [{ createdAt: "desc" as const }],
    "menor-preco": [{ finalPrice: "asc" as const }],
    "maior-preco": [{ finalPrice: "desc" as const }],
    "a-z": [{ name: "asc" as const }],
  }[f.ordem] ?? [{ createdAt: "desc" }];

  const [total, items] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: [...orderBy, { id: "asc" }],
      skip: (f.pagina - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: productCardSelect,
    }),
  ]);

  return { items, total, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export const getCategoryBySlug = cache(async (slug: string) =>
  db.category.findFirst({ where: { slug, active: true } }),
);

export const getProductBySlug = cache(async (slug: string) =>
  db.product.findFirst({
    where: { slug, active: true, category: { active: true } },
    include: {
      category: { select: { name: true, slug: true } },
      images: { orderBy: { position: "asc" }, select: { id: true, url: true, alt: true } },
      variants: { select: { id: true, size: true, stock: true, reserved: true } },
    },
  }),
);

export async function getRelatedProducts(productId: string, categoryId: string, limit = 4) {
  const sameCategory = await db.product.findMany({
    where: { active: true, categoryId, id: { not: productId } },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: productCardSelect,
  });
  if (sameCategory.length >= limit) return sameCategory;
  const others = await db.product.findMany({
    where: { active: true, id: { notIn: [productId, ...sameCategory.map((p) => p.id)] } },
    orderBy: { createdAt: "desc" },
    take: limit - sameCategory.length,
    select: productCardSelect,
  });
  return [...sameCategory, ...others];
}

/** Produto lançado nos últimos 15 dias recebe o selo "Novo". */
export function isNew(createdAt: Date) {
  return Date.now() - createdAt.getTime() < 15 * 24 * 60 * 60 * 1000;
}
