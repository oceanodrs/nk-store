"use client";

import { useEffect } from "react";
import { cart } from "@/lib/cart/store";

/** Esvazia o carrinho depois que o pedido foi criado e pago/em pagamento. */
export function ClearCart() {
  useEffect(() => {
    cart.clear();
  }, []);
  return null;
}
