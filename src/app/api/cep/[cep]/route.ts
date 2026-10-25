import { NextResponse } from "next/server";
import { jsonError, tooManyRequests } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { lookupCep } from "@/lib/viacep";

/** Preenchimento automático de endereço no checkout (ViaCEP). */
export async function GET(req: Request, { params }: { params: Promise<{ cep: string }> }) {
  const limit = rateLimit(`cep:${clientIp(req.headers)}`, 30, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec);

  const { cep } = await params;
  const result = await lookupCep(cep);
  if (result.status === "not_found") return jsonError("CEP não encontrado.", 404);
  if (result.status === "unavailable") return jsonError("Consulta de CEP indisponível. Preencha o endereço manualmente.", 503);
  return NextResponse.json(result.address);
}
