"use client";

import { useRouter } from "next/navigation";
import { buildCatalogQuery, SORT_OPTIONS, type CatalogFilters } from "@/lib/validators/catalog";

type Props = { basePath: string; filters: CatalogFilters };

export function SortSelect({ basePath, filters }: Props) {
  const router = useRouter();
  const omitCategory = basePath !== "/produtos";

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="ordenar" className="sr-only text-sm text-muted sm:not-sr-only">
        Ordenar por
      </label>
      <select
        id="ordenar"
        value={filters.ordem}
        onChange={(e) =>
          router.push(
            `${basePath}${buildCatalogQuery({ ...filters, ordem: e.target.value, pagina: 1 }, { omitCategory })}`,
            { scroll: false },
          )
        }
        className="h-11 rounded-full border border-line bg-surface pl-4 pr-9 text-sm font-medium outline-none transition hover:border-ink focus-visible:border-ink"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
