"use client";

import { useSyncExternalStore } from "react";
import { MAX_CART_LINES, MAX_QTY_PER_ITEM } from "@/lib/validators/cart";

// Carrinho persistido no localStorage. Preços aqui são só para exibição:
// o servidor revalida tudo (/api/carrinho) e recalcula no checkout.

export type CartItem = {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  size: string;
  unitPrice: number;
  image: string | null;
  quantity: number;
};

export type CartState = {
  items: CartItem[];
  cep: string;
  shippingOptionId: string | null;
};

const KEY = "nk-cart-v1";
const EMPTY: CartState = { items: [], cep: "", shippingOptionId: null };

let state: CartState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();
const addedListeners = new Set<(item: CartItem) => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  read();
  // mantém abas diferentes sincronizadas
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    read();
    emit();
  });
}

function read() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CartState>;
      state = {
        items: Array.isArray(parsed.items) ? parsed.items.slice(0, MAX_CART_LINES) : [],
        cep: typeof parsed.cep === "string" ? parsed.cep : "",
        shippingOptionId: typeof parsed.shippingOptionId === "string" ? parsed.shippingOptionId : null,
      };
    } else {
      state = EMPTY;
    }
  } catch {
    state = EMPTY;
  }
}

function emit() {
  for (const l of listeners) l();
}

function set(next: CartState) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // modo privado/armazenamento cheio: o carrinho segue funcionando em memória
  }
  emit();
}

const clampQty = (n: number) => Math.max(1, Math.min(MAX_QTY_PER_ITEM, Math.floor(n)));

export const cart = {
  get: () => {
    load();
    return state;
  },

  add(item: Omit<CartItem, "quantity">, quantity = 1) {
    load();
    const existing = state.items.find((i) => i.variantId === item.variantId);
    const items = existing
      ? state.items.map((i) =>
          i.variantId === item.variantId ? { ...i, ...item, quantity: clampQty(i.quantity + quantity) } : i,
        )
      : [...state.items, { ...item, quantity: clampQty(quantity) }].slice(-MAX_CART_LINES);
    set({ ...state, items });
    const added = items.find((i) => i.variantId === item.variantId)!;
    for (const l of addedListeners) l(added);
  },

  setQuantity(variantId: string, quantity: number) {
    set({ ...state, items: state.items.map((i) => (i.variantId === variantId ? { ...i, quantity: clampQty(quantity) } : i)) });
  },

  /** Troca o tamanho de um item; se o novo tamanho já estiver no carrinho, soma as quantidades. */
  changeVariant(fromVariantId: string, to: { variantId: string; size: string }) {
    const from = state.items.find((i) => i.variantId === fromVariantId);
    if (!from || from.variantId === to.variantId) return;
    const target = state.items.find((i) => i.variantId === to.variantId);
    const items = target
      ? state.items
          .filter((i) => i.variantId !== fromVariantId)
          .map((i) => (i.variantId === to.variantId ? { ...i, quantity: clampQty(i.quantity + from.quantity) } : i))
      : state.items.map((i) => (i.variantId === fromVariantId ? { ...i, ...to } : i));
    set({ ...state, items });
  },

  remove(variantId: string) {
    set({ ...state, items: state.items.filter((i) => i.variantId !== variantId) });
  },

  /** Atualiza dados vindos do servidor (preço, nome, imagem) sem disparar eventos de "adicionado". */
  sync(updates: Map<string, Partial<CartItem>>) {
    let changed = false;
    const items = state.items.map((i) => {
      const u = updates.get(i.variantId);
      if (!u) return i;
      const next = { ...i, ...u };
      if (JSON.stringify(next) !== JSON.stringify(i)) changed = true;
      return next;
    });
    if (changed) set({ ...state, items });
  },

  setShipping(cep: string, shippingOptionId: string | null) {
    if (cep === state.cep && shippingOptionId === state.shippingOptionId) return;
    set({ ...state, cep, shippingOptionId });
  },

  clear() {
    set({ ...EMPTY, cep: state.cep });
  },

  subscribe(listener: () => void) {
    load();
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  onAdded(listener: (item: CartItem) => void) {
    addedListeners.add(listener);
    return () => addedListeners.delete(listener);
  },
};

/** Hook React do carrinho. No servidor (e na 1ª renderização) devolve o carrinho vazio. */
export function useCart() {
  return useSyncExternalStore(cart.subscribe, cart.get, () => EMPTY);
}

export function cartCount(s: CartState) {
  return s.items.reduce((n, i) => n + i.quantity, 0);
}

export function cartSubtotal(s: CartState) {
  return s.items.reduce((n, i) => n + i.unitPrice * i.quantity, 0);
}
