import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/admin/status-badge";
import { requireAdminPage } from "@/lib/auth";
import { formatOrderNumber, SOLD_STATUSES } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatCpf, formatPhone } from "@/lib/format";
import { formatBRL } from "@/lib/money";

export const metadata = { title: "Cliente" };

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const customer = await db.customer.findUnique({
    where: { id },
    include: { orders: { orderBy: { createdAt: "desc" }, include: { _count: { select: { items: true } } } } },
  });
  if (!customer) notFound();

  const sold = customer.orders.filter((o) => (SOLD_STATUSES as string[]).includes(o.status));
  const spent = sold.reduce((n, o) => n + o.total, 0);
  const lastAddress = customer.orders[0];

  return (
    <>
      <Link href="/admin/clientes" className="text-sm text-muted hover:text-ink">← Clientes</Link>
      <h1 className="display mb-8 mt-1 text-4xl sm:text-5xl">{customer.name}</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="card" aria-labelledby="c-pedidos">
          <h2 id="c-pedidos" className="display text-2xl">Histórico de pedidos</h2>
          <ul className="mt-3 divide-y divide-line">
            {customer.orders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <Link href={`/admin/pedidos/${o.id}`} className="font-mono font-semibold hover:underline">{formatOrderNumber(o.id)}</Link>
                  <p className="text-xs text-muted">{dateFmt.format(o.createdAt)} · {o._count.items} {o._count.items === 1 ? "item" : "itens"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatBRL(o.total)}</span>
                  <StatusBadge status={o.status} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <aside aria-label="Dados do cliente" className="space-y-6">
          <section className="card text-sm" aria-labelledby="c-dados">
            <h2 id="c-dados" className="display text-2xl">Dados</h2>
            <p className="mt-3"><a href={`mailto:${customer.email}`} className="hover:underline">{customer.email}</a></p>
            {customer.phone && <p>{formatPhone(customer.phone)}</p>}
            {customer.cpf && <p className="text-muted">CPF {formatCpf(customer.cpf)}</p>}
            <p className="mt-2 text-xs text-muted">Cliente desde {dateFmt.format(customer.createdAt)}</p>
            {lastAddress && (
              <p className="mt-3 text-muted">
                Último endereço: {lastAddress.street}, {lastAddress.number} · {lastAddress.city}/{lastAddress.state}
              </p>
            )}
          </section>
          <section className="card text-sm" aria-labelledby="c-resumo">
            <h2 id="c-resumo" className="display text-2xl">Resumo</h2>
            <dl className="mt-3 space-y-1.5">
              <div className="flex justify-between"><dt className="text-muted">Pedidos</dt><dd>{customer.orders.length}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Pedidos pagos</dt><dd>{sold.length}</dd></div>
              <div className="flex justify-between font-semibold"><dt>Total comprado</dt><dd>{formatBRL(spent)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Ticket médio</dt><dd>{sold.length ? formatBRL(Math.round(spent / sold.length)) : "—"}</dd></div>
            </dl>
          </section>
        </aside>
      </div>
    </>
  );
}
