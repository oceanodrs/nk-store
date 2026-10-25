import Link from "next/link";
import { ArrowRight, Package } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { StatusBadge } from "@/components/admin/status-badge";
import { requireAdminPage } from "@/lib/auth";
import { formatOrderNumber, LOW_STOCK_THRESHOLD, SIZES, SOLD_STATUSES } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatBRL } from "@/lib/money";
import { expireStaleOrders } from "@/lib/orders";

export const metadata = { title: "Dashboard" };

const TZ = "America/Sao_Paulo";
const PERIODS = [
  { value: "hoje", label: "Hoje", days: 1 },
  { value: "7d", label: "7 dias", days: 7 },
  { value: "30d", label: "30 dias", days: 30 },
] as const;

const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d); // 2026-10-25
const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: TZ });

/** Início do dia (fuso de Brasília) de N-1 dias atrás. */
function periodStart(days: number) {
  const today = dayKey(new Date());
  const start = new Date(`${today}T00:00:00-03:00`);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return start;
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  await requireAdminPage();
  await expireStaleOrders();
  const sp = await searchParams;
  const period = PERIODS.find((p) => p.value === sp.periodo) ?? PERIODS[2];
  const since = periodStart(period.days);
  const chartDays = Math.max(period.days, 7); // "hoje" mostra a última semana no gráfico
  const chartSince = periodStart(chartDays);

  const [paid, awaiting, recent, lowStock] = await Promise.all([
    db.order.findMany({
      where: { status: { in: SOLD_STATUSES }, paidAt: { gte: chartSince } },
      select: { total: true, paidAt: true, items: { select: { quantity: true } } },
    }),
    db.order.aggregate({ where: { status: "AWAITING_PAYMENT" }, _count: { _all: true }, _sum: { total: true } }),
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, customerName: true, total: true, status: true, createdAt: true },
    }),
    db.productVariant.findMany({
      where: { stock: { lte: LOW_STOCK_THRESHOLD + 10 }, product: { active: true } },
      select: { size: true, stock: true, reserved: true, product: { select: { id: true, name: true } } },
    }),
  ]);

  const inPeriod = paid.filter((o) => o.paidAt! >= since);
  const revenue = inPeriod.reduce((n, o) => n + o.total, 0);
  const units = inPeriod.reduce((n, o) => n + o.items.reduce((m, i) => m + i.quantity, 0), 0);
  const ticket = inPeriod.length ? Math.round(revenue / inPeriod.length) : 0;

  // receita por dia para o gráfico
  const byDay = new Map<string, { revenue: number; orders: number }>();
  for (const o of paid) {
    const k = dayKey(o.paidAt!);
    const cur = byDay.get(k) ?? { revenue: 0, orders: 0 };
    byDay.set(k, { revenue: cur.revenue + o.total, orders: cur.orders + 1 });
  }
  const days = Array.from({ length: chartDays }, (_, i) => {
    const d = new Date(chartSince);
    d.setUTCDate(d.getUTCDate() + i);
    const key = dayKey(new Date(d.getTime() + 12 * 3600_000)); // meio-dia evita virar a data
    const [, m, day] = key.split("-");
    return { label: `${day}/${m}`, fullLabel: `${day}/${m}`, ...(byDay.get(key) ?? { revenue: 0, orders: 0 }) };
  });

  // estoque baixo considerando o reservado, agrupado por produto
  const grouped = new Map<string, { name: string; sizes: { size: string; left: number }[] }>();
  for (const v of lowStock) {
    const left = Math.max(0, v.stock - v.reserved);
    if (left > LOW_STOCK_THRESHOLD) continue;
    const g = grouped.get(v.product.id) ?? { name: v.product.name, sizes: [] };
    g.sizes.push({ size: v.size, left });
    grouped.set(v.product.id, g);
  }

  const stats = [
    { label: "Receita", value: formatBRL(revenue), hint: `${inPeriod.length} ${inPeriod.length === 1 ? "pedido pago" : "pedidos pagos"}` },
    { label: "Ticket médio", value: inPeriod.length ? formatBRL(ticket) : "—", hint: "por pedido pago" },
    { label: "Camisas vendidas", value: String(units), hint: "unidades" },
    {
      label: "Aguardando pagamento",
      value: String(awaiting._count._all),
      hint: awaiting._sum.total ? `${formatBRL(awaiting._sum.total)} em aberto` : "nenhum em aberto",
      href: "/admin/pedidos?status=AWAITING_PAYMENT",
    },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Vendas consideram pedidos pagos (não cancelados), pela data do pagamento."
        actions={
          <nav aria-label="Período" className="flex rounded-full border border-line bg-surface p-1">
            {PERIODS.map((p) => (
              <Link
                key={p.value}
                href={`/admin?periodo=${p.value}`}
                aria-current={p.value === period.value ? "page" : undefined}
                className="rounded-full px-3.5 py-1.5 text-sm font-medium transition hover:bg-ink/5 aria-[current=page]:bg-ink aria-[current=page]:text-white"
              >
                {p.label}
              </Link>
            ))}
          </nav>
        }
      />

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const body = (
            <>
              <span className="block text-sm text-muted">{s.label}</span>
              <span className="mt-1 block text-3xl font-bold tracking-tight">{s.value}</span>
              <span className="mt-1 block text-xs text-muted">{s.hint}</span>
            </>
          );
          return (
            <li key={s.label}>
              {s.href ? (
                <Link href={s.href} className="card block h-full transition hover:ring-ink">{body}</Link>
              ) : (
                <div className="card h-full">{body}</div>
              )}
            </li>
          );
        })}
      </ul>

      <section className="card mt-6" aria-labelledby="g-receita">
        <h2 id="g-receita" className="display text-2xl">Receita por dia</h2>
        <p className="mb-5 text-xs text-muted">Últimos {chartDays} dias</p>
        <RevenueChart days={days} />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card" aria-labelledby="g-recentes">
          <div className="flex items-center justify-between">
            <h2 id="g-recentes" className="display text-2xl">Pedidos recentes</h2>
            <Link href="/admin/pedidos" className="inline-flex items-center gap-1 text-sm font-semibold hover:underline">
              Ver todos <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Nenhum pedido ainda.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {recent.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <Link href={`/admin/pedidos/${o.id}`} className="font-mono font-semibold hover:underline">{formatOrderNumber(o.id)}</Link>
                    <p className="truncate text-xs text-muted">{o.customerName} · {dateFmt.format(o.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-semibold">{formatBRL(o.total)}</span>
                    <StatusBadge status={o.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card" aria-labelledby="g-estoque">
          <div className="flex items-center justify-between gap-4">
            <h2 id="g-estoque" className="display text-2xl">Estoque baixo</h2>
            <span className="text-xs text-muted">Até {LOW_STOCK_THRESHOLD} disponíveis</span>
          </div>
          {grouped.size === 0 ? (
            <p className="mt-4 text-sm text-muted">Nenhum produto com estoque baixo.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {[...grouped].map(([id, g]) => (
                <li key={id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <Link href={`/admin/produtos/${id}`} className="flex items-center gap-2 text-sm font-semibold hover:underline">
                    <Package className="size-4 text-muted" aria-hidden /> {g.name}
                  </Link>
                  <span className="flex flex-wrap gap-1.5">
                    {g.sizes
                      .toSorted((a, b) => SIZES.indexOf(a.size as never) - SIZES.indexOf(b.size as never))
                      .map((s) => (
                        <span key={s.size} className={`rounded-full px-2.5 py-1 text-xs font-bold ${s.left <= 0 ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"}`}>
                          {s.size}: {s.left <= 0 ? "esgotado" : s.left}
                        </span>
                      ))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
