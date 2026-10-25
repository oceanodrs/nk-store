import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const OG_SIZE = { width: 1200, height: 630 };

/**
 * Converte uma imagem do catálogo em data URI para o gerador de Open Graph.
 * Aceita SVG/PNG/JPG locais (public/ ou uploads). Outros formatos (WebP/AVIF,
 * que o gerador não lê) ou URLs externas retornam null e a imagem é omitida.
 */
export async function imageDataUri(url: string | null | undefined) {
  if (!url) return null;
  const types: Record<string, string> = { svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg" };
  const ext = url.split(".").pop()?.toLowerCase() ?? "";
  if (!types[ext]) return null;

  let file: string | null = null;
  if (/^\/products\/[\w.-]+$/.test(url)) file = path.join(process.cwd(), "public", url);
  if (/^\/uploads\/[\w.-]+$/.test(url)) file = path.join(process.cwd(), "storage", url);
  if (!file) return null;
  try {
    const data = await readFile(file);
    return `data:${types[ext]};base64,${data.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Faixas diagonais da identidade visual, como fundo das imagens de compartilhamento. */
export const stripesBackground =
  "repeating-linear-gradient(-55deg, rgba(255,255,255,0) 0px, rgba(255,255,255,0) 28px, rgba(255,255,255,0.045) 28px, rgba(255,255,255,0.045) 56px)";
