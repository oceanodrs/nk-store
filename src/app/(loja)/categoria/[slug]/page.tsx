import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogView } from "@/components/loja/catalog/catalog-view";
import { getCategoryBySlug } from "@/lib/catalog";
import { parseCatalogParams } from "@/lib/validators/catalog";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};
  return {
    title: `Camisas ${category.name}`,
    description: category.description ?? `Camisas de futebol da categoria ${category.name}.`,
    alternates: { canonical: `/categoria/${category.slug}` },
    openGraph: { title: `Camisas ${category.name} | NK STORE`, url: `/categoria/${category.slug}` },
  };
}

export default async function CategoriaPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const filters = parseCatalogParams(await searchParams, category.slug);
  return (
    <CatalogView
      filters={filters}
      basePath={`/categoria/${category.slug}`}
      eyebrow="Categoria"
      title={category.name}
      description={category.description}
    />
  );
}
