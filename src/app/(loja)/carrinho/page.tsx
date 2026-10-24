import type { Metadata } from "next";
import { CartView } from "@/components/loja/cart/cart-view";

export const metadata: Metadata = {
  title: "Carrinho",
  robots: { index: false, follow: false },
};

export default function CarrinhoPage() {
  return (
    <div className="container-nk pt-8 sm:pt-12">
      <h1 className="display text-5xl sm:text-6xl">Carrinho</h1>
      <CartView />
    </div>
  );
}
