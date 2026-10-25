import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Notice, PageHeader } from "@/components/admin/page-header";
import { ShirtImage } from "@/components/shirt-image";
import { requireAdminPage } from "@/lib/auth";
import { LOW_STOCK_THRESHOLD, SIZES } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatBRL } from "@/lib/money";
import { normalizeSearch } from "@/lib/product-fields";
import { ToggleActiveButton } from "./toggle-active-button";

export const metadata = { title: "Produtos" };

type Props = {
  searchParams: Promise<{ q?: string; categoria?: string; status?: string; excluido?: string }>;
};

export default async function AdminProdutosPage({ searchParams }: Props) {
  await requireAdminPage();
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 80) ?? "";
  const status = sp.status === "ativos" || sp.status === "inativos" ? sp.status : "";

  const [categories, products] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    db.product.findMany({
      where: {
        ...(q ? { searchText: { contains: normalizeSearch(q) } } : {}),
        ...(sp.categoria ? { categoryId: sp.categoria } : {}),
        ...(status ? { active: status === "ativos" } : {}),
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        salePrice: true,
        finalPrice: true,
        active: true,
        featured: true,
        category: { select: { name: true } },
        images: { select: { url: true }, orderBy: { position: "asc" }, take: 1 },
        variants: { select: { size: true, stock: true, reserved: true } },
      },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Produtos"
        description={`${products.length} ${products.length === 1 ? "produto" : "produtos"}`}
        actions={
          <Link href="/admin/produtos/novo" className="btn-lime">
            <Plus className="size-4" aria-hidden /> Novo produto
          </Link>
        }
      />
      {sp.excluido && <Notice>Produto excluído.</Notice>}

      <form className="card mb-6 grid gap-3 sm:grid-cols-[1fr_200px_160px_auto]" role="search">
        <div className="relative">
          <label htmlFor="q" className="sr-only">Buscar produto</label>
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input id="q" name="q" defaultValue={q} placeholder="Buscar por nome" className="input pl-9" />
        </div>
        <div>
          <label htmlFor="categoria" className="sr-only">Categoria</label>
          <select id="categoria" name="categoria" defaultValue={sp.categoria ?? ""} className="input">
            <option value="">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="status" className="sr-only">Status</label>
          <select id="status" name="status" defaultValue={status} className="input">
            <option value="">Todos</option>
            <option value="ativos">Ativos</option>
            <option value="inativos">Inativos</option>
          </select>
        </div>
        <button type="submit" className="btn-dark h-11">Filtrar</button>
      </form>

      {products.length === 0 ? (
        <div className="card text-center text-sm text-muted">Nenhum produto encontrado.</div>
      ) : (
        <div className="card overflow-hidden p-0 sm:p-0">
          <table className="w-full text-left text-sm">
            <thead className="hidden border-b border-line bg-paper/60 text-xs uppercase tracking-wider text-muted md:table-header-group">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Produto</th>
                <th scope="col" className="px-3 py-3 font-semibold">Preço</th>
                <th scope="col" className="px-3 py-3 font-semibold">Estoque</th>
                <th scope="col" className="px-3 py-3 font-semibold">Status</th>
                <th scope="col" className="px-5 py-3 text-right font-semibold"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {products.map((p) => {
                const available = p.variants.reduce((n, v) => n + Math.max(0, v.stock - v.reserved), 0);
                const lowSizes = p.variants
                  .map((v) => ({ size: v.size, left: Math.max(0, v.stock - v.reserved) }))
                  .filter((v) => v.left <= LOW_STOCK_THRESHOLD)
                  .toSorted((a, b) => SIZES.indexOf(a.size as never) - SIZES.indexOf(b.size as never));
                return (
                  <tr key={p.id} className="grid grid-cols-[auto_1fr] gap-x-4 px-4 py-4 md:table-row md:p-0">
                    <td className="row-span-3 md:px-5 md:py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-lg bg-line">
                          {p.images[0] && <ShirtImage src={p.images[0].url} alt="" fill sizes="56px" className="object-cover" />}
                        </div>
                        <div className="hidden md:block">
                          <Link href={`/admin/produtos/${p.id}`} className="font-semibold hover:underline">{p.name}</Link>
                          <p className="text-xs text-muted">
                            {p.category.name}
                            {p.featured && " · ★ Destaque"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="md:hidden">
                      <Link href={`/admin/produtos/${p.id}`} className="font-semibold hover:underline">{p.name}</Link>
                      <p className="text-xs text-muted">{p.category.name}</p>
                    </td>
                    <td className="md:px-3 md:py-3">
                      <span className="font-semibold">{formatBRL(p.finalPrice)}</span>
                      {p.finalPrice < p.price && (
                        <span className="ml-1.5 text-xs text-muted line-through">{formatBRL(p.price)}</span>
                      )}
                    </td>
                    <td className="md:px-3 md:py-3">
                      <span>{available} un.</span>
                      {lowSizes.length > 0 && (
                        <span className="block text-xs font-semibold text-warning">
                          Baixo: {lowSizes.map((v) => `${v.size} (${v.left})`).join(", ")}
                        </span>
                      )}
                    </td>
                    <td className="col-start-2 mt-2 flex items-center gap-2 md:mt-0 md:table-cell md:px-3 md:py-3">
                      <ToggleActiveButton productId={p.id} active={p.active} name={p.name} />
                    </td>
                    <td className="col-start-2 md:px-5 md:py-3 md:text-right">
                      <Link href={`/admin/produtos/${p.id}`} className="text-sm font-semibold underline-offset-4 hover:underline">
                        Editar
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
