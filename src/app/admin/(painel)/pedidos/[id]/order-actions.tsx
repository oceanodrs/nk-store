"use client";

import { startTransition, useActionState, useState, useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { ORDER_STATUS_LABELS, STATUS_TRANSITIONS, type OrderStatus } from "@/lib/constants";
import type { FormState } from "@/lib/validators/admin";
import { changeOrderStatus, saveTrackingCode, verifyOrderPayment } from "../actions";

function Message({ state }: { state: FormState }) {
  if (!state.message) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={`text-sm font-semibold ${state.ok ? "text-success" : "text-danger"}`}>
      {state.message}
    </p>
  );
}

export function StatusForm({ orderId, status, trackingCode }: { orderId: number; status: string; trackingCode: string | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(changeOrderStatus.bind(null, orderId), {});
  const options = STATUS_TRANSITIONS[status as OrderStatus] ?? [];
  const [to, setTo] = useState<string>(options[0] ?? "");
  const wasPaid = status !== "AWAITING_PAYMENT";

  if (options.length === 0) {
    return <p className="text-sm text-muted">Este pedido está finalizado. Não há próximos status.</p>;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        if (to === "CANCELED" && !confirm("Cancelar este pedido? Essa ação não pode ser desfeita.")) return;
        startTransition(() => action(data));
      }}
      className="space-y-4"
    >
      <div>
        <label htmlFor="to" className="label">Novo status</label>
        <select id="to" name="to" value={to} onChange={(e) => setTo(e.target.value)} className="input">
          {options.map((s) => (
            <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {to === "SHIPPED" && (
        <div>
          <label htmlFor="status-tracking" className="label">Código de rastreio</label>
          <input id="status-tracking" name="trackingCode" defaultValue={trackingCode ?? ""} placeholder="Ex.: AA123456789BR" className="input uppercase" required />
        </div>
      )}

      {to === "CANCELED" && wasPaid && (
        <div className="rounded-xl bg-warning/10 p-3 text-sm">
          <p className="font-semibold text-warning">Pedido já pago</p>
          <p className="mt-1 text-ink/80">O estorno precisa ser feito no painel do Mercado Pago.</p>
          <label className="mt-3 flex cursor-pointer items-center gap-2 font-medium">
            <input type="checkbox" name="restock" defaultChecked className="size-4 accent-ink" /> Devolver os itens ao estoque
          </label>
        </div>
      )}

      <div>
        <label htmlFor="note" className="label">Observação interna <span className="font-normal text-muted">— opcional</span></label>
        <input id="note" name="note" maxLength={300} className="input" placeholder="Aparece no histórico do pedido" />
      </div>

      <button type="submit" disabled={pending} className={`h-11 w-full ${to === "CANCELED" ? "btn bg-danger text-white hover:bg-danger/90" : "btn-dark"}`}>
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {to === "CANCELED" ? "Cancelar pedido" : `Marcar como “${ORDER_STATUS_LABELS[to as OrderStatus]}”`}
      </button>
      <Message state={state} />
    </form>
  );
}

export function TrackingForm({ orderId, trackingCode }: { orderId: number; trackingCode: string | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveTrackingCode.bind(null, orderId), {});
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="space-y-3"
    >
      <label htmlFor="tracking" className="label">Código de rastreio</label>
      <div className="flex gap-2">
        <input id="tracking" name="trackingCode" defaultValue={trackingCode ?? ""} placeholder="AA123456789BR" className="input uppercase" />
        <button type="submit" disabled={pending} className="btn-outline h-11 px-4">
          {pending ? <Loader2 className="size-4 animate-spin" aria-label="Salvando" /> : "Salvar"}
        </button>
      </div>
      <Message state={state} />
    </form>
  );
}

export function VerifyPaymentButton({ orderId }: { orderId: number }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<FormState>({});
  return (
    <div className="space-y-2">
      <button type="button" disabled={pending} onClick={() => start(async () => setState(await verifyOrderPayment(orderId)))} className="btn-outline h-11 w-full">
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RefreshCw className="size-4" aria-hidden />}
        Verificar pagamento no Mercado Pago
      </button>
      <Message state={state} />
    </div>
  );
}
