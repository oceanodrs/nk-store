"use client";

import { startTransition, useActionState, useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { slugify } from "@/lib/product-fields";
import type { FormState } from "@/lib/validators/admin";
import { deleteCategory, saveCategory } from "./actions";

type Values = {
  id: string | null;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  active: boolean;
  productCount: number;
};

export function CategoryForm({ values }: { values: Values }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveCategory.bind(null, values.id), {});
  const [deleting, startDelete] = useTransition();
  const [deleteMsg, setDeleteMsg] = useState<FormState | null>(null);
  const [name, setName] = useState(values.name);
  const [slug, setSlug] = useState(values.slug);
  const [slugTouched, setSlugTouched] = useState(!!values.id);
  const [resetKey, setResetKey] = useState(0);
  const [handled, setHandled] = useState(state);
  const prefix = values.id ?? "nova";
  const e = state.errors ?? {};
  const message = deleteMsg ?? state;

  // depois de criar com sucesso, limpa o formulário de "nova categoria"
  if (state !== handled) {
    setHandled(state);
    if (state.ok && !values.id) {
      setName("");
      setSlug("");
      setSlugTouched(false);
      setResetKey((k) => k + 1);
    }
  }

  return (
    <form
      key={resetKey}
      onSubmit={(ev) => {
        ev.preventDefault();
        const data = new FormData(ev.currentTarget);
        setDeleteMsg(null);
        startTransition(() => action(data));
      }}
      className="card grid gap-4 sm:grid-cols-2"
      noValidate
      aria-label={values.id ? `Categoria ${values.name}` : "Nova categoria"}
    >
      <div>
        <label htmlFor={`${prefix}-name`} className="label">Nome</label>
        <input
          id={`${prefix}-name`}
          name="name"
          value={name}
          onChange={(ev) => {
            setName(ev.target.value);
            if (!slugTouched) setSlug(slugify(ev.target.value));
          }}
          className="input"
          aria-invalid={!!e.name}
        />
        {e.name && <p className="error-text">{e.name}</p>}
      </div>
      <div>
        <label htmlFor={`${prefix}-slug`} className="label">Slug (endereço)</label>
        <input
          id={`${prefix}-slug`}
          name="slug"
          value={slug}
          onChange={(ev) => {
            setSlugTouched(true);
            setSlug(ev.target.value.toLowerCase());
          }}
          className="input"
          aria-invalid={!!e.slug}
        />
        {e.slug ? <p className="error-text">{e.slug}</p> : <p className="hint">/categoria/{slug || "..."}</p>}
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${prefix}-description`} className="label">Descrição <span className="font-normal text-muted">— opcional</span></label>
        <input id={`${prefix}-description`} name="description" defaultValue={values.description} className="input" />
      </div>
      <div className="flex flex-wrap items-end gap-6">
        <div className="w-28">
          <label htmlFor={`${prefix}-order`} className="label">Ordem</label>
          <input id={`${prefix}-order`} name="sortOrder" type="number" min={0} defaultValue={values.sortOrder} className="input" />
        </div>
        <label className="flex h-11 cursor-pointer items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="active" defaultChecked={values.active} className="size-5 accent-ink" /> Ativa na loja
        </label>
      </div>
      <div className="flex flex-wrap items-end justify-end gap-2">
        {values.id && (
          <span className="mr-auto self-center text-xs text-muted">
            {values.productCount} {values.productCount === 1 ? "produto" : "produtos"}
          </span>
        )}
        {values.id && (
          <button
            type="button"
            disabled={deleting}
            onClick={() => {
              if (!confirm(`Excluir a categoria "${values.name}"?`)) return;
              startDelete(async () => setDeleteMsg(await deleteCategory(values.id!)));
            }}
            className="btn btn-sm border border-danger/30 text-danger hover:bg-danger hover:text-white"
          >
            <Trash2 className="size-3.5" aria-hidden /> Excluir
          </button>
        )}
        <button type="submit" disabled={pending} className={values.id ? "btn-dark btn-sm" : "btn-lime"}>
          {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
          {values.id ? "Salvar" : "Criar categoria"}
        </button>
      </div>
      {message.message && (
        <p role={message.ok ? "status" : "alert"} className={`text-sm font-semibold sm:col-span-2 ${message.ok ? "text-success" : "text-danger"}`}>
          {message.message}
        </p>
      )}
    </form>
  );
}
