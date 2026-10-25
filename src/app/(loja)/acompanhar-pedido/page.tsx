import type { Metadata } from "next";
import { TrackForm } from "./track-form";

export const metadata: Metadata = {
  title: "Acompanhar pedido",
  description: "Consulte o andamento do seu pedido na NK STORE com o número do pedido e o e-mail da compra.",
  alternates: { canonical: "/acompanhar-pedido" },
};

export default function AcompanharPedidoPage() {
  return (
    <div className="container-nk max-w-xl pt-8 sm:pt-12">
      <p className="eyebrow text-muted">Pós-venda</p>
      <h1 className="display mt-1 text-5xl sm:text-6xl">Acompanhar pedido</h1>
      <p className="mt-3 text-muted">Informe o número do pedido e o e-mail usado na compra.</p>
      <TrackForm />
    </div>
  );
}
