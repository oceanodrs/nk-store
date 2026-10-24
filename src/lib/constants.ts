export const SIZES = ["P", "M", "G", "GG", "XG"] as const;
export type Size = (typeof SIZES)[number];

export const ORDER_STATUSES = [
  "AWAITING_PAYMENT",
  "PAID",
  "PICKING",
  "SHIPPED",
  "DELIVERED",
  "CANCELED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: "Aguardando pagamento",
  PAID: "Pago",
  PICKING: "Em separação",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  CANCELED: "Cancelado",
};

export const COUPON_TYPES = ["PERCENT", "FIXED"] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

/** Estoque igual ou abaixo deste valor aparece como "estoque baixo". */
export const LOW_STOCK_THRESHOLD = 3;

/** Formata o id do pedido como NK-000123. */
export function formatOrderNumber(id: number) {
  return `NK-${String(id).padStart(6, "0")}`;
}

/** Converte "NK-000123", "nk123" ou "123" em 123. Retorna null se inválido. */
export function parseOrderNumber(input: string): number | null {
  const digits = input.trim().toUpperCase().replace(/^NK-?/, "");
  if (!/^\d{1,9}$/.test(digits)) return null;
  const n = Number(digits);
  return n > 0 ? n : null;
}
