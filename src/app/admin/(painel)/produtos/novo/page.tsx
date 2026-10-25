import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProductForm } from "../product-form";

export const metadata = { title: "Novo produto" };

export default async function NovoProdutoPage() {
  await requireAdminPage();
  const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } });

  return (
    <>
      <Link href="/admin/produtos" className="text-sm text-muted hover:text-ink">← Produtos</Link>
      <PageHeader title="Novo produto" />
      <ProductForm
        categories={categories}
        values={{
          id: null,
          name: "",
          slug: "",
          categoryId: "",
          description: "",
          price: "",
          salePrice: "",
          weightGrams: 300,
          active: true,
          featured: false,
          stock: {},
          reserved: {},
          images: [],
        }}
      />
    </>
  );
}
