import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import type { Prisma } from "@/generated/prisma/client";
import { requireAdminPage } from "@/lib/auth";
import { formatOrderNumber, ORDER_STATUS_LABELS, ORDER_STATUSES, parseOrderNumber } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatBRL } from "@/lib/money";
import { expireStaleOrders } from "@/lib/orders";

export const metadata = { title: "Pedidos" };

const PAGE_SIZE = 20;
const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

type Props = { searchParams: Promise<{ status?: string; q?: string; pagina?: string }> };

export default async function AdminPedidosPage({ searchParams }: Props) {
  await requireAdminPage();
  await expireStaleOrders();
  const sp = await searchParams;
  const status = ORDER_STATUSES.includes(sp.status as never) ? sp.status! : "";
  const q = sp.q?.trim().slice(0, 80) ?? "";
  const page = Math.max(1, Number(sp.pagina) || 1);

  const orderId = q ? parseOrderNumber(q) : null;
  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            ...(orderId ? [{ id: orderId }] : []),
            { customerEmail: { contains: q.toLowerCase() } },
            { customerName: { contains: q } },
          ],
        }
      : {}),
  };

  const [orders, total, counts] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        createdAt: true,
        customerName: true,
        customerEmail: true,
        total: true,
        status: true,
        paymentMethod: true,
        _count: { select: { items: true } },
      },
    }),
    db.order.count({ where }),
    db.order.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const countOf = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const all = counts.reduce((n, c) => n + c._count._all, 0);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (params: Record<string, string | number | undefined>) => {
    const s = new URLSearchParams();
    const merged = { status, q, ...params };
    for (const [k, v] of Object.entries(merged)) if (v) s.set(k, String(v));
    const str = s.toString();
    return `/admin/pedidos${str ? `?${str}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Pedidos" description={`${all} ${all === 1 ? "pedido" : "pedidos"} no total`} />

      <nav aria-label="Filtrar por status" className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-2">
          {[{ value: "", label: "Todos", n: all }, ...ORDER_STATUSES.map((s) => ({ value: s, label: ORDER_STATUS_LABELS[s], n: countOf(s) }))].map((t) => (
            <li key={t.value || "todos"}>
              <Link
                href={link({ status: t.value, pagina: undefined })}
                aria-current={status === t.value ? "page" : undefined}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-line bg-surface px-3.5 py-2 text-sm font-medium transition hover:border-ink aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-white"
              >
                {t.label}
                <span className="text-xs opacity-70">{t.n}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <form className="card mb-6 flex gap-3" role="search">
        {status && <input type="hidden" name="status" value={status} />}
        <div className="relative flex-1">
          <label htmlFor="q" className="sr-only">Buscar pedido</label>
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input id="q" name="q" defaultValue={q} placeholder="Número (NK-000123), e-mail ou nome do cliente" className="input pl-9" />
        </div>
        <button type="submit" className="btn-dark h-11">Buscar</button>
      </form>

      {orders.length === 0 ? (
        <div className="card text-center text-sm text-muted">Nenhum pedido encontrado.</div>
      ) : (
        <div className="card overflow-x-auto p-0 sm:p-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line bg-paper/60 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Pedido</th>
                <th scope="col" className="px-3 py-3 font-semibold">Cliente</th>
                <th scope="col" className="px-3 py-3 font-semibold">Total</th>
                <th scope="col" className="px-3 py-3 font-semibold">Status</th>
                <th scope="col" className="px-5 py-3 font-semibold">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => (
                <tr key={o.id} className="transition hover:bg-paper/60">
                  <td className="px-5 py-3">
                    <Link href={`/admin/pedidos/${o.id}`} className="font-mono font-semibold hover:underline">
                      {formatOrderNumber(o.id)}
                    </Link>
                    <p className="text-xs text-muted">{o._count.items} {o._count.items === 1 ? "item" : "itens"}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium">{o.customerName}</p>
                    <p className="text-xs text-muted">{o.customerEmail}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-semibold">{formatBRL(o.total)}</p>
                    {o.paymentMethod && <p className="text-xs text-muted">{o.paymentMethod}</p>}
                  </td>
                  <td className="px-3 py-3"><StatusBadge status={o.status} /></td>
                  <td className="whitespace-nowrap px-5 py-3 text-muted">{dateFmt.format(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Paginação" className="mt-6 flex items-center justify-center gap-3 text-sm">
          {page > 1 && (
            <Link href={link({ pagina: page - 1 })} className="btn-outline btn-sm" aria-label="Página anterior">
              <ChevronLeft className="size-4" aria-hidden />
            </Link>
          )}
          <span>Página {page} de {pages}</span>
          {page < pages && (
            <Link href={link({ pagina: page + 1 })} className="btn-outline btn-sm" aria-label="Próxima página">
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
