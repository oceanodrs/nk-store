import { formatBRL } from "@/lib/money";

type Day = { label: string; fullLabel: string; revenue: number; orders: number };

/**
 * Receita por dia: série única (sem legenda; o título nomeia), barras finas com
 * topo arredondado ancoradas na base, rótulo ao passar o mouse/focar e tabela
 * equivalente para leitores de tela.
 */
export function RevenueChart({ days }: { days: Day[] }) {
  const max = Math.max(...days.map((d) => d.revenue), 1);
  // linhas de grade em 3 níveis "redondos"
  const step = niceStep(max / 3);
  const top = Math.max(step * 3, max);
  const ticks = [step * 3, step * 2, step, 0].filter((t) => t <= top);
  const labelEvery = days.length > 16 ? 5 : days.length > 8 ? 2 : 1;

  return (
    <figure>
      <div className="flex gap-3">
        {/* eixo Y */}
        <div className="relative w-14 shrink-0 text-right text-[11px] text-muted" aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - t / top) * 100}%` }}>
              {compactBRL(t)}
            </span>
          ))}
        </div>

        <div className="relative h-48 flex-1">
          {ticks.map((t) => (
            <div key={t} aria-hidden className="absolute inset-x-0 border-t border-line" style={{ top: `${(1 - t / top) * 100}%` }} />
          ))}
          <ul className="absolute inset-0 flex items-end gap-0.5" aria-label="Receita por dia (detalhes na tabela abaixo)">
            {days.map((d) => (
              <li key={d.fullLabel} className="group relative flex h-full flex-1 items-end justify-center">
                <span
                  tabIndex={0}
                  aria-label={`${d.fullLabel}: ${formatBRL(d.revenue)} em ${d.orders} ${d.orders === 1 ? "pedido" : "pedidos"}`}
                  className="block w-full max-w-6 rounded-t-[4px] bg-ink outline-none transition group-hover:bg-ink-3 focus-visible:bg-ink-3"
                  style={{ height: d.revenue > 0 ? `max(2px, ${(d.revenue / top) * 100}%)` : "0" }}
                />
                {/* área de toque maior que a barra */}
                <span aria-hidden className="absolute inset-0" />
                <span
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow-lg group-hover:block group-focus-within:block"
                >
                  <span className="block font-semibold">{formatBRL(d.revenue)}</span>
                  <span className="block text-white/70">
                    {d.fullLabel} · {d.orders} {d.orders === 1 ? "pedido" : "pedidos"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="ml-[68px] mt-2 flex gap-0.5 text-[11px] text-muted" aria-hidden>
        {days.map((d, i) => (
          <span key={d.fullLabel} className="flex-1 text-center">
            {i % labelEvery === 0 ? d.label : ""}
          </span>
        ))}
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-xs font-semibold text-muted hover:text-ink">Ver dados em tabela</summary>
        <table className="mt-2 w-full text-left">
          <thead className="text-xs text-muted">
            <tr>
              <th scope="col" className="py-1 font-semibold">Dia</th>
              <th scope="col" className="py-1 font-semibold">Pedidos pagos</th>
              <th scope="col" className="py-1 text-right font-semibold">Receita</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {days.map((d) => (
              <tr key={d.fullLabel}>
                <td className="py-1">{d.fullLabel}</td>
                <td className="py-1">{d.orders}</td>
                <td className="py-1 text-right">{formatBRL(d.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

function niceStep(raw: number) {
  if (raw <= 0) return 10000; // R$ 100
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

function compactBRL(cents: number) {
  const v = cents / 100;
  if (v >= 1000) return `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return `R$ ${Math.round(v)}`;
}
