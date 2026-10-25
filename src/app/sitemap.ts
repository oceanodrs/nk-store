import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    db.product.findMany({ where: { active: true, category: { active: true } }, select: { slug: true, updatedAt: true } }),
    db.category.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } }),
  ]);

  const fixed = ["/", "/produtos", "/sobre", "/trocas-e-devolucoes", "/politica-de-privacidade", "/contato", "/faq", "/acompanhar-pedido"];

  return [
    ...fixed.map((path) => ({
      url: absoluteUrl(path),
      changeFrequency: path === "/" || path === "/produtos" ? ("daily" as const) : ("monthly" as const),
      priority: path === "/" ? 1 : path === "/produtos" ? 0.9 : 0.4,
    })),
    ...categories.map((c) => ({
      url: absoluteUrl(`/categoria/${c.slug}`),
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...products.map((p) => ({
      url: absoluteUrl(`/produto/${p.slug}`),
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
