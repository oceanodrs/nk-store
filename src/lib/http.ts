import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function tooManyRequests(retryAfterSec: number) {
  return NextResponse.json(
    { error: "Muitas tentativas. Aguarde alguns instantes e tente novamente." },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
  );
}

/** Lê e valida o corpo JSON. Retorna os dados ou uma resposta de erro 400 pronta. */
export async function parseJson<T extends z.ZodType>(req: Request, schema: T) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { error: jsonError("Corpo da requisição inválido.") } as const;
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    return { error: jsonError(result.error.issues[0]?.message ?? "Dados inválidos.") } as const;
  }
  return { data: result.data as z.infer<T> } as const;
}
