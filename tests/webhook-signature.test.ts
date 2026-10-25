import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyMercadoPagoSignature } from "@/lib/payments/signature";

const SECRET = "segredo-de-teste";
const sign = (manifest: string, secret = SECRET) => createHmac("sha256", secret).update(manifest).digest("hex");

describe("verifyMercadoPagoSignature", () => {
  const ts = "1792896393";
  const requestId = "c58bf999-0003-4c0a-b1f9-36abe7d2cea3";
  const dataId = "185998715298";
  const valid = `ts=${ts},v1=${sign(`id:${dataId};request-id:${requestId};ts:${ts};`)}`;

  it("aceita assinatura correta no formato documentado", () => {
    expect(verifyMercadoPagoSignature({ xSignature: valid, xRequestId: requestId, dataId, secret: SECRET })).toBe(true);
  });

  it("aceita espaços após a vírgula no cabeçalho", () => {
    const spaced = valid.replace(",", ", ");
    expect(verifyMercadoPagoSignature({ xSignature: spaced, xRequestId: requestId, dataId, secret: SECRET })).toBe(true);
  });

  it("recusa segredo diferente", () => {
    expect(verifyMercadoPagoSignature({ xSignature: valid, xRequestId: requestId, dataId, secret: "outro" })).toBe(false);
  });

  it("recusa se o id do pagamento ou o request-id foram trocados", () => {
    expect(verifyMercadoPagoSignature({ xSignature: valid, xRequestId: requestId, dataId: "999", secret: SECRET })).toBe(false);
    expect(verifyMercadoPagoSignature({ xSignature: valid, xRequestId: "outro", dataId, secret: SECRET })).toBe(false);
  });

  it("recusa cabeçalho ausente, malformado ou sem segredo", () => {
    expect(verifyMercadoPagoSignature({ xSignature: null, xRequestId: requestId, dataId, secret: SECRET })).toBe(false);
    expect(verifyMercadoPagoSignature({ xSignature: "lixo", xRequestId: requestId, dataId, secret: SECRET })).toBe(false);
    expect(verifyMercadoPagoSignature({ xSignature: `ts=${ts},v1=abc`, xRequestId: requestId, dataId, secret: SECRET })).toBe(false);
    expect(verifyMercadoPagoSignature({ xSignature: valid, xRequestId: requestId, dataId, secret: "" })).toBe(false);
  });

  it("usa o data.id alfanumérico em minúsculas, como manda a documentação", () => {
    const sig = `ts=${ts},v1=${sign(`id:abc123;request-id:${requestId};ts:${ts};`)}`;
    expect(verifyMercadoPagoSignature({ xSignature: sig, xRequestId: requestId, dataId: "ABC123", secret: SECRET })).toBe(true);
  });

  it("omite partes ausentes do manifesto", () => {
    const sig = `ts=${ts},v1=${sign(`id:${dataId};ts:${ts};`)}`;
    expect(verifyMercadoPagoSignature({ xSignature: sig, xRequestId: null, dataId, secret: SECRET })).toBe(true);
  });

  it("com tolerância de tempo, recusa notificações antigas (replay)", () => {
    const now = Number(ts) * 1000;
    const params = { xSignature: valid, xRequestId: requestId, dataId, secret: SECRET, maxAgeMs: 5 * 60_000 };
    expect(verifyMercadoPagoSignature({ ...params, now: now + 60_000 })).toBe(true);
    expect(verifyMercadoPagoSignature({ ...params, now: now + 60 * 60_000 })).toBe(false);
  });
});
