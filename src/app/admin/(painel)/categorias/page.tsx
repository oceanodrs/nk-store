import { PageHeader } from "@/components/admin/page-header";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { CategoryForm } from "./category-form";

export const metadata = { title: "Categorias" };

export default async function CategoriasPage() {
  await requireAdminPage();
  const categories = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });

  return (
    <>
      <PageHeader title="Categorias" description="Organize o catálogo. A ordem define a sequência no menu da loja." />

      <section aria-labelledby="nova-categoria" className="mb-10">
        <h2 id="nova-categoria" className="eyebrow mb-3 text-muted">Nova categoria</h2>
        <CategoryForm
          values={{ id: null, name: "", slug: "", description: "", sortOrder: categories.length + 1, active: true, productCount: 0 }}
        />
      </section>

      <section aria-labelledby="lista-categorias">
        <h2 id="lista-categorias" className="eyebrow mb-3 text-muted">Categorias cadastradas ({categories.length})</h2>
        <ul className="space-y-4">
          {categories.map((c) => (
            <li key={c.id}>
              <CategoryForm
                values={{
                  id: c.id,
                  name: c.name,
                  slug: c.slug,
                  description: c.description ?? "",
                  sortOrder: c.sortOrder,
                  active: c.active,
                  productCount: c._count.products,
                }}
              />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
