import Link from "next/link";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { ProductCard } from "@/components/loja/product-card";
import { getNavCategories, listProducts } from "@/lib/catalog";
import { buildCatalogQuery, PRICE_RANGES, type CatalogFilters } from "@/lib/validators/catalog";
import { FiltersForm } from "./filters-form";
import { MobileFilters } from "./mobile-filters";
import { SortSelect } from "./sort-select";

type Props = {
  filters: CatalogFilters;
  basePath: string;
  title: string;
  eyebrow?: string;
  description?: string | null;
};

export async function CatalogView({ filters, basePath, title, eyebrow, description }: Props) {
  const [{ items, total, pages }, categories] = await Promise.all([listProducts(filters), getNavCategories()]);
  const omitCategory = basePath !== "/produtos";
  const href = (f: Partial<CatalogFilters>) =>
    `${basePath}${buildCatalogQuery({ ...filters, pagina: 1, ...f }, { omitCategory })}`;

  // filtros ativos viram "chips" removíveis
  const chips: { label: string; href: string }[] = [
    ...(filters.q ? [{ label: `“${filters.q}”`, href: href({ q: undefined }) }] : []),
    ...filters.tamanhos.map((t) => ({
      label: `Tamanho ${t}`,
      href: href({ tamanhos: filters.tamanhos.filter((x) => x !== t) }),
    })),
    ...(filters.preco
      ? [{ label: PRICE_RANGES.find((r) => r.value === filters.preco)!.label, href: href({ preco: undefined }) }]
      : []),
    ...(filters.promocao ? [{ label: "Em promoção", href: href({ promocao: false }) }] : []),
  ];
  const formKey = JSON.stringify(filters);

  return (
    <div className="container-nk pt-8 sm:pt-12">
      <nav aria-label="Você está em" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="hover:text-ink">Início</Link></li>
          <li aria-hidden>/</li>
          {basePath === "/produtos" ? (
            <li aria-current="page" className="text-ink">Camisas</li>
          ) : (
            <>
              <li><Link href="/produtos" className="hover:text-ink">Camisas</Link></li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="text-ink">{title}</li>
            </>
          )}
        </ol>
      </nav>

      <header className="mt-4 max-w-2xl">
        {eyebrow && <p className="eyebrow text-muted">{eyebrow}</p>}
        <h1 className="display mt-1 text-5xl sm:text-6xl">{title}</h1>
        {description && <p className="mt-3 text-muted">{description}</p>}
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-[240px_1fr]">
        <aside aria-label="Filtros" className="hidden lg:block">
          <div className="sticky top-28">
            <FiltersForm key={formKey} idPrefix="d" basePath={basePath} filters={filters} categories={categories} />
          </div>
        </aside>

        <section aria-labelledby="resultado">
          <h2 className="sr-only">Camisas encontradas</h2>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <p id="resultado" className="text-sm text-muted" aria-live="polite">
              <strong className="text-ink">{total}</strong> {total === 1 ? "camisa encontrada" : "camisas encontradas"}
            </p>
            <div className="flex items-center gap-2">
              <MobileFilters
                key={formKey}
                basePath={basePath}
                filters={filters}
                categories={categories}
                activeCount={chips.length}
                total={total}
              />
              <SortSelect basePath={basePath} filters={filters} />
            </div>
          </div>

          {chips.length > 0 && (
            <ul className="mt-4 flex flex-wrap items-center gap-2" aria-label="Filtros ativos">
              {chips.map((c) => (
                <li key={c.label}>
                  <Link
                    href={c.href}
                    scroll={false}
                    className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-ink-3"
                  >
                    {c.label}
                    <X className="size-3.5" aria-hidden />
                    <span className="sr-only">(remover filtro)</span>
                  </Link>
                </li>
              ))}
              <li>
                <Link href={omitCategory ? basePath : "/produtos"} scroll={false} className="px-2 text-xs font-semibold underline underline-offset-4">
                  Limpar tudo
                </Link>
              </li>
            </ul>
          )}

          {items.length === 0 ? (
            <div className="mt-10 rounded-[var(--radius-card)] border border-dashed border-line bg-surface p-10 text-center">
              <p className="display text-3xl">Nenhuma camisa encontrada</p>
              <p className="mt-2 text-muted">Tente remover algum filtro ou buscar por outro termo.</p>
              <Link href="/produtos" className="btn-dark mt-6">
                Ver todas as camisas
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3">
              {items.map((p, i) => (
                <ProductCard key={p.id} product={p} priority={i < 2} />
              ))}
            </div>
          )}

          {pages > 1 && (
            <nav aria-label="Paginação" className="mt-12 flex items-center justify-center gap-2">
              {filters.pagina > 1 && (
                <Link href={href({ pagina: filters.pagina - 1 })} className="btn-outline px-3" aria-label="Página anterior">
                  <ChevronLeft className="size-4" aria-hidden />
                </Link>
              )}
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  href={href({ pagina: n })}
                  aria-current={n === filters.pagina ? "page" : undefined}
                  className="grid size-11 place-items-center rounded-full text-sm font-semibold transition hover:bg-ink/5 aria-[current=page]:bg-ink aria-[current=page]:text-white"
                >
                  {n}
                </Link>
              ))}
              {filters.pagina < pages && (
                <Link href={href({ pagina: filters.pagina + 1 })} className="btn-outline px-3" aria-label="Próxima página">
                  <ChevronRight className="size-4" aria-hidden />
                </Link>
              )}
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}
