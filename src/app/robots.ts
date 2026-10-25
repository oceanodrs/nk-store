import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // áreas privadas ou sem valor para busca
      disallow: ["/admin", "/api/", "/carrinho", "/checkout", "/pedido/", "/uploads/"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
