import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Valida o cabeçalho x-signature dos webhooks do Mercado Pago.
 * Formato: "ts=1704908010,v1=618c85345248dd820d5fd456117c2ab2ef8eda45a0282ff693eac24131a5e839"
 * Manifesto assinado: "id:{data.id};request-id:{x-request-id};ts:{ts};"
 * (data.id alfanumérico vai em minúsculas; partes ausentes são omitidas)
 * Doc: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 */
export function verifyMercadoPagoSignature(params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  secret: string;
  /** tolerância para o timestamp (ms); 0 desativa a checagem */
  maxAgeMs?: number;
  now?: number;
}): boolean {
  const { xSignature, xRequestId, dataId, secret } = params;
  if (!xSignature || !secret) return false;

  const parts = Object.fromEntries(
    xSignature.split(",").map((p) => {
      const [k, ...v] = p.trim().split("=");
      return [k, v.join("=")];
    }),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1 || !/^[0-9a-f]{64}$/i.test(v1)) return false;

  const maxAge = params.maxAgeMs ?? 0;
  if (maxAge > 0) {
    // o ts pode vir em segundos ou milissegundos
    const tsMs = ts.length <= 10 ? Number(ts) * 1000 : Number(ts);
    if (!Number.isFinite(tsMs) || Math.abs((params.now ?? Date.now()) - tsMs) > maxAge) return false;
  }

  let manifest = "";
  if (dataId) manifest += `id:${/^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId};`;
  if (xRequestId) manifest += `request-id:${xRequestId};`;
  manifest += `ts:${ts};`;

  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(v1.toLowerCase(), "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
