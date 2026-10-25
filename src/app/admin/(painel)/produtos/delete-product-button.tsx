"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteProduct } from "./actions";

export function DeleteProductButton({ productId, name }: { productId: string; name: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className="btn btn-sm border border-danger/30 text-danger hover:bg-danger hover:text-white">
        <Trash2 className="size-3.5" aria-hidden /> Excluir
      </button>
      <dialog
        ref={ref}
        aria-labelledby="excluir-titulo"
        className="m-auto w-[min(92vw,420px)] rounded-[var(--radius-card)] bg-surface p-6 backdrop:bg-ink/60"
        onClose={() => setError(null)}
      >
        <h2 id="excluir-titulo" className="display text-2xl">Excluir produto?</h2>
        <p className="mt-2 text-sm text-muted">
          <strong className="text-ink">{name}</strong> será removido permanentemente, com imagens e estoque. Essa ação não pode ser desfeita.
        </p>
        {error && <p role="alert" className="mt-3 rounded-xl bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => ref.current?.close()} className="btn-outline btn-sm" autoFocus>
            Cancelar
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await deleteProduct(productId);
                if (res?.message) setError(res.message);
              })
            }
            className="btn btn-sm bg-danger text-white hover:bg-danger/90"
          >
            {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />} Excluir definitivamente
          </button>
        </div>
      </dialog>
    </>
  );
}
