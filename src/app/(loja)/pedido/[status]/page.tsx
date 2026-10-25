import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { ClearCart } from "@/components/loja/order/clear-cart";
import { OrderDetails } from "@/components/loja/order/order-details";
import { formatOrderNumber } from "@/lib/constants";
import { applyVerifiedPayment, getOrderByToken } from "@/lib/orders";
import { getPayment, isMercadoPagoConfigured } from "@/lib/payments/mercadopago";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Seu pedido",
  robots: { index: false, follow: false },
  // o link tem o token de acesso: não vaza para outros sites
  referrer: "no-referrer",
};

const VIEWS = ["sucesso", "pendente", "falha", "detalhes"] as const;
type View = (typeof VIEWS)[number];

type Props = {
  params: Promise<{ status: string }>;
  searchParams: Promise<{ token?: string; payment_id?: string; collection_id?: string }>;
};

export default async function PedidoPage({ params, searchParams }: Props) {
  const [{ status }, sp] = await Promise.all([params, searchParams]);
  if (!VIEWS.includes(status as View) || !sp.token) notFound();

  let order = await getOrderByToken(sp.token);
  if (!order) notFound();

  // O Mercado Pago devolve o payment_id na URL de retorno. A URL NÃO é confiável:
  // usamos o id só para consultar o pagamento na API e aplicamos o que ela disser
  // (ajuda quando o webhook ainda não chegou, como em testes locais).
  const paymentId = sp.payment_id ?? sp.collection_id;
  if (order.status === "AWAITING_PAYMENT" && paymentId && /^\d{1,20}$/.test(paymentId) && isMercadoPagoConfigured()) {
    try {
      const payment = await getPayment(paymentId);
      if (payment.externalReference === String(order.id)) {
        await applyVerifiedPayment(payment);
        order = (await getOrderByToken(sp.token))!;
      }
    } catch (err) {
      console.error("[retorno] não foi possível consultar o pagamento", err);
    }
  }

  // a mensagem segue o status REAL do pedido no banco
  const paid = order.paidAt != null && order.status !== "CANCELED";
  const tone = paid ? "ok" : order.status === "CANCELED" || status === "falha" ? "fail" : "wait";
  const banner = {
    ok: {
      icon: CheckCircle2,
      title: "Pagamento aprovado!",
      text: "Recebemos seu pagamento e já vamos separar seu pedido. Guarde o número abaixo para acompanhar.",
      cls: "bg-ink text-white",
    },
    wait: {
      icon: Clock,
      title: status === "detalhes" ? "Aguardando pagamento" : "Pedido recebido!",
      text: "Assim que o Mercado Pago confirmar o pagamento, o status muda aqui automaticamente. Pix costuma levar segundos; boleto, até 3 dias úteis.",
      cls: "bg-lime-soft text-ink",
    },
    fail: {
      icon: XCircle,
      title: order.status === "CANCELED" ? "Pedido cancelado" : "Pagamento não concluído",
      text:
        order.status === "CANCELED"
          ? "Este pedido foi cancelado. Se precisar de ajuda, fale com a gente."
          : "O pagamento não foi aprovado. Seus itens continuam reservados por um tempo: você pode tentar de novo com outra forma de pagamento.",
      cls: "bg-danger/10 text-ink",
    },
  }[tone];
  const Icon = banner.icon;

  return (
    <div className="container-nk pt-8 sm:pt-12">
      {(paid || (status !== "falha" && status !== "detalhes")) && order.status !== "CANCELED" && <ClearCart />}

      {status === "detalhes" ? (
        <h1 className="display mb-6 text-5xl">Pedido {formatOrderNumber(order.id)}</h1>
      ) : (
        <div className={`relative mb-8 overflow-hidden rounded-[var(--radius-xl2)] p-6 sm:p-10 ${banner.cls}`}>
          {tone === "ok" && <div className="stripes-diagonal absolute inset-0" aria-hidden />}
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
            <Icon className={`size-12 shrink-0 ${tone === "ok" ? "text-lime" : tone === "fail" ? "text-danger" : "text-ink"}`} aria-hidden />
            <div>
              <h1 className="display text-4xl sm:text-5xl">{banner.title}</h1>
              <p className={`mt-2 max-w-2xl ${tone === "ok" ? "text-white/80" : "text-ink/75"}`}>{banner.text}</p>
            </div>
          </div>
        </div>
      )}

      {order.status === "AWAITING_PAYMENT" && order.mpPreferenceId && (
        <div className="mb-8 flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] bg-surface p-5 ring-1 ring-line">
          <p className="flex-1 text-sm text-muted">
            Ainda não pagou ou quer trocar a forma de pagamento? Use o mesmo pedido, sem precisar refazer a compra.
          </p>
          <a
            href={`https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${encodeURIComponent(order.mpPreferenceId)}`}
            className="btn-lime"
            rel="noopener noreferrer"
          >
            {status === "falha" ? "Tentar pagar novamente" : "Ir para o pagamento"}
          </a>
        </div>
      )}

      <OrderDetails order={order} />

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/produtos" className="btn-dark">Continuar comprando</Link>
        <Link href="/acompanhar-pedido" className="btn-outline">Acompanhar outro pedido</Link>
      </div>
    </div>
  );
}
