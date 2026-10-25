"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { SIZES } from "@/lib/constants";
import { slugify } from "@/lib/product-fields";
import type { FormState } from "@/lib/validators/admin";
import { saveProduct } from "./actions";
import { ImageManager, type ManagedImage } from "./image-manager";

export type ProductFormValues = {
  id: string | null;
  name: string;
  slug: string;
  categoryId: string;
  description: string;
  price: string;
  salePrice: string;
  weightGrams: number;
  active: boolean;
  featured: boolean;
  stock: Record<string, number>;
  reserved: Record<string, number>;
  images: ManagedImage[];
};

type Props = {
  values: ProductFormValues;
  categories: { id: string; name: string }[];
  /** mensagem inicial (ex.: "Produto criado"), substituída pela do próximo salvamento */
  initialMessage?: string;
};

export function ProductForm({ values, categories, initialMessage }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    saveProduct.bind(null, values.id),
    initialMessage ? { ok: true, message: initialMessage } : {},
  );
  const [name, setName] = useState(values.name);
  const [slug, setSlug] = useState(values.slug);
  // o slug acompanha o nome até ser editado manualmente (só em produto novo)
  const [slugTouched, setSlugTouched] = useState(!!values.id);
  const e = state.errors ?? {};

  const err = (field: string) =>
    e[field] ? (
      <p id={`${field}-erro`} className="error-text">
        {e[field]}
      </p>
    ) : null;
  const aria = (field: string) => ({
    "aria-invalid": !!e[field],
    "aria-describedby": e[field] ? `${field}-erro` : undefined,
  });

  return (
    <form
      // onSubmit (em vez de action=) evita que o React limpe os campos após um erro de validação
      onSubmit={(ev) => {
        ev.preventDefault();
        const data = new FormData(ev.currentTarget);
        startTransition(() => action(data));
      }}
      className="grid gap-6 lg:grid-cols-[1fr_340px]"
      noValidate
    >
      <div className="space-y-6">
        {state.message && (
          <p role={state.ok ? "status" : "alert"} className={`rounded-xl px-4 py-3 text-sm font-semibold ${state.ok ? "bg-lime-soft" : "bg-danger/10 text-danger"}`}>
            {state.message}
          </p>
        )}

        <section className="card space-y-5" aria-labelledby="sec-info">
          <h2 id="sec-info" className="display text-2xl">Informações</h2>
          <div>
            <label htmlFor="name" className="label">Nome do produto</label>
            <input
              id="name"
              name="name"
              value={name}
              onChange={(ev) => {
                setName(ev.target.value);
                if (!slugTouched) setSlug(slugify(ev.target.value));
              }}
              className="input"
              {...aria("name")}
            />
            {err("name")}
          </div>
          <div>
            <label htmlFor="slug" className="label">Endereço na loja (slug)</label>
            <div className="flex items-center overflow-hidden rounded-xl border border-line bg-paper focus-within:border-ink">
              <span className="hidden pl-3.5 text-sm text-muted sm:block">/produto/</span>
              <input
                id="slug"
                name="slug"
                value={slug}
                onChange={(ev) => {
                  setSlugTouched(true);
                  setSlug(ev.target.value.toLowerCase());
                }}
                className="h-11 w-full bg-surface px-3 text-sm outline-none sm:pl-1"
                {...aria("slug")}
              />
            </div>
            {err("slug") ?? <p className="hint">Gerado a partir do nome. Mudar depois quebra links já compartilhados.</p>}
          </div>
          <div>
            <label htmlFor="categoryId" className="label">Categoria</label>
            <select id="categoryId" name="categoryId" defaultValue={values.categoryId} className="input" {...aria("categoryId")}>
              <option value="">Selecione...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {err("categoryId")}
          </div>
          <div>
            <label htmlFor="description" className="label">Descrição</label>
            <textarea id="description" name="description" defaultValue={values.description} rows={7} className="textarea" {...aria("description")} />
            {err("description") ?? <p className="hint">A primeira linha aparece como resumo. Use “•” no início das linhas para listar detalhes.</p>}
          </div>
        </section>

        <section className="card" aria-labelledby="sec-imagens">
          <h2 id="sec-imagens" className="display mb-4 text-2xl">Imagens</h2>
          <ImageManager initial={values.images} productName={name} error={e.images ?? Object.entries(e).find(([k]) => k.startsWith("images."))?.[1]} />
        </section>

        <section className="card" aria-labelledby="sec-estoque">
          <h2 id="sec-estoque" className="display text-2xl">Estoque por tamanho</h2>
          <p className="hint mb-4">Unidades disponíveis para venda. Reservas de pedidos aguardando pagamento aparecem abaixo de cada tamanho.</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {SIZES.map((s) => (
              <div key={s}>
                <label htmlFor={`stock_${s}`} className="label text-center">{s}</label>
                <input
                  id={`stock_${s}`}
                  name={`stock_${s}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  defaultValue={values.stock[s] ?? 0}
                  className="input text-center"
                  {...aria(`stock.${s}`)}
                />
                {values.reserved[s] > 0 && <p className="hint text-center">{values.reserved[s]} reservada(s)</p>}
                {err(`stock.${s}`)}
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
        <section className="card space-y-5" aria-labelledby="sec-preco">
          <h2 id="sec-preco" className="display text-2xl">Preço</h2>
          <div>
            <label htmlFor="price" className="label">Preço (R$)</label>
            <input id="price" name="price" inputMode="decimal" placeholder="199,90" defaultValue={values.price} className="input" {...aria("price")} />
            {err("price")}
          </div>
          <div>
            <label htmlFor="salePrice" className="label">Preço promocional (R$) <span className="font-normal text-muted">— opcional</span></label>
            <input id="salePrice" name="salePrice" inputMode="decimal" placeholder="Deixe vazio se não houver" defaultValue={values.salePrice} className="input" {...aria("salePrice")} />
            {err("salePrice")}
          </div>
          <div>
            <label htmlFor="weightGrams" className="label">Peso para frete (gramas)</label>
            <input id="weightGrams" name="weightGrams" type="number" inputMode="numeric" min={50} defaultValue={values.weightGrams} className="input" {...aria("weightGrams")} />
            {err("weightGrams")}
          </div>
        </section>

        <section className="card space-y-4" aria-labelledby="sec-visibilidade">
          <h2 id="sec-visibilidade" className="display text-2xl">Visibilidade</h2>
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" name="active" defaultChecked={values.active} className="mt-0.5 size-5 accent-ink" />
            <span>
              <span className="block text-sm font-semibold">Ativo na loja</span>
              <span className="block text-xs text-muted">Desmarque para esconder sem excluir.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" name="featured" defaultChecked={values.featured} className="mt-0.5 size-5 accent-ink" />
            <span>
              <span className="block text-sm font-semibold">Destaque</span>
              <span className="block text-xs text-muted">Aparece na home e no topo da ordenação por relevância.</span>
            </span>
          </label>
        </section>

        <div className="flex gap-3">
          <button type="submit" disabled={pending} className="btn-lime h-12 flex-1">
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {pending ? "Salvando..." : values.id ? "Salvar alterações" : "Criar produto"}
          </button>
          <Link href="/admin/produtos" className="btn-outline h-12">Cancelar</Link>
        </div>
      </div>
    </form>
  );
}
