"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { ShirtImage } from "@/components/shirt-image";
import { cart, type CartItem } from "@/lib/cart/store";

/** Aviso "Adicionado ao carrinho" que aparece no canto da tela. */
export function CartToast() {
  const pathname = usePathname();
  const [toast, setToast] = useState<{ item: CartItem; path: string } | null>(null);
  // o aviso vale só para a página onde o item foi adicionado
  // (ao ir direto para o carrinho pelo botão "Comprar", ele não aparece)
  const item = toast && toast.path === pathname && pathname !== "/carrinho" ? toast.item : null;
  const setItem = (next: CartItem | null) => setToast(next ? { item: next, path: window.location.pathname } : null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const off = cart.onAdded((added) => {
      setItem(added);
      clearTimeout(timer);
      timer = setTimeout(() => setItem(null), 5000);
    });
    return () => {
      off();
      clearTimeout(timer);
    };
  }, []);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 sm:inset-x-auto sm:right-6 sm:top-24 sm:bottom-auto">
      {item && (
        <div
          key={item.variantId + item.quantity}
          className="pointer-events-auto flex w-full max-w-md animate-fade-up items-center gap-3 rounded-2xl bg-ink p-3 pr-2 text-white shadow-2xl shadow-black/30"
        >
          <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-white/10">
            {item.image && <ShirtImage src={item.image} alt="" fill sizes="64px" className="object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-lime">
              <Check className="size-3.5" aria-hidden /> Adicionado ao carrinho
            </p>
            <p className="truncate text-sm font-semibold">{item.name}</p>
            <p className="text-xs text-white/70">Tamanho {item.size}</p>
          </div>
          <Link href="/carrinho" className="btn-lime shrink-0 px-4 py-2 text-xs">
            Ver carrinho
          </Link>
          <button
            type="button"
            onClick={() => setItem(null)}
            className="grid size-8 shrink-0 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Fechar aviso"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
