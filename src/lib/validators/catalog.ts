import { z } from "zod";
import { SIZES } from "@/lib/constants";

export const SORT_OPTIONS = [
  { value: "relevancia", label: "Relevância" },
  { value: "novidades", label: "Novidades" },
  { value: "menor-preco", label: "Menor preço" },
  { value: "maior-preco", label: "Maior preço" },
  { value: "a-z", label: "Nome (A–Z)" },
] as const;

export const PRICE_RANGES = [
  { value: "ate-200", label: "Até R$ 200", min: null, max: 20000 },
  { value: "200-300", label: "R$ 200 a R$ 300", min: 20000, max: 30000 },
  { value: "acima-300", label: "Acima de R$ 300", min: 30000, max: null },
] as const;

export const PAGE_SIZE = 12;

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const all = (v: string | string[] | undefined) => (v == null ? [] : Array.isArray(v) ? v : v.split(","));

const filtersSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  categoria: z.string().regex(/^[a-z0-9-]{1,60}$/).optional().catch(undefined),
  tamanhos: z.array(z.enum(SIZES)).catch([]),
  preco: z.enum(PRICE_RANGES.map((r) => r.value) as [string, ...string[]]).optional().catch(undefined),
  ordem: z.enum(SORT_OPTIONS.map((o) => o.value) as [string, ...string[]]).catch("relevancia"),
  promocao: z.boolean().catch(false),
  pagina: z.coerce.number().int().min(1).max(500).catch(1),
});

export type CatalogFilters = z.infer<typeof filtersSchema>;

/** Converte a query string da URL em filtros válidos (valores inválidos são ignorados). */
export function parseCatalogParams(params: RawParams, fixedCategory?: string): CatalogFilters {
  return filtersSchema.parse({
    q: first(params.q) || undefined,
    categoria: fixedCategory ?? (first(params.categoria) || undefined),
    tamanhos: all(params.tamanho).filter((s) => (SIZES as readonly string[]).includes(s)),
    preco: first(params.preco) || undefined,
    ordem: first(params.ordem) ?? "relevancia",
    promocao: first(params.promocao) === "1",
    pagina: first(params.pagina) ?? 1,
  });
}

/** Monta a query string a partir dos filtros (usada em links de paginação e "remover filtro"). */
export function buildCatalogQuery(f: Partial<CatalogFilters>, opts: { omitCategory?: boolean } = {}) {
  const sp = new URLSearchParams();
  if (f.q) sp.set("q", f.q);
  if (f.categoria && !opts.omitCategory) sp.set("categoria", f.categoria);
  for (const t of f.tamanhos ?? []) sp.append("tamanho", t);
  if (f.preco) sp.set("preco", f.preco);
  if (f.ordem && f.ordem !== "relevancia") sp.set("ordem", f.ordem);
  if (f.promocao) sp.set("promocao", "1");
  if (f.pagina && f.pagina > 1) sp.set("pagina", String(f.pagina));
  const s = sp.toString();
  return s ? `?${s}` : "";
}
