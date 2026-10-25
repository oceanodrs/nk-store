import { PageHeader } from "@/components/admin/page-header";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { centsToInput, formatBRL } from "@/lib/money";
import { CouponForm } from "./coupon-form";

export const metadata = { title: "Cupons" };

// data no fuso de Brasília para o input type="date"
const toInputDate = (d: Date | null) =>
  d ? new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d) : "";
const shortDate = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" });

export default async function CuponsPage() {
  await requireAdminPage();
  const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
  const now = new Date();

  return (
    <>
      <PageHeader title="Cupons" description="O desconto vale sobre os produtos (não sobre o frete) e é recalculado no servidor." />

      <section aria-labelledby="novo-cupom" className="card mb-10">
        <h2 id="novo-cupom" className="display mb-4 text-2xl">Novo cupom</h2>
        <CouponForm
          values={{ id: null, code: "", type: "PERCENT", value: "", minSubtotal: "", startsAt: "", expiresAt: "", usageLimit: "", active: true, usedCount: 0 }}
        />
      </section>

      <h2 className="eyebrow mb-3 text-muted">Cupons cadastrados ({coupons.length})</h2>
      <ul className="space-y-4">
        {coupons.map((c) => {
          const expired = c.expiresAt != null && c.expiresAt < now;
          const exhausted = c.usageLimit != null && c.usedCount >= c.usageLimit;
          const state = !c.active ? "Inativo" : expired ? "Expirado" : exhausted ? "Esgotado" : "Ativo";
          return (
            <li key={c.id}>
              <details className="card group">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="font-mono text-lg font-bold">{c.code}</span>
                  <span className="text-sm font-semibold">
                    {c.type === "PERCENT" ? `${c.value}% off` : `${formatBRL(c.value)} off`}
                    {c.minSubtotal != null && <span className="font-normal text-muted"> acima de {formatBRL(c.minSubtotal)}</span>}
                  </span>
                  <span className="text-xs text-muted">
                    {c.usedCount} {c.usedCount === 1 ? "uso" : "usos"}
                    {c.usageLimit != null && ` de ${c.usageLimit}`}
                    {c.expiresAt && ` · até ${shortDate.format(c.expiresAt)}`}
                  </span>
                  <span
                    className={`ml-auto rounded-full px-2.5 py-1 text-xs font-bold ${state === "Ativo" ? "bg-success/10 text-success" : "bg-line text-muted"}`}
                  >
                    {state}
                  </span>
                  <span className="text-sm font-semibold underline underline-offset-2 group-open:hidden">Editar</span>
                </summary>
                <div className="mt-5 border-t border-line pt-5">
                  <CouponForm
                    values={{
                      id: c.id,
                      code: c.code,
                      type: c.type === "FIXED" ? "FIXED" : "PERCENT",
                      value: c.type === "FIXED" ? centsToInput(c.value) : String(c.value),
                      minSubtotal: centsToInput(c.minSubtotal),
                      startsAt: toInputDate(c.startsAt),
                      expiresAt: toInputDate(c.expiresAt),
                      usageLimit: c.usageLimit != null ? String(c.usageLimit) : "",
                      active: c.active,
                      usedCount: c.usedCount,
                    }}
                  />
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </>
  );
}
