// Campos derivados do produto. Usado pelo seed e pelo painel ao salvar.
// (sem imports com "@/" para poder ser usado também pelo prisma/seed.ts)

/** Minúsculo e sem acentos: "Seleção" => "selecao". */
export function normalizeSearch(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(s: string) {
  return normalizeSearch(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function productDerivedFields(p: {
  name: string;
  price: number;
  salePrice: number | null;
  categoryName: string;
}) {
  const finalPrice = p.salePrice != null && p.salePrice < p.price ? p.salePrice : p.price;
  return {
    finalPrice,
    searchText: normalizeSearch(`${p.name} ${p.categoryName}`),
  };
}
