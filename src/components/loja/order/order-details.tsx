import Link from "next/link";
import { Check, Circle, X } from "lucide-react";
import { ShirtImage } from "@/components/shirt-image";
import { formatOrderNumber, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";
import { formatCep, pluralDays } from "@/lib/format";
import { formatBRL } from "@/lib/money";
import type { PublicOrder } from "@/lib/orders";

const STEPS: OrderStatus[] = ["AWAITING_PAYMENT", "PAID", "PICKING", "SHIPPED", "DELIVERED"];

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

export function OrderDetails({ order }: { order: PublicOrder }) {
  const canceled = order.status === "CANCELED";
  const current = STEPS.indexOf(order.status as OrderStatus);
  // primeira data em que o pedido chegou a cada etapa
  const reachedAt = (s: string) => order.history.find((h) => h.toStatus === s && h.fromStatus !== h.toStatus)?.createdAt
    ?? (s === "AWAITING_PAYMENT" ? order.createdAt : null);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <section className="card" aria-labelledby="o-status">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="o-status" className="display text-2xl">Pedido {formatOrderNumber(order.id)}</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${canceled ? "bg-danger/10 text-danger" : order.status === "AWAITING_PAYMENT" ? "bg-warning/10 text-warning" : "bg-lime-soft text-ink"}`}>
              {ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">Feito em {dateFmt.format(order.createdAt)}</p>

          {canceled ? (
            <p className="mt-5 flex items-center gap-2 rounded-xl bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
              <X className="size-4" aria-hidden /> Este pedido foi cancelado.
            </p>
          ) : (
            <ol className="mt-6 grid gap-4 sm:grid-cols-5 sm:gap-2" aria-label="Andamento do pedido">
              {STEPS.map((s, i) => {
                const done = i <= current;
                const at = done ? reachedAt(s) : null;
                return (
                  <li key={s} className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2" aria-current={i === current ? "step" : undefined}>
                    <span className={`grid size-8 shrink-0 place-items-center rounded-full ${done ? "bg-ink text-lime" : "bg-line text-muted"}`}>
                      {done ? <Check className="size-4" aria-hidden /> : <Circle className="size-3" aria-hidden />}
                    </span>
                    <span>
                      <span className={`block text-sm font-semibold ${done ? "" : "text-muted"}`}>{ORDER_STATUS_LABELS[s]}</span>
                      {at && <span className="block text-xs text-muted">{dateFmt.format(at)}</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}

          {order.trackingCode && (
            <p className="mt-6 rounded-xl bg-paper px-4 py-3 text-sm">
              Código de rastreio: <strong className="font-mono">{order.trackingCode}</strong>{" "}
              <a
                href={`https://rastreamento.correios.com.br/app/index.php?objetos=${encodeURIComponent(order.trackingCode)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline underline-offset-2"
              >
                Rastrear
              </a>
            </p>
          )}
        </section>

        <section className="card" aria-labelledby="o-itens">
          <h2 id="o-itens" className="display text-2xl">Itens</h2>
          <ul className="mt-3 divide-y divide-line">
            {order.items.map((i) => (
              <li key={i.id} className="flex gap-3 py-3">
                <div className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-lg bg-line">
                  {i.imageUrl && <ShirtImage src={i.imageUrl} alt="" fill sizes="56px" className="object-cover" />}
                </div>
                <div className="flex-1 text-sm">
                  <Link href={`/produto/${i.productSlug}`} className="font-semibold hover:underline">{i.productName}</Link>
                  <p className="text-xs text-muted">Tamanho {i.size} · {i.quantity} × {formatBRL(i.unitPrice)}</p>
                </div>
                <p className="text-sm font-semibold">{formatBRL(i.unitPrice * i.quantity)}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="space-y-6">
        <section className="card" aria-labelledby="o-valores">
          <h2 id="o-valores" className="display text-2xl">Valores</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatBRL(order.subtotal)}</dd></div>
            {order.discount > 0 && (
              <div className="flex justify-between text-success"><dt>Desconto {order.couponCode && `(${order.couponCode})`}</dt><dd>− {formatBRL(order.discount)}</dd></div>
            )}
            <div className="flex justify-between"><dt className="text-muted">Frete</dt><dd>{order.shippingCost === 0 ? "Grátis" : formatBRL(order.shippingCost)}</dd></div>
            <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><dt>Total</dt><dd>{formatBRL(order.total)}</dd></div>
          </dl>
          {order.paymentMethod && <p className="mt-3 text-xs text-muted">Pagamento: {order.paymentMethod}</p>}
        </section>

        <section className="card text-sm" aria-labelledby="o-entrega">
          <h2 id="o-entrega" className="display text-2xl">Entrega</h2>
          <p className="mt-3 font-semibold">{order.customerName}</p>
          <p className="text-muted">
            {order.street}, {order.number}
            {order.complement && ` — ${order.complement}`}
            <br />
            {order.district} · {order.city}/{order.state}
            <br />
            CEP {formatCep(order.zipCode)}
          </p>
          <p className="mt-3 text-muted">
            {order.shippingService}
            {order.shippingDays != null && ` · até ${pluralDays(order.shippingDays)} após o envio`}
          </p>
        </section>
      </aside>
    </div>
  );
}
