"use client";

import { useTransition } from "react";
import { toggleProductActive } from "./actions";

export function ToggleActiveButton({ productId, active, name }: { productId: string; active: boolean; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={`${name}: ${active ? "ativo na loja" : "inativo"}`}
      disabled={pending}
      onClick={() => start(() => toggleProductActive(productId))}
      className="group inline-flex items-center gap-2 text-xs font-semibold disabled:opacity-50"
    >
      <span className={`relative h-6 w-11 rounded-full transition ${active ? "bg-success" : "bg-line"}`}>
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${active ? "left-[22px]" : "left-0.5"}`}
        />
      </span>
      <span className={active ? "text-success" : "text-muted"}>{active ? "Ativo" : "Inativo"}</span>
    </button>
  );
}
