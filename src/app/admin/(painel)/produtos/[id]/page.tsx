import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { centsToInput } from "@/lib/money";
import { DeleteProductButton } from "../delete-product-button";
import { ProductForm } from "../product-form";

export const metadata = { title: "Editar produto" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ criado?: string }> };

export default async function EditarProdutoPage({ params, searchParams }: Props) {
  await requireAdminPage();
  const [{ id }, sp] = await Promise.all([params, searchParams]);

  const [product, categories] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: { images: { orderBy: { position: "asc" } }, variants: true },
    }),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!product) notFound();

  return (
    <>
      <Link href="/admin/produtos" className="text-sm text-muted hover:text-ink">← Produtos</Link>
      <PageHeader
        title="Editar produto"
        description={product.name}
        actions={
          <>
            {product.active && (
              <Link href={`/produto/${product.slug}`} target="_blank" className="btn-outline btn-sm">
                <ExternalLink className="size-3.5" aria-hidden /> Ver na loja
              </Link>
            )}
            <DeleteProductButton productId={product.id} name={product.name} />
          </>
        }
      />
      <ProductForm
        initialMessage={sp.criado ? "Produto criado com sucesso." : undefined}
        categories={categories}
        values={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          categoryId: product.categoryId,
          description: product.description,
          price: centsToInput(product.price),
          salePrice: centsToInput(product.salePrice),
          weightGrams: product.weightGrams,
          active: product.active,
          featured: product.featured,
          stock: Object.fromEntries(product.variants.map((v) => [v.size, v.stock])),
          reserved: Object.fromEntries(product.variants.map((v) => [v.size, v.reserved])),
          images: product.images.map((i) => ({ url: i.url, alt: i.alt })),
        }}
      />
    </>
  );
}
