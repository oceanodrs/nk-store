import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutForm } from "@/components/loja/checkout/checkout-form";

export const metadata: Metadata = {
  title: "Finalizar compra",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <div className="container-nk pt-8 sm:pt-12">
      <Link href="/carrinho" className="text-sm text-muted hover:text-ink">← Voltar ao carrinho</Link>
      <h1 className="display mt-2 text-5xl sm:text-6xl">Finalizar compra</h1>
      <CheckoutForm />
    </div>
  );
}
