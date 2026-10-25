import { readFile } from "node:fs/promises";
import path from "node:path";
import { LOCAL_UPLOAD_DIR, UPLOAD_CONTENT_TYPES } from "@/lib/storage";

// Entrega as imagens enviadas pelo painel quando STORAGE_DRIVER=local.
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  // só nomes gerados pelo upload (uuid.ext): bloqueia "../" e afins
  const match = /^[0-9a-f-]{36}\.(jpg|png|webp|avif)$/.exec(file);
  if (!match) return new Response("Não encontrado", { status: 404 });

  try {
    const data = await readFile(path.join(LOCAL_UPLOAD_DIR, file));
    return new Response(data, {
      headers: {
        "Content-Type": UPLOAD_CONTENT_TYPES[match[1]],
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Não encontrado", { status: 404 });
  }
}
