import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { applyVerifiedPayment } from "@/lib/orders";
import { getPayment } from "@/lib/payments/mercadopago";
import { verifyMercadoPagoSignature } from "@/lib/payments/signature";

/**
 * Webhook do Mercado Pago.
 * 1. Se o MP enviar x-signature e houver MP_WEBHOOK_SECRET, a assinatura precisa ser válida.
 * 2. O conteúdo da notificação NUNCA é usado como verdade: o pagamento é sempre
 *    consultado na API do Mercado Pago com o nosso Access Token.
 * 3. O processamento é idempotente (notificações repetidas não duplicam nada).
 */
export async function POST(req: Request) {
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
  const xSignature = req.headers.get("x-signature");
  if (secret && xSignature) {
    const valid = verifyMercadoPagoSignature({
      xSignature,
      xRequestId: req.headers.get("x-request-id"),
      dataId,
      secret,
    });
    if (!valid) {
      console.warn("[webhook] assinatura inválida", { dataId });
      return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });
    }
  }
  // Sem assinatura, a notificação só serve de "aviso": uma notificação forjada
  // não consegue marcar nada como pago, porque o pagamento é consultado na API do
  // MP (precisa existir na nossa conta, apontar para o pedido e ter o valor exato).

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
          payload: JSON.stringify({ body, result }),
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
