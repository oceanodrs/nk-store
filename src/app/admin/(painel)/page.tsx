import Link from "next/link";
import { AlertTriangle, Eye, EyeOff, Package } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdminPage } from "@/lib/auth";
import { LOW_STOCK_THRESHOLD, SIZES } from "@/lib/constants";
import { db } from "@/lib/db";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  await requireAdminPage();

  const [active, inactive, lowStock] = await Promise.all([
    db.product.count({ where: { active: true } }),
    db.product.count({ where: { active: false } }),
    db.productVariant.findMany({
      where: { stock: { lte: LOW_STOCK_THRESHOLD }, product: { active: true } },
      select: { size: true, stock: true, reserved: true, product: { select: { id: true, name: true } } },
      orderBy: [{ stock: "asc" }],
    }),
  ]);

  // agrupa os tamanhos com estoque baixo por produto
  const grouped = new Map<string, { name: string; sizes: { size: string; stock: number }[] }>();
  for (const v of lowStock) {
    const g = grouped.get(v.product.id) ?? { name: v.product.name, sizes: [] };
    g.sizes.push({ size: v.size, stock: v.stock - v.reserved });
    grouped.set(v.product.id, g);
  }

  const stats = [
    { label: "Produtos ativos", value: active, icon: Eye },
    { label: "Produtos inativos", value: inactive, icon: EyeOff },
    { label: "Tamanhos com estoque baixo", value: lowStock.length, icon: AlertTriangle },
  ];

  return (
    <>
      <PageHeader title="Dashboard" description="Visão geral da loja. Vendas e pedidos chegam na próxima etapa." />

      <ul className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <li key={label} className="card flex items-center gap-4">
            <span className="grid size-12 place-items-center rounded-2xl bg-lime-soft">
              <Icon className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block text-3xl font-bold">{value}</span>
              <span className="block text-sm text-muted">{label}</span>
            </span>
          </li>
        ))}
      </ul>

      <section className="card mt-6" aria-labelledby="estoque-baixo">
        <div className="flex items-center justify-between gap-4">
          <h2 id="estoque-baixo" className="display text-2xl">
            Estoque baixo
          </h2>
          <span className="text-xs text-muted">Até {LOW_STOCK_THRESHOLD} unidades disponíveis</span>
        </div>
        {grouped.size === 0 ? (
          <p className="mt-4 text-sm text-muted">Nenhum produto com estoque baixo. 🎉</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {[...grouped].map(([id, g]) => (
              <li key={id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <Link href={`/admin/produtos/${id}`} className="flex items-center gap-2 text-sm font-semibold hover:underline">
                  <Package className="size-4 text-muted" aria-hidden /> {g.name}
                </Link>
                <span className="flex flex-wrap gap-1.5">
                  {g.sizes
                    .toSorted((a, b) => SIZES.indexOf(a.size as never) - SIZES.indexOf(b.size as never))
                    .map((s) => (
                      <span
                        key={s.size}
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${s.stock <= 0 ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"}`}
                      >
                        {s.size}: {s.stock <= 0 ? "esgotado" : s.stock}
                      </span>
                    ))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
