"use client";

import { useEffect, useEffectEvent, useId, useState } from "react";
import { Loader2, MapPin, Truck } from "lucide-react";
import { formatCep, onlyDigits, pluralDays } from "@/lib/format";
import { formatBRL } from "@/lib/money";

export type QuoteOption = { id: string; name: string; company: string; price: number; days: number; free?: boolean };
type QuoteResult = { address: { city: string; state: string } | null; options: QuoteOption[] };

type Props = {
  items: { productId: string; quantity: number }[];
  initialCep?: string;
  /** modo carrinho: as opções viram uma escolha (radio) */
  selectable?: boolean;
  selectedId?: string | null;
  onChange?: (cep: string, option: QuoteOption | null) => void;
};

export function ShippingCalculator({ items, initialCep = "", selectable, selectedId, onChange }: Props) {
  const id = useId();
  const [cep, setCep] = useState(formatCep(initialCep));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuoteResult | null>(null);

  const itemsKey = JSON.stringify(items);

  // o CEP salvo só é conhecido depois de hidratar (vem do localStorage)
  const [prevInitial, setPrevInitial] = useState(initialCep);
  if (initialCep !== prevInitial) {
    setPrevInitial(initialCep);
    if (!cep && initialCep) setCep(formatCep(initialCep));
  }

  // busca a cotação; o estado só é alterado quando a resposta chega
  async function fetchQuote(digits: string) {
    try {
      const res = await fetch("/api/frete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cep: digits, items }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult(null);
        setError(data.error ?? "Não foi possível calcular o frete.");
        onChange?.(digits, null);
        return;
      }
      setError(null);
      setResult(data);
      // mantém a opção escolhida se ainda existir; senão escolhe a mais barata
      const keep = data.options.find((o: QuoteOption) => o.id === selectedId);
      onChange?.(digits, keep ?? data.options[0] ?? null);
    } catch {
      setError("Sem conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function quote(rawCep: string) {
    const digits = onlyDigits(rawCep);
    if (digits.length !== 8) {
      setError("Digite os 8 números do CEP.");
      return;
    }
    setLoading(true);
    void fetchQuote(digits);
  }

  // no carrinho, recalcula sozinho quando os itens mudam e já existe CEP
  const requote = useEffectEvent(() => {
    const digits = onlyDigits(cep);
    if (selectable && digits.length === 8 && items.length > 0) void fetchQuote(digits);
  });
  useEffect(() => {
    // fetchQuote só altera estado depois do await (resposta da API), não de forma síncrona
    // eslint-disable-next-line react-hooks/set-state-in-effect
    requote();
  }, [itemsKey, selectable]);

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          quote(cep);
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <label htmlFor={`${id}-cep`} className="sr-only">
            CEP de entrega
          </label>
          <MapPin aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            id={`${id}-cep`}
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="Digite seu CEP"
            value={cep}
            onChange={(e) => setCep(formatCep(e.target.value))}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-err` : undefined}
            className="h-12 w-full rounded-full border border-line bg-surface pl-10 pr-4 text-sm outline-none transition placeholder:text-muted focus:border-ink aria-[invalid=true]:border-danger"
          />
        </div>
        <button type="submit" className="btn-dark h-12 px-5" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" aria-label="Calculando" /> : "Calcular"}
        </button>
      </form>
      <a
        href="https://buscacepinter.correios.com.br/app/endereco/index.php"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-xs text-muted underline underline-offset-2 hover:text-ink"
      >
        Não sei meu CEP
      </a>

      <div aria-live="polite">
        {error && (
          <p id={`${id}-err`} className="mt-2 text-sm font-medium text-danger">
            {error}
          </p>
        )}

        {result && !error && (
          <div className="mt-3">
            {result.address && (
              <p className="mb-2 text-xs text-muted">
                Entrega para <strong className="text-ink">{result.address.city}/{result.address.state}</strong>
              </p>
            )}
            {result.options.length === 0 ? (
              <p className="text-sm text-muted">Não há opções de entrega para este CEP.</p>
            ) : (
              <fieldset>
                <legend className="sr-only">Opções de frete</legend>
                <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                  {result.options.map((o) => {
                    const content = (
                      <>
                        <Truck className="size-4 shrink-0 text-muted" aria-hidden />
                        <span className="flex-1">
                          <span className="block text-sm font-semibold">{o.name}</span>
                          <span className="block text-xs text-muted">
                            até {pluralDays(o.days)} · {o.company}
                          </span>
                        </span>
                        <span className={`text-sm font-bold ${o.free ? "text-success" : ""}`}>
                          {o.free ? "Grátis" : formatBRL(o.price)}
                        </span>
                      </>
                    );
                    return (
                      <li key={o.id}>
                        {selectable ? (
                          <label className="flex cursor-pointer items-center gap-3 px-4 py-3 transition has-[:checked]:bg-lime-soft">
                            <input
                              type="radio"
                              name={`${id}-frete`}
                              value={o.id}
                              checked={selectedId === o.id}
                              onChange={() => onChange?.(onlyDigits(cep), o)}
                              className="size-4 accent-ink"
                            />
                            {content}
                          </label>
                        ) : (
                          <div className="flex items-center gap-3 px-4 py-3">{content}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </fieldset>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
