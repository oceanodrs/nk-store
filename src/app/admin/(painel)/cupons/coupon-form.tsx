"use client";

import { startTransition, useActionState, useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import type { FormState } from "@/lib/validators/admin";
import { deleteCoupon, saveCoupon } from "./actions";

export type CouponValues = {
  id: string | null;
  code: string;
  type: "PERCENT" | "FIXED";
  value: string;
  minSubtotal: string;
  startsAt: string;
  expiresAt: string;
  usageLimit: string;
  active: boolean;
  usedCount: number;
};

export function CouponForm({ values }: { values: CouponValues }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveCoupon.bind(null, values.id), {});
  const [type, setType] = useState(values.type);
  const [deleting, startDelete] = useTransition();
  const [deleteMsg, setDeleteMsg] = useState<FormState | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [handled, setHandled] = useState(state);
  const p = values.id ?? "novo";
  const e = state.errors ?? {};
  const message = deleteMsg ?? state;

  // depois de criar, limpa o formulário de "novo cupom"
  if (state !== handled) {
    setHandled(state);
    if (state.ok && !values.id) {
      setType("PERCENT");
      setResetKey((k) => k + 1);
    }
  }

  const err = (k: string) => (e[k] ? <p className="error-text">{e[k]}</p> : null);

  return (
    <form
      key={resetKey}
      onSubmit={(ev) => {
        ev.preventDefault();
        const data = new FormData(ev.currentTarget);
        setDeleteMsg(null);
        startTransition(() => action(data));
      }}
      noValidate
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div>
        <label htmlFor={`${p}-code`} className="label">Código</label>
        <input id={`${p}-code`} name="code" defaultValue={values.code} placeholder="EX.: VERAO15" className="input uppercase" aria-invalid={!!e.code} />
        {err("code")}
      </div>
      <div>
        <label htmlFor={`${p}-type`} className="label">Tipo</label>
        <select id={`${p}-type`} name="type" value={type} onChange={(ev) => setType(ev.target.value as CouponValues["type"])} className="input">
          <option value="PERCENT">Percentual (%)</option>
          <option value="FIXED">Valor fixo (R$)</option>
        </select>
      </div>
      <div>
        <label htmlFor={`${p}-value`} className="label">{type === "PERCENT" ? "Desconto (%)" : "Desconto (R$)"}</label>
        <input id={`${p}-value`} name="value" inputMode="decimal" defaultValue={values.value} placeholder={type === "PERCENT" ? "10" : "20,00"} className="input" aria-invalid={!!e.value} />
        {err("value")}
      </div>
      <div>
        <label htmlFor={`${p}-min`} className="label">Compra mínima (R$)</label>
        <input id={`${p}-min`} name="minSubtotal" inputMode="decimal" defaultValue={values.minSubtotal} placeholder="Opcional" className="input" aria-invalid={!!e.minSubtotal} />
        {err("minSubtotal")}
      </div>
      <div>
        <label htmlFor={`${p}-start`} className="label">Válido a partir de</label>
        <input id={`${p}-start`} name="startsAt" type="date" defaultValue={values.startsAt} className="input" />
      </div>
      <div>
        <label htmlFor={`${p}-end`} className="label">Válido até</label>
        <input id={`${p}-end`} name="expiresAt" type="date" defaultValue={values.expiresAt} className="input" aria-invalid={!!e.expiresAt} />
        {err("expiresAt")}
      </div>
      <div>
        <label htmlFor={`${p}-limit`} className="label">Limite de usos</label>
        <input id={`${p}-limit`} name="usageLimit" type="number" min={1} defaultValue={values.usageLimit} placeholder="Ilimitado" className="input" aria-invalid={!!e.usageLimit} />
        {err("usageLimit")}
      </div>
      <label className="flex h-11 cursor-pointer items-center gap-2 self-end text-sm font-semibold">
        <input type="checkbox" name="active" defaultChecked={values.active} className="size-5 accent-ink" /> Ativo
      </label>

      <div className="flex flex-wrap items-center justify-end gap-2 sm:col-span-2 lg:col-span-4">
        {message.message && (
          <p role={message.ok ? "status" : "alert"} className={`mr-auto text-sm font-semibold ${message.ok ? "text-success" : "text-danger"}`}>
            {message.message}
          </p>
        )}
        {values.id && (
          <button
            type="button"
            disabled={deleting}
            onClick={() => {
              if (!confirm(`Excluir o cupom ${values.code}?`)) return;
              startDelete(async () => setDeleteMsg(await deleteCoupon(values.id!)));
            }}
            className="btn btn-sm border border-danger/30 text-danger hover:bg-danger hover:text-white"
          >
            <Trash2 className="size-3.5" aria-hidden /> Excluir
          </button>
        )}
        <button type="submit" disabled={pending} className={values.id ? "btn-dark btn-sm" : "btn-lime"}>
          {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
          {values.id ? "Salvar" : "Criar cupom"}
        </button>
      </div>
    </form>
  );
}
