import Link from "next/link";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdminPage } from "@/lib/auth";
import { SOLD_STATUSES } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatBRL } from "@/lib/money";

export const metadata = { title: "Clientes" };

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" });
const sold = (status: string) => (SOLD_STATUSES as string[]).includes(status);

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdminPage();
  const q = (await searchParams).q?.trim().slice(0, 80) ?? "";

  const customers = await db.customer.findMany({
    where: q ? { OR: [{ name: { contains: q } }, { email: { contains: q.toLowerCase() } }] } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      orders: { select: { total: true, status: true, createdAt: true }, orderBy: { createdAt: "desc" } },
    },
  });

  return (
    <>
      <PageHeader title="Clientes" description="Quem já fez pedido na loja (identificado pelo e-mail)." />

      <form className="card mb-6 flex gap-3" role="search">
        <div className="relative flex-1">
          <label htmlFor="q" className="sr-only">Buscar cliente</label>
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input id="q" name="q" defaultValue={q} placeholder="Nome ou e-mail" className="input pl-9" />
        </div>
        <button type="submit" className="btn-dark h-11">Buscar</button>
      </form>

      {customers.length === 0 ? (
        <div className="card text-center text-sm text-muted">Nenhum cliente encontrado.</div>
      ) : (
        <div className="card overflow-x-auto p-0 sm:p-0">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b border-line bg-paper/60 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Cliente</th>
                <th scope="col" className="px-3 py-3 font-semibold">Pedidos</th>
                <th scope="col" className="px-3 py-3 font-semibold">Total comprado</th>
                <th scope="col" className="px-5 py-3 font-semibold">Último pedido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {customers.map((c) => {
                const paid = c.orders.filter((o) => sold(o.status));
                return (
                  <tr key={c.id} className="transition hover:bg-paper/60">
                    <td className="px-5 py-3">
                      <Link href={`/admin/clientes/${c.id}`} className="font-semibold hover:underline">{c.name}</Link>
                      <p className="text-xs text-muted">{c.email}</p>
                    </td>
                    <td className="px-3 py-3">
                      {c.orders.length}
                      {paid.length !== c.orders.length && <span className="text-xs text-muted"> ({paid.length} pagos)</span>}
                    </td>
                    <td className="px-3 py-3 font-semibold">{formatBRL(paid.reduce((n, o) => n + o.total, 0))}</td>
                    <td className="px-5 py-3 text-muted">{c.orders[0] ? dateFmt.format(c.orders[0].createdAt) : "—"}</td>
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
