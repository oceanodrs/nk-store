import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";

const TONES: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: "bg-warning/10 text-warning",
  PAID: "bg-lime-soft text-ink",
  PICKING: "bg-sky-100 text-sky-900",
  SHIPPED: "bg-indigo-100 text-indigo-900",
  DELIVERED: "bg-success/10 text-success",
  CANCELED: "bg-danger/10 text-danger",
};

export function StatusBadge({ status }: { status: string }) {
  const s = status as OrderStatus;
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${TONES[s] ?? "bg-line text-ink"}`}>
      {ORDER_STATUS_LABELS[s] ?? status}
    </span>
  );
}
