import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import { ShirtImage } from "@/components/shirt-image";
import { requireAdminPage } from "@/lib/auth";
import { formatOrderNumber, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatCep, formatCpf, formatPhone } from "@/lib/format";
import { formatBRL } from "@/lib/money";
import { StatusForm, TrackingForm, VerifyPaymentButton } from "./order-actions";

export const metadata = { title: "Pedido" };

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

export default async function AdminPedidoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: true,
      history: { orderBy: { createdAt: "desc" } },
      customer: { select: { id: true, _count: { select: { orders: true } } } },
    },
  });
  if (!order) notFound();

  return (
    <>
      <Link href="/admin/pedidos" className="text-sm text-muted hover:text-ink">← Pedidos</Link>
      <div className="mb-8 mt-1 flex flex-wrap items-center gap-3">
        <h1 className="display text-4xl sm:text-5xl">{formatOrderNumber(order.id)}</h1>
        <StatusBadge status={order.status} />
        <span className="text-sm text-muted">Feito em {dateFmt.format(order.createdAt)}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="card" aria-labelledby="p-itens">
            <h2 id="p-itens" className="display text-2xl">Itens</h2>
            <ul className="mt-3 divide-y divide-line">
              {order.items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 py-3">
                  <div className="relative aspect-[4/5] w-12 shrink-0 overflow-hidden rounded-lg bg-line">
                    {i.imageUrl && <ShirtImage src={i.imageUrl} alt="" fill sizes="48px" className="object-cover" />}
                  </div>
                  <div className="flex-1 text-sm">
                    <p className="font-semibold">{i.productName}</p>
                    <p className="text-xs text-muted">Tamanho <strong className="text-ink">{i.size}</strong> · {i.quantity} × {formatBRL(i.unitPrice)}</p>
                  </div>
                  <p className="text-sm font-semibold">{formatBRL(i.unitPrice * i.quantity)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatBRL(order.subtotal)}</dd></div>
              {order.discount > 0 && (
                <div className="flex justify-between text-success"><dt>Desconto ({order.couponCode})</dt><dd>− {formatBRL(order.discount)}</dd></div>
              )}
              <div className="flex justify-between"><dt className="text-muted">Frete · {order.shippingService}</dt><dd>{order.shippingCost === 0 ? "Grátis" : formatBRL(order.shippingCost)}</dd></div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><dt>Total</dt><dd>{formatBRL(order.total)}</dd></div>
            </dl>
          </section>

          <section className="card" aria-labelledby="p-historico">
            <h2 id="p-historico" className="display text-2xl">Histórico</h2>
            <ol className="mt-4 space-y-4 border-l-2 border-line pl-5">
              {order.history.map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute -left-[27px] top-1 size-3 rounded-full bg-ink ring-4 ring-surface" aria-hidden />
                  <p className="text-sm font-semibold">
                    {h.fromStatus && h.fromStatus !== h.toStatus
                      ? `${ORDER_STATUS_LABELS[h.fromStatus as OrderStatus] ?? h.fromStatus} → ${ORDER_STATUS_LABELS[h.toStatus as OrderStatus] ?? h.toStatus}`
                      : ORDER_STATUS_LABELS[h.toStatus as OrderStatus] ?? h.toStatus}
                  </p>
                  {h.note && <p className="text-sm text-ink/75">{h.note}</p>}
                  <p className="text-xs text-muted">{dateFmt.format(h.createdAt)}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside aria-label="Ações e dados do pedido" className="space-y-6">
          <section className="card" aria-labelledby="p-status">
            <h2 id="p-status" className="display mb-4 text-2xl">Atualizar pedido</h2>
            {/* key: ao mudar o status, o formulário recomeça com as novas opções */}
            <StatusForm key={order.status} orderId={order.id} status={order.status} trackingCode={order.trackingCode} />
            {order.status === "AWAITING_PAYMENT" && (
              <div className="mt-5 border-t border-line pt-5">
                <p className="mb-2 text-xs text-muted">
                  O status “Pago” só é aplicado pelo Mercado Pago. Se um aviso de pagamento se perdeu, consulte:
                </p>
                <VerifyPaymentButton orderId={order.id} />
              </div>
            )}
            {order.status !== "AWAITING_PAYMENT" && order.status !== "CANCELED" && (
              <div className="mt-5 border-t border-line pt-5">
                <TrackingForm orderId={order.id} trackingCode={order.trackingCode} />
              </div>
            )}
          </section>

          <section className="card text-sm" aria-labelledby="p-cliente">
            <h2 id="p-cliente" className="display text-2xl">Cliente</h2>
            <p className="mt-3 font-semibold">{order.customerName}</p>
            <p><a href={`mailto:${order.customerEmail}`} className="underline-offset-2 hover:underline">{order.customerEmail}</a></p>
            <p>
              <a href={`https://wa.me/55${order.customerPhone}`} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
                {formatPhone(order.customerPhone)}
              </a>
            </p>
            {order.customerCpf && <p className="text-muted">CPF {formatCpf(order.customerCpf)}</p>}
            <Link href={`/admin/clientes/${order.customer.id}`} className="mt-3 inline-block font-semibold underline underline-offset-2">
              Ver cliente ({order.customer._count.orders} {order.customer._count.orders === 1 ? "pedido" : "pedidos"})
            </Link>
          </section>

          <section className="card text-sm" aria-labelledby="p-entrega">
            <h2 id="p-entrega" className="display text-2xl">Entrega</h2>
            <p className="mt-3">
              {order.street}, {order.number}
              {order.complement && ` — ${order.complement}`}
              <br />
              {order.district} · {order.city}/{order.state}
              <br />
              CEP {formatCep(order.zipCode)}
            </p>
            <p className="mt-2 text-muted">{order.shippingService}{order.shippingDays != null && ` · ${order.shippingDays} dias úteis`}</p>
          </section>

          <section className="card text-sm" aria-labelledby="p-pagamento">
            <h2 id="p-pagamento" className="display text-2xl">Pagamento</h2>
            <dl className="mt-3 space-y-1">
              <div className="flex justify-between gap-3"><dt className="text-muted">Forma</dt><dd>{order.paymentMethod ?? "—"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Pago em</dt><dd>{order.paidAt ? dateFmt.format(order.paidAt) : "—"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">ID Mercado Pago</dt><dd className="font-mono text-xs">{order.mpPaymentId ?? "—"}</dd></div>
            </dl>
            {order.mpPaymentId && (
              <a
                href={`https://www.mercadopago.com.br/activities?q=${order.mpPaymentId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 font-semibold underline underline-offset-2"
              >
                Abrir no Mercado Pago <ExternalLink className="size-3.5" aria-hidden />
              </a>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
