"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Lock, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { ShippingCalculator, type QuoteOption } from "@/components/loja/shipping-calculator";
import { ShirtImage } from "@/components/shirt-image";
import { cart, cartCount, cartSubtotal, useCart } from "@/lib/cart/store";
import { SIZES } from "@/lib/constants";
import { formatBRL } from "@/lib/money";
import { useHydrated } from "@/lib/use-hydrated";
import { MAX_QTY_PER_ITEM } from "@/lib/validators/cart";

type ServerItem = {
  variantId: string;
  name: string;
  slug: string;
  size: string;
  image: string | null;
  unitPrice: number;
  listPrice: number;
  active: boolean;
  available: number;
  sizes: { variantId: string; size: string; available: number }[];
};

export function CartView() {
  const state = useCart();
  const hydrated = useHydrated();
  const [server, setServer] = useState<Map<string, ServerItem>>(new Map());
  const [shipping, setShipping] = useState<QuoteOption | null>(null);

  // revalida preços/estoque no servidor sempre que os itens mudam
  const validateKey = state.items.map((i) => `${i.variantId}:${i.quantity}`).join(",");
  useEffect(() => {
    if (!validateKey) return;
    const controller = new AbortController();
    fetch("/api/carrinho", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart.get().items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })) }),
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { items: ServerItem[] } | null) => {
        if (!data) return;
        const map = new Map(data.items.map((i) => [i.variantId, i]));
        setServer(map);
        // atualiza no carrinho os dados que mudaram (preço, nome, imagem)
        cart.sync(
          new Map(
            data.items.map((i) => [i.variantId, { unitPrice: i.unitPrice, name: i.name, slug: i.slug, image: i.image, size: i.size }]),
          ),
        );
      })
      .catch(() => {});
    return () => controller.abort();
  }, [validateKey]);

  const problems = useMemo(() => {
    const out = new Map<string, string>();
    if (server.size === 0) return out;
    for (const item of state.items) {
      const s = server.get(item.variantId);
      if (!s || !s.active) out.set(item.variantId, "Produto indisponível. Remova para continuar.");
      else if (s.available <= 0) out.set(item.variantId, "Esgotado neste tamanho. Troque o tamanho ou remova.");
      else if (item.quantity > s.available)
        out.set(item.variantId, `Só temos ${s.available} ${s.available === 1 ? "unidade" : "unidades"} neste tamanho.`);
    }
    return out;
  }, [server, state.items]);

  const shippingItems = useMemo(() => {
    const byProduct = new Map<string, number>();
    for (const i of state.items) byProduct.set(i.productId, (byProduct.get(i.productId) ?? 0) + i.quantity);
    return [...byProduct].map(([productId, quantity]) => ({ productId, quantity: Math.min(quantity, MAX_QTY_PER_ITEM) }));
  }, [state.items]);

  if (!hydrated) {
    return <div className="mt-10 h-64 animate-pulse rounded-[var(--radius-card)] bg-line/60" aria-label="Carregando carrinho" />;
  }

  if (state.items.length === 0) {
    return (
      <div className="mt-10 rounded-[var(--radius-xl2)] border border-dashed border-line bg-surface px-6 py-16 text-center">
        <ShoppingBag className="mx-auto size-10 text-muted" aria-hidden />
        <p className="display mt-4 text-3xl">Seu carrinho está vazio</p>
        <p className="mt-2 text-muted">Que tal escolher a camisa do seu time?</p>
        <Link href="/produtos" className="btn-lime mt-6">
          Ver camisas <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    );
  }

  const subtotal = cartSubtotal(state);
  const total = subtotal + (shipping?.price ?? 0);
  const count = cartCount(state);

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
      <section aria-label="Itens do carrinho">
        <ul className="divide-y divide-line border-y border-line">
          {state.items.map((item) => {
            const s = server.get(item.variantId);
            const problem = problems.get(item.variantId);
            const maxQty = Math.min(MAX_QTY_PER_ITEM, Math.max(1, s?.available ?? MAX_QTY_PER_ITEM));
            const sizes = (s?.sizes ?? []).toSorted(
              (a, b) => SIZES.indexOf(a.size as never) - SIZES.indexOf(b.size as never),
            );
            return (
              <li key={item.variantId} className="flex gap-4 py-5">
                <Link
                  href={`/produto/${item.slug}`}
                  className="relative aspect-[4/5] w-24 shrink-0 overflow-hidden rounded-2xl bg-line sm:w-28"
                  tabIndex={-1}
                  aria-hidden
                >
                  {item.image && <ShirtImage src={item.image} alt="" fill sizes="112px" className="object-cover" />}
                </Link>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/produto/${item.slug}`} className="font-semibold leading-snug hover:underline">
                      {item.name}
                    </Link>
                    <p className="shrink-0 font-bold">{formatBRL(item.unitPrice * item.quantity)}</p>
                  </div>
                  <p className="mt-0.5 text-sm text-muted">{formatBRL(item.unitPrice)} cada</p>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <label className="sr-only" htmlFor={`tam-${item.variantId}`}>
                      Tamanho de {item.name}
                    </label>
                    <select
                      id={`tam-${item.variantId}`}
                      value={item.variantId}
                      onChange={(e) => {
                        const to = sizes.find((x) => x.variantId === e.target.value);
                        if (to) cart.changeVariant(item.variantId, { variantId: to.variantId, size: to.size });
                      }}
                      className="h-10 rounded-full border border-line bg-surface pl-3 pr-8 text-sm font-medium outline-none hover:border-ink focus-visible:border-ink"
                    >
                      {sizes.length === 0 && <option value={item.variantId}>Tam. {item.size}</option>}
                      {sizes.map((x) => (
                        <option key={x.variantId} value={x.variantId} disabled={x.available <= 0 && x.variantId !== item.variantId}>
                          Tam. {x.size}
                          {x.available <= 0 ? " (esgotado)" : ""}
                        </option>
                      ))}
                    </select>

                    <div className="flex h-10 items-center rounded-full border border-line bg-surface" role="group" aria-label={`Quantidade de ${item.name}`}>
                      <button
                        type="button"
                        onClick={() => cart.setQuantity(item.variantId, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="grid size-10 place-items-center rounded-full hover:bg-ink/5 disabled:opacity-30"
                        aria-label="Diminuir quantidade"
                      >
                        <Minus className="size-3.5" aria-hidden />
                      </button>
                      <span className="w-7 text-center text-sm font-semibold" aria-live="polite">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => cart.setQuantity(item.variantId, item.quantity + 1)}
                        disabled={item.quantity >= maxQty}
                        className="grid size-10 place-items-center rounded-full hover:bg-ink/5 disabled:opacity-30"
                        aria-label="Aumentar quantidade"
                      >
                        <Plus className="size-3.5" aria-hidden />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => cart.remove(item.variantId)}
                      className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-muted transition hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 className="size-4" aria-hidden /> Remover
                    </button>
                  </div>

                  {problem && (
                    <p role="alert" className="mt-3 flex items-center gap-2 text-sm font-medium text-warning">
                      <AlertTriangle className="size-4 shrink-0" aria-hidden /> {problem}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <Link href="/produtos" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline">
          ← Continuar comprando
        </Link>
      </section>

      <aside aria-labelledby="resumo" className="lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-[var(--radius-xl2)] bg-surface p-6 shadow-sm ring-1 ring-line">
          <h2 id="resumo" className="display text-3xl">
            Resumo
          </h2>

          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold">Entrega</p>
            <ShippingCalculator
              items={shippingItems}
              initialCep={state.cep}
              selectable
              selectedId={state.shippingOptionId}
              onChange={(cep, option) => {
                setShipping(option);
                cart.setShipping(cep, option?.id ?? null);
              }}
            />
          </div>

          <dl className="mt-6 space-y-3 border-t border-line pt-5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">
                Subtotal ({count} {count === 1 ? "item" : "itens"})
              </dt>
              <dd className="font-semibold">{formatBRL(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Frete</dt>
              <dd className="font-semibold">
                {shipping ? (shipping.free ? <span className="text-success">Grátis</span> : formatBRL(shipping.price)) : "—"}
              </dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-line pt-4">
              <dt className="font-semibold">Total</dt>
              <dd className="text-2xl font-bold">{formatBRL(total)}</dd>
            </div>
          </dl>
          <p className="mt-1 text-right text-xs text-muted">Cupom de desconto é aplicado no checkout</p>

          <Link
            href="/checkout"
            aria-disabled={problems.size > 0}
            onClick={(e) => problems.size > 0 && e.preventDefault()}
            className="btn-lime mt-6 h-14 w-full text-base aria-disabled:pointer-events-none aria-disabled:opacity-50"
          >
            <Lock className="size-4" aria-hidden /> Finalizar compra
          </Link>
          {problems.size > 0 && (
            <p className="mt-2 text-center text-xs font-medium text-warning">Resolva os avisos dos itens para continuar.</p>
          )}
          <p className="mt-4 text-center text-xs text-muted">Pagamento seguro via Mercado Pago · Pix, cartão ou boleto</p>
        </div>
      </aside>
    </div>
  );
}
