"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { ShirtImage } from "@/components/shirt-image";
import { formatCep } from "@/lib/format";
import type { FormState } from "@/lib/validators/admin";
import { saveSettings } from "./actions";

export type SettingsValues = {
  storeName: string;
  logoUrl: string;
  email: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  address: string;
  originZipCode: string;
  freeShippingThreshold: string;
};

export function SettingsForm({ values }: { values: SettingsValues }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveSettings, {});
  const [logo, setLogo] = useState(values.logoUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const e = state.errors ?? {};

  async function uploadLogo(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const body = new FormData();
    body.append("file", file);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = await res.json();
      if (res.ok) setLogo(data.url);
      else setUploadError(data.error ?? "Falha no envio.");
    } catch {
      setUploadError("Sem conexão.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const field = (name: keyof SettingsValues, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, hint?: string) => (
    <div>
      <label htmlFor={`s-${name}`} className="label">{label}</label>
      <input id={`s-${name}`} name={name} defaultValue={values[name]} className="input" aria-invalid={!!e[name]} {...props} />
      {e[name] ? <p className="error-text">{e[name]}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        const data = new FormData(ev.currentTarget);
        startTransition(() => action(data));
      }}
      noValidate
      className="space-y-6"
    >
      <input type="hidden" name="logoUrl" value={logo} />

      <section className="card space-y-5" aria-labelledby="sec-loja">
        <h2 id="sec-loja" className="display text-2xl">Loja</h2>
        {field("storeName", "Nome da loja")}
        <div>
          <p className="label">Logo <span className="font-normal text-muted">— opcional</span></p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative grid h-16 w-40 place-items-center overflow-hidden rounded-xl bg-ink">
              {logo ? (
                <ShirtImage src={logo} alt="Logo atual" fill sizes="160px" className="object-contain p-2" />
              ) : (
                <span className="text-xs text-white/60">Logo padrão (SVG)</span>
              )}
            </div>
            <button type="button" onClick={() => fileRef.current?.click()} className="btn-outline btn-sm" disabled={uploading}>
              {uploading ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <ImagePlus className="size-3.5" aria-hidden />} Enviar logo
            </button>
            {logo && (
              <button type="button" onClick={() => setLogo("")} className="btn btn-sm text-danger hover:bg-danger/10">
                <Trash2 className="size-3.5" aria-hidden /> Usar logo padrão
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/png,image/webp,image/jpeg,image/avif" className="sr-only" aria-label="Arquivo do logo" onChange={(ev) => void uploadLogo(ev.target.files?.[0])} />
          </div>
          {uploadError ? <p className="error-text">{uploadError}</p> : <p className="hint">PNG com fundo transparente fica melhor. Aparece no topo e no rodapé.</p>}
          {e.logoUrl && <p className="error-text">{e.logoUrl}</p>}
        </div>
      </section>

      <section className="card grid gap-5 sm:grid-cols-2" aria-labelledby="sec-contato">
        <h2 id="sec-contato" className="display text-2xl sm:col-span-2">Contato</h2>
        {field("email", "E-mail de atendimento", { type: "email" })}
        {field("phone", "Telefone", {}, "Como deve aparecer no site.")}
        {field("whatsapp", "WhatsApp", { inputMode: "numeric" }, "Com DDI e DDD, ex.: 5511987654321.")}
        {field("instagram", "Instagram", {}, "Só o usuário, sem @.")}
        <div className="sm:col-span-2">{field("address", "Endereço / cidade", {}, "Exibido na página de contato.")}</div>
      </section>

      <section className="card grid gap-5 sm:grid-cols-2" aria-labelledby="sec-frete">
        <h2 id="sec-frete" className="display text-2xl sm:col-span-2">Frete</h2>
        {field("originZipCode", "CEP de origem dos envios", { inputMode: "numeric", defaultValue: formatCep(values.originZipCode) })}
        {field("freeShippingThreshold", "Frete grátis acima de (R$)", { inputMode: "decimal", placeholder: "Vazio = sem frete grátis" }, "A opção de frete mais barata fica grátis.")}
      </section>

      <section className="card text-sm text-muted" aria-labelledby="sec-cred">
        <h2 id="sec-cred" className="display mb-2 text-2xl text-ink">Credenciais</h2>
        Chaves do Mercado Pago, do Melhor Envio e do armazenamento ficam <strong className="text-ink">somente nas variáveis de ambiente</strong> do servidor
        (arquivo .env ou painel da Vercel). Por segurança, nunca são salvas no banco nem exibidas aqui.
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending || uploading} className="btn-lime h-12 px-8">
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />} Salvar configurações
        </button>
        {state.message && (
          <p role={state.ok ? "status" : "alert"} className={`text-sm font-semibold ${state.ok ? "text-success" : "text-danger"}`}>{state.message}</p>
        )}
      </div>
    </form>
  );
}
