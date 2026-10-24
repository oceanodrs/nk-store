"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { cartCount, useCart } from "@/lib/cart/store";

export function CartButton() {
  const count = cartCount(useCart());
  return (
    <Link
      href="/carrinho"
      className="relative grid size-10 place-items-center rounded-full transition hover:bg-ink/5"
      aria-label={count > 0 ? `Carrinho, ${count} ${count === 1 ? "item" : "itens"}` : "Carrinho vazio"}
    >
      <ShoppingBag className="size-5" aria-hidden />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-lime px-1 text-[11px] font-bold leading-5 text-ink ring-2 ring-paper"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
