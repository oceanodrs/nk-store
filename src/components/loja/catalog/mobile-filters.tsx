"use client";

import { useRef } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import type { CatalogFilters } from "@/lib/validators/catalog";
import { FiltersForm } from "./filters-form";

type Props = {
  basePath: string;
  filters: CatalogFilters;
  categories: { name: string; slug: string }[];
  activeCount: number;
  total: number;
};

export function MobileFilters({ basePath, filters, categories, activeCount, total }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  return (
    <div className="lg:hidden">
      <button type="button" onClick={() => ref.current?.showModal()} className="btn-outline px-4 py-2.5" aria-haspopup="dialog">
        <SlidersHorizontal className="size-4" aria-hidden />
        Filtrar
        {activeCount > 0 && (
          <span className="grid size-5 place-items-center rounded-full bg-lime text-[11px] font-bold text-ink">
            {activeCount}
          </span>
        )}
      </button>

      <dialog
        ref={ref}
        aria-label="Filtros"
        onClick={(e) => e.target === ref.current && ref.current?.close()}
        className="mb-0 mt-auto h-[85dvh] max-h-none w-full max-w-none rounded-t-[1.5rem] bg-paper p-0 backdrop:bg-ink/60 open:animate-[fade-up_.3s_var(--ease-out-soft)]"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="display text-2xl">Filtros</h2>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              className="grid size-10 place-items-center rounded-full hover:bg-ink/5"
              aria-label="Fechar filtros"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-6">
            <FiltersForm idPrefix="m" basePath={basePath} filters={filters} categories={categories} />
          </div>
          <div className="border-t border-line p-4">
            <button type="button" onClick={() => ref.current?.close()} className="btn-dark w-full">
              Ver {total} {total === 1 ? "resultado" : "resultados"}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
