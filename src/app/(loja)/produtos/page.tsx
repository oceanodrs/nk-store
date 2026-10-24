import type { Metadata } from "next";
import { CatalogView } from "@/components/loja/catalog/catalog-view";
import { parseCatalogParams } from "@/lib/validators/catalog";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const f = parseCatalogParams(await searchParams);
  return {
    title: f.q ? `Busca: ${f.q}` : "Todas as camisas",
    description: "Camisas de futebol de clubes, seleções, ligas europeias e modelos retrô. Filtre por tamanho e preço.",
    alternates: { canonical: "/produtos" },
    // páginas de busca/filtro não devem ser indexadas como conteúdo duplicado
    robots: f.q || f.tamanhos.length || f.preco ? { index: false, follow: true } : undefined,
  };
}

export default async function ProdutosPage({ searchParams }: Props) {
  const filters = parseCatalogParams(await searchParams);
  return (
    <CatalogView
      filters={filters}
      basePath="/produtos"
      eyebrow={filters.q ? "Resultado da busca" : "Catálogo"}
      title={filters.q ? `“${filters.q}”` : filters.promocao ? "Promoções" : "Todas as camisas"}
    />
  );
}
