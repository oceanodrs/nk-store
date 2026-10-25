import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tooManyRequests } from "@/lib/http";
import { applyVerifiedPayment } from "@/lib/orders";
import { getPayment } from "@/lib/payments/mercadopago";
import { verifyMercadoPagoSignature } from "@/lib/payments/signature";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Webhook do Mercado Pago.
 *
 * 1. O conteúdo da notificação NUNCA é usado como verdade: o pagamento é sempre
 *    consultado na API do Mercado Pago com o nosso Access Token, e só é aplicado se
 *    existir na nossa conta, apontar para o pedido (external_reference) e ter o valor exato.
 * 2. A assinatura (x-signature + MP_WEBHOOK_SECRET) é uma camada extra:
 *    - MP_WEBHOOK_STRICT_SIGNATURE="true": assinatura ausente/inválida é recusada (401).
 *      Recomendado em produção com credenciais reais, depois de validar que bate.
 *    - padrão: assinatura inválida só gera aviso no log. Necessário no sandbox com
 *      contas de teste, em que o MP assina com uma chave diferente da exibida no painel
 *      (ver README > Decisões).
 * 3. O processamento é idempotente (notificações repetidas não duplicam nada).
 */
export async function POST(req: Request) {
  // evita que o endpoint seja usado para forçar consultas em massa à API do MP
  const limit = rateLimit(`webhook:${clientIp(req.headers)}`, 120, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec);

  const url = new URL(req.url);
  let body: { type?: string; topic?: string; action?: string; data?: { id?: string | number } } = {};
  try {
    body = await req.json();
  } catch {
    // notificações antigas (IPN) podem vir só com query string
  }

  const type = url.searchParams.get("type") ?? body.type ?? url.searchParams.get("topic") ?? body.topic;
  const dataId = url.searchParams.get("data.id") ?? (body.data?.id != null ? String(body.data.id) : null) ?? url.searchParams.get("id");

  const secret = process.env.MP_WEBHOOK_SECRET;
  const strict = process.env.MP_WEBHOOK_STRICT_SIGNATURE === "true";
  const xSignature = req.headers.get("x-signature");
  const signatureOk =
    !!secret &&
    !!xSignature &&
    verifyMercadoPagoSignature({ xSignature, xRequestId: req.headers.get("x-request-id"), dataId, secret });

  if (secret && !signatureOk) {
    if (strict) {
      console.warn("[webhook] assinatura ausente ou inválida: recusada (modo estrito)", { dataId });
      return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });
    }
    console.warn("[webhook] assinatura não confere; pagamento será verificado na API do Mercado Pago", { dataId });
  }

  // só pagamentos interessam; outros tópicos são confirmados e ignorados
  if (type !== "payment" || !dataId || !/^\d{1,20}$/.test(dataId)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const payment = await getPayment(dataId);
    const result = await applyVerifiedPayment(payment);

    // registro para auditoria (único por pagamento + status)
    await db.webhookEvent
      .create({
        data: {
          provider: "mercadopago",
          externalId: payment.id,
          action: payment.status,
          payload: JSON.stringify({ body, result, signatureOk }),
        },
      })
      .catch((err: { code?: string }) => {
        // P2002 = já registrado antes (notificação repetida): tudo bem
        if (err?.code !== "P2002") console.error("[webhook] falha ao registrar evento", err);
      });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    // pagamento inexistente nesta conta (ex.: notificação forjada): confirma e ignora
    if ((err as { status?: number })?.status === 404) {
      return NextResponse.json({ ok: true, ignored: true, reason: "pagamento não encontrado" });
    }
    console.error("[webhook] erro ao processar pagamento", dataId, err);
    // 500 faz o Mercado Pago tentar de novo mais tarde
    return NextResponse.json({ error: "erro ao processar" }, { status: 500 });
  }
}
