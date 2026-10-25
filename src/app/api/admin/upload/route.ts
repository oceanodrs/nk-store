import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { jsonError, tooManyRequests } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { getStorage, MAX_UPLOAD_BYTES, sniffImageType } from "@/lib/storage";

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return jsonError("Não autorizado.", 401);

  const limit = rateLimit(`upload:${session.user.id}`, 60, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec);

  // recusa cedo pelo tamanho declarado, antes de ler o corpo
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES + 64 * 1024) return jsonError("Imagem muito grande. Máximo de 4 MB.", 413);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("Envio inválido.");
  }
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("Nenhuma imagem enviada.");
  if (file.size > MAX_UPLOAD_BYTES) return jsonError("Imagem muito grande. Máximo de 4 MB.", 413);

  const data = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(data);
  if (!type) return jsonError("Formato não suportado. Use JPG, PNG, WebP ou AVIF.", 415);

  try {
    const stored = await getStorage().save(data, type);
    return NextResponse.json(stored, { status: 201 });
  } catch (err) {
    console.error("[upload]", err);
    return jsonError("Não foi possível salvar a imagem. Tente novamente.", 500);
  }
}
