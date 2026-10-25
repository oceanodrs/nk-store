"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { ShirtImage } from "@/components/shirt-image";

export type ManagedImage = { url: string; alt: string };

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";
const MAX_BYTES = 4 * 1024 * 1024;

type Props = {
  initial: ManagedImage[];
  productName: string;
  error?: string;
};

/** Lista de imagens do produto. O resultado vai num campo oculto "images" (JSON). */
export function ImageManager({ initial, productName, error }: Props) {
  const [images, setImages] = useState<ManagedImage[]>(initial);
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploadError(null);
    const list = [...files].slice(0, 10 - images.length);
    for (const file of list) {
      if (file.size > MAX_BYTES) {
        setUploadError(`"${file.name}" tem mais de 4 MB.`);
        continue;
      }
      setUploading((n) => n + 1);
      try {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/admin/upload", { method: "POST", body });
        const data = await res.json();
        if (!res.ok) {
          setUploadError(data.error ?? "Falha no envio.");
          continue;
        }
        setImages((prev) => [...prev, { url: data.url, alt: productName ? `${productName} — foto ${prev.length + 1}` : "" }]);
      } catch {
        setUploadError("Sem conexão. Tente novamente.");
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  const move = (from: number, to: number) =>
    setImages((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });

  return (
    <div>
      <input type="hidden" name="images" value={JSON.stringify(images)} />

      {images.length > 0 && (
        <ol className="mb-4 space-y-3">
          {images.map((img, i) => (
            <li key={img.url} className="flex items-start gap-3 rounded-2xl border border-line bg-paper/50 p-3">
              <div className="relative aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-lg bg-line">
                <ShirtImage src={img.url} alt="" fill sizes="64px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <label htmlFor={`alt-${i}`} className="text-xs font-semibold">
                  {i === 0 ? "Imagem principal · " : `Imagem ${i + 1} · `}texto alternativo
                </label>
                <input
                  id={`alt-${i}`}
                  value={img.alt}
                  onChange={(e) => setImages((prev) => prev.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))}
                  placeholder="Ex.: Camisa azul vista de frente"
                  className="input mt-1 h-9"
                  aria-invalid={img.alt.trim().length < 3}
                />
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} className="grid size-8 place-items-center rounded-lg hover:bg-ink/5 disabled:opacity-25" aria-label={`Mover imagem ${i + 1} para cima`}>
                  <ArrowUp className="size-4" aria-hidden />
                </button>
                <button type="button" onClick={() => move(i, i + 1)} disabled={i === images.length - 1} className="grid size-8 place-items-center rounded-lg hover:bg-ink/5 disabled:opacity-25" aria-label={`Mover imagem ${i + 1} para baixo`}>
                  <ArrowDown className="size-4" aria-hidden />
                </button>
                <button type="button" onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))} className="grid size-8 place-items-center rounded-lg text-danger hover:bg-danger/10" aria-label={`Remover imagem ${i + 1}`}>
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      {images.length < 10 && (
        <label
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line px-4 py-8 text-center transition hover:border-ink has-[:focus-visible]:border-ink"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void upload(e.dataTransfer.files);
          }}
        >
          {uploading > 0 ? <Loader2 className="size-6 animate-spin text-muted" aria-hidden /> : <ImagePlus className="size-6 text-muted" aria-hidden />}
          <span className="text-sm font-semibold">
            {uploading > 0 ? "Enviando..." : "Clique ou arraste fotos aqui"}
          </span>
          <span className="text-xs text-muted">JPG, PNG, WebP ou AVIF · até 4 MB cada · máximo 10 fotos</span>
          <input ref={inputRef} type="file" accept={ACCEPT} multiple className="sr-only" onChange={(e) => void upload(e.target.files)} />
        </label>
      )}

      <div aria-live="polite">
        {uploadError && <p className="error-text">{uploadError}</p>}
        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  );
}
