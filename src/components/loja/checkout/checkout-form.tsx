"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, Lock, Tag, Truck, X } from "lucide-react";
import { ShirtImage } from "@/components/shirt-image";
import { cart, cartSubtotal, useCart } from "@/lib/cart/store";
import { formatCep, formatCpf, formatPhone, onlyDigits, pluralDays } from "@/lib/format";
import { formatBRL } from "@/lib/money";
import { useHydrated } from "@/lib/use-hydrated";
import { checkoutSchema, UFS } from "@/lib/validators/checkout";

type ShippingOption = { id: string; name: string; company: string; price: number; days: number; free?: boolean };
type Fields = {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
};

const DRAFT_KEY = "nk-checkout-contato-v1";
const EMPTY: Fields = { name: "", email: "", phone: "", cpf: "", zipCode: "", street: "", number: "", complement: "", district: "", city: "", state: "" };

function loadDraft(): Partial<Fields> {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function CheckoutForm() {
  const hydrated = useHydrated();
  const state = useCart();
  if (!hydrated) return <div className="mt-8 h-96 animate-pulse rounded-[var(--radius-card)] bg-line/60" aria-label="Carregando" />;
  if (state.items.length === 0) {
    return (
      <div className="mt-10 rounded-[var(--radius-xl2)] border border-dashed border-line bg-surface px-6 py-16 text-center">
        <p className="display text-3xl">Seu carrinho está vazio</p>
        <Link href="/produtos" className="btn-lime mt-6">Ver camisas</Link>
      </div>
    );
  }
  return <CheckoutInner />;
}

function CheckoutInner() {
  const state = useCart();
  // contato salvo neste navegador (só nome/e-mail/telefone, nunca CPF)
  const [f, setF] = useState<Fields>(() => ({ ...EMPTY, ...loadDraft(), zipCode: formatCep(cart.get().cep) }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [options, setOptions] = useState<ShippingOption[] | null>(null);
  const [shippingId, setShippingId] = useState<string | null>(state.shippingOptionId);
  const [shippingMsg, setShippingMsg] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const items = state.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }));
  const itemsKey = JSON.stringify(items);
  const cepDigits = onlyDigits(f.zipCode);

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let v = e.target.value;
    if (k === "phone") v = formatPhone(v);
    if (k === "cpf") v = formatCpf(v);
    if (k === "zipCode") v = formatCep(v);
    setF((prev) => ({ ...prev, [k]: v }));
    setFormError(null);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[k];
      return next;
    });
  };

  // CEP completo: preenche o endereço e cota o frete
  useEffect(() => {
    if (cepDigits.length !== 8) return;
    const ctrl = new AbortController();
    fetch(`/api/cep/${cepDigits}`, { signal: ctrl.signal })
      .then(async (r) => {
        if (r.status === 404) {
          setErrors((e) => ({ ...e, zipCode: "CEP não encontrado." }));
          return;
        }
        if (!r.ok) return;
        const a = await r.json();
        setF((prev) => ({
          ...prev,
          street: a.street || prev.street,
          district: a.district || prev.district,
          city: a.city || prev.city,
          state: a.state || prev.state,
        }));
      })
      .catch(() => {});

    const productItems = new Map<string, number>();
    for (const i of cart.get().items) productItems.set(i.productId, (productItems.get(i.productId) ?? 0) + i.quantity);
    fetch("/api/frete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cep: cepDigits, items: [...productItems].map(([productId, quantity]) => ({ productId, quantity: Math.min(quantity, 10) })) }),
      signal: ctrl.signal,
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setOptions(null);
          setShippingMsg(data.error ?? "Não foi possível calcular o frete.");
          return;
        }
        setShippingMsg(null);
        setOptions(data.options);
        setShippingId((cur) => (data.options.some((o: ShippingOption) => o.id === cur) ? cur : (data.options[0]?.id ?? null)));
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [cepDigits, itemsKey]);

  const shipping = options?.find((o) => o.id === shippingId) ?? null;
  const subtotal = cartSubtotal(state);
  const discount = Math.min(coupon?.discount ?? 0, subtotal);
  const total = subtotal - discount + (shipping?.price ?? 0);

  async function applyCoupon() {
    setCouponMsg(null);
    if (!couponInput.trim()) return;
    const res = await fetch("/api/cupom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: couponInput, items }),
    });
    const data = await res.json();
    if (!res.ok) {
      setCoupon(null);
      setCouponMsg(data.error ?? "Cupom inválido.");
      return;
    }
    setCoupon({ code: data.code, discount: data.discount });
    setCouponInput("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const payload = {
      customer: { name: f.name, email: f.email, phone: f.phone, cpf: f.cpf },
      address: { zipCode: f.zipCode, street: f.street, number: f.number, complement: f.complement, district: f.district, city: f.city, state: f.state },
      items,
      shippingOptionId: shippingId ?? "",
      couponCode: coupon?.code ?? "",
    };
    const check = checkoutSchema.safeParse(payload);
    if (!check.success) {
      const errs: Record<string, string> = {};
      for (const issue of check.error.issues) {
        const key = String(issue.path[issue.path.length - 1]);
        if (!errs[key]) errs[key] = issue.message;
      }
      setErrors(errs);
      setFormError("Confira os campos destacados.");
      document.getElementById(`f-${Object.keys(errs)[0]}`)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ name: f.name, email: f.email, phone: f.phone }));
    } catch {}
    cart.setShipping(cepDigits, shippingId);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitting(false);
        if (data.field === "couponCode") setCoupon(null);
        setFormError(data.error ?? "Não foi possível finalizar. Tente novamente.");
        return;
      }
      window.location.href = data.redirectUrl;
    } catch {
      setSubmitting(false);
      setFormError("Sem conexão. Verifique sua internet e tente novamente.");
    }
  }

  const field = (k: keyof Fields, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, className = "") => (
    <div className={className}>
      <label htmlFor={`f-${k}`} className="label">{label}</label>
      <input
        id={`f-${k}`}
        value={f[k]}
        onChange={set(k)}
        aria-invalid={!!errors[k]}
        aria-describedby={errors[k] ? `e-${k}` : undefined}
        className="input h-12"
        {...props}
      />
      {errors[k] && <p id={`e-${k}`} className="error-text">{errors[k]}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]">
      <div className="space-y-6">
        <section className="card" aria-labelledby="s-contato">
          <h2 id="s-contato" className="display mb-5 text-2xl"><span className="text-muted">1.</span> Seus dados</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {field("name", "Nome completo", { autoComplete: "name" }, "sm:col-span-2")}
            {field("email", "E-mail", { type: "email", autoComplete: "email", inputMode: "email" })}
            {field("phone", "Celular com DDD", { autoComplete: "tel-national", inputMode: "tel", placeholder: "(11) 98765-4321" })}
            {field("cpf", "CPF (opcional)", { inputMode: "numeric", placeholder: "000.000.000-00" })}
          </div>
          <p className="hint">Com o e-mail e o número do pedido você acompanha a entrega em “Acompanhar pedido”.</p>
        </section>

        <section className="card" aria-labelledby="s-endereco">
          <h2 id="s-endereco" className="display mb-5 text-2xl"><span className="text-muted">2.</span> Endereço de entrega</h2>
          <div className="grid gap-4 sm:grid-cols-6">
            {field("zipCode", "CEP", { autoComplete: "postal-code", inputMode: "numeric", placeholder: "00000-000" }, "sm:col-span-2")}
            {field("street", "Rua", { autoComplete: "address-line1" }, "sm:col-span-4")}
            {field("number", "Número", { autoComplete: "address-line2" }, "sm:col-span-2")}
            {field("complement", "Complemento (opcional)", { placeholder: "Apto, bloco..." }, "sm:col-span-4")}
            {field("district", "Bairro", {}, "sm:col-span-2")}
            {field("city", "Cidade", { autoComplete: "address-level2" }, "sm:col-span-3")}
            <div className="sm:col-span-1">
              <label htmlFor="f-state" className="label">UF</label>
              <select id="f-state" value={f.state} onChange={set("state")} aria-invalid={!!errors.state} className="input h-12" autoComplete="address-level1">
                <option value="">—</option>
                {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
              </select>
              {errors.state && <p className="error-text">{errors.state}</p>}
            </div>
          </div>
        </section>

        <section className="card" aria-labelledby="s-frete">
          <h2 id="s-frete" className="display mb-5 text-2xl"><span className="text-muted">3.</span> Frete</h2>
          {cepDigits.length !== 8 ? (
            <p className="text-sm text-muted">Informe o CEP para ver as opções de entrega.</p>
          ) : shippingMsg ? (
            <p className="text-sm font-semibold text-danger">{shippingMsg}</p>
          ) : !options ? (
            <p className="flex items-center gap-2 text-sm text-muted"><Loader2 className="size-4 animate-spin" aria-hidden /> Calculando frete...</p>
          ) : (
            <fieldset>
              <legend className="sr-only">Opções de frete</legend>
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
                {options.map((o) => (
                  <li key={o.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-4 py-4 transition has-[:checked]:bg-lime-soft">
                      <input type="radio" name="frete" checked={shippingId === o.id} onChange={() => setShippingId(o.id)} className="size-4 accent-ink" />
                      <Truck className="size-4 text-muted" aria-hidden />
                      <span className="flex-1">
                        <span className="block text-sm font-semibold">{o.name}</span>
                        <span className="block text-xs text-muted">até {pluralDays(o.days)} · {o.company}</span>
                      </span>
                      <span className={`text-sm font-bold ${o.free ? "text-success" : ""}`}>{o.free ? "Grátis" : formatBRL(o.price)}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          )}
          {errors.shippingOptionId && <p className="error-text">{errors.shippingOptionId}</p>}
        </section>
      </div>

      <aside aria-labelledby="s-resumo" className="lg:sticky lg:top-28 lg:self-start">
        <div className="card">
          <h2 id="s-resumo" className="display text-2xl">Resumo do pedido</h2>
          <ul className="mt-4 divide-y divide-line">
            {state.items.map((i) => (
              <li key={i.variantId} className="flex gap-3 py-3">
                <div className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-lg bg-line">
                  {i.image && <ShirtImage src={i.image} alt="" fill sizes="56px" className="object-cover" />}
                  <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-ink text-[10px] font-bold text-white">{i.quantity}</span>
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold leading-snug">{i.name}</p>
                  <p className="text-xs text-muted">Tamanho {i.size}</p>
                </div>
                <p className="text-sm font-semibold">{formatBRL(i.unitPrice * i.quantity)}</p>
              </li>
            ))}
          </ul>

          <div className="mt-2 border-t border-line pt-4">
            {coupon ? (
              <p className="flex items-center justify-between rounded-xl bg-lime-soft px-3 py-2 text-sm">
                <span className="flex items-center gap-2 font-semibold"><Tag className="size-4" aria-hidden /> {coupon.code}</span>
                <button type="button" onClick={() => setCoupon(null)} className="grid size-7 place-items-center rounded-full hover:bg-ink/10" aria-label="Remover cupom">
                  <X className="size-4" aria-hidden />
                </button>
              </p>
            ) : (
              <div className="flex gap-2">
                <label htmlFor="cupom" className="sr-only">Cupom de desconto</label>
                <input
                  id="cupom"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void applyCoupon();
                    }
                  }}
                  placeholder="Cupom de desconto"
                  className="input"
                />
                <button type="button" onClick={() => void applyCoupon()} className="btn-outline h-11 px-4">Aplicar</button>
              </div>
            )}
            {couponMsg && <p role="alert" className="error-text">{couponMsg}</p>}
          </div>

          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="font-semibold">{formatBRL(subtotal)}</dd></div>
            {discount > 0 && (
              <div className="flex justify-between text-success"><dt>Desconto</dt><dd className="font-semibold">− {formatBRL(discount)}</dd></div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted">Frete</dt>
              <dd className="font-semibold">{shipping ? (shipping.free ? <span className="text-success">Grátis</span> : formatBRL(shipping.price)) : "—"}</dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <dt className="font-semibold">Total</dt>
              <dd className="text-2xl font-bold">{formatBRL(total)}</dd>
            </div>
          </dl>

          {formError && <p role="alert" className="mt-4 rounded-xl bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">{formError}</p>}

          <button type="submit" disabled={submitting} className="btn-lime mt-5 h-14 w-full text-base">
            {submitting ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Lock className="size-4" aria-hidden />}
            {submitting ? "Gerando pagamento..." : "Ir para o pagamento"}
          </button>
          <p className="mt-3 text-center text-xs text-muted">
            Você será levado ao Mercado Pago para pagar com Pix, cartão ou boleto. O valor final é conferido no servidor.
          </p>
        </div>
      </aside>
    </form>
  );
}
