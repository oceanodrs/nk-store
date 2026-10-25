"use client";

import { useActionState } from "react";
import { Loader2, Search } from "lucide-react";
import { trackOrder, type TrackState } from "./actions";

export function TrackForm() {
  const [state, action, pending] = useActionState<TrackState, FormData>(trackOrder, {});
  return (
    <form action={action} className="card mt-8 space-y-5">
      <div>
        <label htmlFor="number" className="label">Número do pedido</label>
        <input id="number" name="number" required placeholder="NK-000123" className="input h-12 uppercase" autoComplete="off" />
        <p className="hint">Aparece na página exibida logo após o pagamento (ex.: NK-000123).</p>
      </div>
      <div>
        <label htmlFor="email" className="label">E-mail usado na compra</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input h-12" />
      </div>
      <p role="alert" className="min-h-5 text-sm font-semibold text-danger">{state.error}</p>
      <button type="submit" disabled={pending} className="btn-dark h-12 w-full">
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Search className="size-4" aria-hidden />}
        Acompanhar pedido
      </button>
    </form>
  );
}
