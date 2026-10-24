import "server-only";

// Rate limit simples em memória (janela fixa por chave).
// Suficiente para desenvolvimento e um único servidor. Na Vercel (serverless),
// cada instância tem a própria memória: para limite global use Upstash Redis
// (veja README > Decisões).

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 5000) sweep(now);
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  bucket.count++;
  const ok = bucket.count <= limit;
  return {
    ok,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSec: ok ? 0 : Math.ceil((bucket.resetAt - now) / 1000),
  };
}

function sweep(now: number) {
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}

/** IP do cliente atrás de proxy (Vercel/ngrok enviam x-forwarded-for). */
export function clientIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "local";
}
