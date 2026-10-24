"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SIZES } from "@/lib/constants";
import { buildCatalogQuery, PRICE_RANGES, type CatalogFilters } from "@/lib/validators/catalog";

type Props = {
  idPrefix: string;
  basePath: string;
  filters: CatalogFilters;
  categories: { name: string; slug: string }[];
  /** chamado após aplicar (ex.: fechar o painel no celular) */
  onApplied?: () => void;
};

const chip =
  "cursor-pointer select-none rounded-full border border-line bg-surface px-3.5 py-2 text-sm font-medium transition " +
  "hover:border-ink peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white " +
  "peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lime";

export function FiltersForm({ idPrefix, basePath, filters, categories, onApplied }: Props) {
  const router = useRouter();

  // Sem JavaScript o formulário funciona como GET normal (botão "Aplicar").
  // Com JavaScript, aplica a cada mudança sem recarregar a página.
  function apply(form: HTMLFormElement) {
    const data = new FormData(form);
    const next: Partial<CatalogFilters> = {
      q: filters.q,
      categoria: basePath === "/produtos" ? filters.categoria : undefined,
      ordem: filters.ordem,
      tamanhos: data.getAll("tamanho") as CatalogFilters["tamanhos"],
      preco: (data.get("preco") as string) || undefined,
      promocao: data.get("promocao") === "1",
    };
    router.push(`${basePath}${buildCatalogQuery(next)}`, { scroll: false });
    onApplied?.();
  }

  const keep = (overrides: Partial<CatalogFilters>) =>
    buildCatalogQuery({ ...filters, categoria: undefined, pagina: 1, ...overrides });

  return (
    <form
      action={basePath}
      method="get"
      onChange={(e) => apply(e.currentTarget)}
      onSubmit={(e) => {
        e.preventDefault();
        apply(e.currentTarget);
      }}
      className="space-y-8"
    >
      {filters.q && <input type="hidden" name="q" value={filters.q} />}
      {filters.ordem !== "relevancia" && <input type="hidden" name="ordem" value={filters.ordem} />}

      <fieldset>
        <legend className="eyebrow mb-3 text-muted">Categoria</legend>
        <ul className="space-y-1">
          <li>
            <Link
              href={`/produtos${keep({})}`}
              aria-current={!filters.categoria ? "page" : undefined}
              className="block rounded-lg px-2 py-1.5 text-sm transition hover:bg-ink/5 aria-[current=page]:font-bold aria-[current=page]:text-ink"
            >
              Todas
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/categoria/${c.slug}${keep({})}`}
                aria-current={filters.categoria === c.slug ? "page" : undefined}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm text-ink/80 transition hover:bg-ink/5 aria-[current=page]:bg-lime-soft aria-[current=page]:font-bold aria-[current=page]:text-ink"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-3 text-muted">Tamanho</legend>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((s) => (
            <label key={s} htmlFor={`${idPrefix}-t-${s}`}>
              <input
                id={`${idPrefix}-t-${s}`}
                type="checkbox"
                name="tamanho"
                value={s}
                defaultChecked={filters.tamanhos.includes(s)}
                className="peer sr-only"
              />
              <span className={`${chip} inline-grid min-w-12 place-items-center`}>{s}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-3 text-muted">Faixa de preço</legend>
        <div className="flex flex-wrap gap-2">
          <label htmlFor={`${idPrefix}-p-todas`}>
            <input
              id={`${idPrefix}-p-todas`}
              type="radio"
              name="preco"
              value=""
              defaultChecked={!filters.preco}
              className="peer sr-only"
            />
            <span className={chip}>Qualquer</span>
          </label>
          {PRICE_RANGES.map((r) => (
            <label key={r.value} htmlFor={`${idPrefix}-p-${r.value}`}>
              <input
                id={`${idPrefix}-p-${r.value}`}
                type="radio"
                name="preco"
                value={r.value}
                defaultChecked={filters.preco === r.value}
                className="peer sr-only"
              />
              <span className={chip}>{r.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="sr-only">Promoções</legend>
        <label htmlFor={`${idPrefix}-promo`} className="flex cursor-pointer items-center gap-3 text-sm font-medium">
          <input
            id={`${idPrefix}-promo`}
            type="checkbox"
            name="promocao"
            value="1"
            defaultChecked={filters.promocao}
            className="size-5 accent-ink"
          />
          Só produtos em promoção
        </label>
      </fieldset>

      <noscript>
        <button type="submit" className="btn-dark w-full">
          Aplicar filtros
        </button>
      </noscript>
    </form>
  );
}
