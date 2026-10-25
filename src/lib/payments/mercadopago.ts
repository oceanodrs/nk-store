import "server-only";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import { formatOrderNumber } from "@/lib/constants";
import { absoluteUrl, siteConfig } from "@/lib/site";

function client() {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) throw new Error("MP_ACCESS_TOKEN não configurado.");
  return new MercadoPagoConfig({ accessToken, options: { timeout: 10_000 } });
}

export function isMercadoPagoConfigured() {
  return !!process.env.MP_ACCESS_TOKEN;
}

/** URL pública que o Mercado Pago usa para notificar (túnel em dev, domínio em produção). */
function notificationBaseUrl() {
  return (process.env.MP_NOTIFICATION_BASE_URL || siteConfig.url).replace(/\/$/, "");
}

type OrderForPreference = {
  id: number;
  accessToken: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCpf: string | null;
  zipCode: string;
  street: string;
  number: string;
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  reservationExpiresAt: Date | null;
  items: { variantId: string; productName: string; size: string; unitPrice: number; quantity: number; imageUrl: string | null }[];
};

const reais = (cents: number) => Number((cents / 100).toFixed(2));

export async function createPreference(order: OrderForPreference) {
  const number = formatOrderNumber(order.id);
  const returnUrl = (status: string) => absoluteUrl(`/pedido/${status}?token=${order.accessToken}`);

  // Com desconto, envia um item único com o valor já descontado (o Mercado Pago
  // não aceita itens com preço negativo). Sem desconto, envia os itens detalhados.
  const items =
    order.discount > 0
      ? [
          {
            id: number,
            title: `Pedido ${number} — NK STORE`,
            description: order.items.map((i) => `${i.quantity}x ${i.productName} (${i.size})`).join(", ").slice(0, 250),
            quantity: 1,
            unit_price: reais(order.subtotal - order.discount),
            currency_id: "BRL",
          },
        ]
      : order.items.map((i) => ({
          id: i.variantId,
          title: `${i.productName} — tam. ${i.size}`,
          quantity: i.quantity,
          unit_price: reais(i.unitPrice),
          currency_id: "BRL",
          ...(i.imageUrl?.startsWith("http") ? { picture_url: i.imageUrl } : {}),
        }));

  const [firstName, ...rest] = order.customerName.split(" ");
  const isHttps = siteConfig.url.startsWith("https://");

  const pref = await new Preference(client()).create({
    body: {
      items,
      external_reference: String(order.id),
      metadata: { order_number: number },
      payer: {
        name: firstName,
        surname: rest.join(" "),
        email: order.customerEmail,
        phone: { area_code: order.customerPhone.slice(0, 2), number: order.customerPhone.slice(2) },
        ...(order.customerCpf ? { identification: { type: "CPF", number: order.customerCpf } } : {}),
        address: { zip_code: order.zipCode, street_name: order.street, street_number: order.number },
      },
      shipments: { mode: "not_specified", cost: reais(order.shippingCost) },
      back_urls: { success: returnUrl("sucesso"), pending: returnUrl("pendente"), failure: returnUrl("falha") },
      // o retorno automático exige URL https (túnel ou produção)
      ...(isHttps ? { auto_return: "approved" } : {}),
      notification_url: `${notificationBaseUrl()}/api/webhooks/mercadopago?source_news=webhooks`,
      statement_descriptor: "NKSTORE",
      payment_methods: { installments: 6 },
      ...(order.reservationExpiresAt
        ? {
            expires: true,
            expiration_date_to: order.reservationExpiresAt.toISOString(),
            date_of_expiration: order.reservationExpiresAt.toISOString(),
          }
        : {}),
    },
    requestOptions: { idempotencyKey: `pref-${order.accessToken}` },
  });

  const url = pref.init_point ?? pref.sandbox_init_point;
  if (!pref.id || !url) throw new Error("Mercado Pago não retornou o link de pagamento.");
  return { id: pref.id, url };
}

export type VerifiedPayment = {
  id: string;
  status: string;
  externalReference: string | null;
  amount: number; // centavos
  currency: string;
  paymentTypeId: string | null;
  paymentMethodId: string | null;
};

/** Consulta o pagamento direto na API do Mercado Pago (fonte da verdade). */
export async function getPayment(paymentId: string): Promise<VerifiedPayment> {
  const p = await new Payment(client()).get({ id: paymentId });
  return {
    id: String(p.id),
    status: p.status ?? "unknown",
    externalReference: p.external_reference ?? null,
    // o MP separa produtos (transaction_amount) e frete (shipping_amount).
    // Não usamos total_paid_amount porque ele inclui juros de parcelamento.
    amount: Math.round(((p.transaction_amount ?? 0) + (p.shipping_amount ?? 0)) * 100),
    currency: p.currency_id ?? "",
    paymentTypeId: p.payment_type_id ?? null,
    paymentMethodId: p.payment_method_id ?? null,
  };
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Pix",
  ticket: "Boleto",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  account_money: "Saldo Mercado Pago",
  prepaid_card: "Cartão pré-pago",
};
