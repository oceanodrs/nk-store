"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { ShippingCalculator } from "@/components/loja/shipping-calculator";
import { cart, useCart } from "@/lib/cart/store";
import { LOW_STOCK_THRESHOLD, SIZES } from "@/lib/constants";
import { MAX_QTY_PER_ITEM } from "@/lib/validators/cart";

type Props = {
  product: {
    id: string;
    name: string;
    slug: string;
    unitPrice: number;
    image: string | null;
  };
  variants: { id: string; size: string; available: number }[];
};

export function PurchasePanel({ product, variants }: Props) {
  const router = useRouter();
  const savedCep = useCart().cep;
  const sorted = [...variants].sort((a, b) => SIZES.indexOf(a.size as never) - SIZES.indexOf(b.size as never));
  const [variantId, setVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const selected = sorted.find((v) => v.id === variantId) ?? null;
  const maxQty = Math.min(MAX_QTY_PER_ITEM, selected?.available ?? MAX_QTY_PER_ITEM);
  const soldOut = sorted.every((v) => v.available <= 0);

  function addToCart(goToCart: boolean) {
    if (!selected) {
      setError("Escolha um tamanho para continuar.");
      document.getElementById("tamanhos")?.focus();
      return;
    }
    // o carrinho aceita no máximo o disponível, contando o que já estava nele
    const inCart = cart.get().items.find((i) => i.variantId === selected.id)?.quantity ?? 0;
    if (inCart + quantity > selected.available) {
      setError(
        inCart > 0
          ? `Você já tem ${inCart} no carrinho e restam ${selected.available} unidades neste tamanho.`
          : `Restam só ${selected.available} unidades neste tamanho.`,
      );
      return;
    }
    cart.add(
      {
        variantId: selected.id,
        productId: product.id,
        slug: product.slug,
        name: product.name,
        size: selected.size,
        unitPrice: product.unitPrice,
        image: product.image,
      },
      quantity,
    );
    if (goToCart) router.push("/carrinho");
  }

  return (
    <div className="space-y-7">
      <fieldset>
        <div className="mb-3 flex items-center justify-between">
          <legend className="text-sm font-semibold">
            Tamanho{selected && <span className="font-normal text-muted">: {selected.size}</span>}
          </legend>
          <a href="#guia-de-medidas" className="text-xs font-medium text-muted underline underline-offset-2 hover:text-ink">
            Guia de medidas
          </a>
        </div>
        <div
          id="tamanhos"
          tabIndex={-1}
          role="radiogroup"
          aria-label="Escolha o tamanho"
          aria-describedby={error ? "erro-compra" : undefined}
          className="flex flex-wrap gap-2 outline-none"
        >
          {sorted.map((v) => {
            const out = v.available <= 0;
            const checked = v.id === variantId;
            return (
              <label key={v.id} className={out ? "cursor-not-allowed" : "cursor-pointer"}>
                <input
                  type="radio"
                  name="tamanho"
                  value={v.id}
                  checked={checked}
                  disabled={out}
                  onChange={() => {
                    setVariantId(v.id);
                    setQuantity((q) => Math.min(q, Math.max(1, v.available)));
                    setError(null);
                  }}
                  className="peer sr-only"
                />
                <span
                  className="relative grid h-12 min-w-14 place-items-center rounded-xl border border-line bg-surface px-3 text-sm font-semibold transition
                    hover:border-ink peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white
                    peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lime
                    peer-disabled:border-dashed peer-disabled:text-muted/60 peer-disabled:hover:border-line"
                >
                  {v.size}
                  {out && <span className="sr-only"> (esgotado)</span>}
                  {out && <span aria-hidden className="absolute inset-x-2 top-1/2 h-px -rotate-[20deg] bg-muted/50" />}
                </span>
              </label>
            );
          })}
        </div>
        {selected && selected.available <= LOW_STOCK_THRESHOLD && (
          <p className="mt-2 text-sm font-medium text-warning">
            Últimas {selected.available} {selected.available === 1 ? "unidade" : "unidades"} neste tamanho!
          </p>
        )}
      </fieldset>

      <div className="flex flex-wrap items-stretch gap-3">
        <div className="flex h-14 items-center rounded-full border border-line bg-surface" role="group" aria-label="Quantidade">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            className="grid size-14 place-items-center rounded-full transition hover:bg-ink/5 disabled:opacity-30"
            aria-label="Diminuir quantidade"
          >
            <Minus className="size-4" aria-hidden />
          </button>
          <output className="w-8 text-center font-semibold" aria-live="polite" aria-label={`Quantidade: ${quantity}`}>
            {quantity}
          </output>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
            disabled={quantity >= maxQty}
            className="grid size-14 place-items-center rounded-full transition hover:bg-ink/5 disabled:opacity-30"
            aria-label="Aumentar quantidade"
          >
            <Plus className="size-4" aria-hidden />
          </button>
        </div>

        <button type="button" onClick={() => addToCart(true)} disabled={soldOut} className="btn-lime h-14 flex-1 text-base">
          {soldOut ? "Esgotado" : "Comprar"}
        </button>
        <button
          type="button"
          onClick={() => addToCart(false)}
          disabled={soldOut}
          className="btn-outline h-14 w-full sm:w-auto"
        >
          <ShoppingBag className="size-4" aria-hidden /> Adicionar ao carrinho
        </button>
      </div>

      <p id="erro-compra" role="alert" className="-mt-4 min-h-5 text-sm font-medium text-danger">
        {error}
      </p>

      <div className="rounded-[var(--radius-card)] border border-line bg-surface/60 p-5">
        <p className="mb-3 text-sm font-semibold">Calcular frete e prazo</p>
        <ShippingCalculator
          items={[{ productId: product.id, quantity }]}
          initialCep={savedCep}
          onChange={(cep) => cart.setShipping(cep, cart.get().shippingOptionId)}
        />
      </div>
    </div>
  );
}
