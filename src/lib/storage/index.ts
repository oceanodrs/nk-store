import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // 4 MB

const TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
} as const;
type AllowedType = keyof typeof TYPES;

/**
 * Descobre o tipo real pelos primeiros bytes (assinatura do arquivo), sem
 * confiar na extensão nem no Content-Type enviados pelo navegador.
 * SVG é recusado de propósito: pode conter scripts.
 */
export function sniffImageType(buf: Uint8Array): AllowedType | null {
  const at = (i: number, bytes: number[]) => bytes.every((b, j) => buf[i + j] === b);
  if (at(0, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (at(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (at(0, [0x52, 0x49, 0x46, 0x46]) && at(8, [0x57, 0x45, 0x42, 0x50])) return "image/webp";
  if (at(4, [0x66, 0x74, 0x79, 0x70]) && (at(8, [0x61, 0x76, 0x69, 0x66]) || at(8, [0x61, 0x76, 0x69, 0x73])))
    return "image/avif";
  return null;
}

export type StoredFile = { url: string };

interface StorageDriver {
  save(data: Uint8Array, type: AllowedType): Promise<StoredFile>;
}

/** Pasta dos uploads locais. Fica fora de public/ porque o Next só serve
 * arquivos de public/ que já existiam no build; a rota /uploads/[arquivo] os entrega. */
export const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads");

export const UPLOAD_CONTENT_TYPES: Record<string, AllowedType> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

/** Desenvolvimento: grava em storage/uploads (não funciona na Vercel, que é somente leitura). */
const localDriver: StorageDriver = {
  async save(data, type) {
    await mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
    const name = `${randomUUID()}.${TYPES[type]}`;
    await writeFile(path.join(LOCAL_UPLOAD_DIR, name), data);
    return { url: `/uploads/${name}` };
  },
};

/** Produção: Vercel Blob (precisa de BLOB_READ_WRITE_TOKEN). */
const vercelBlobDriver: StorageDriver = {
  async save(data, type) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`produtos/${randomUUID()}.${TYPES[type]}`, Buffer.from(data), {
      access: "public",
      contentType: type,
    });
    return { url: blob.url };
  },
};

export function getStorage(): StorageDriver {
  return process.env.STORAGE_DRIVER === "vercel-blob" ? vercelBlobDriver : localDriver;
}
