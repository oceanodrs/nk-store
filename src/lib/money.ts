// Todos os valores monetários do sistema são inteiros em centavos.

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 19990 => "R$ 199,90" */
export function formatBRL(cents: number) {
  return brl.format(cents / 100);
}

/** "199,90" | "199.90" | "R$ 1.299,90" => centavos. Retorna null se inválido. */
export function parseBRL(input: string): number | null {
  const clean = input.replace(/[R$\s]/g, "");
  if (!clean) return null;
  // formato brasileiro: ponto como milhar e vírgula como decimal
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

/** 19990 => "199,90" (valor para campos de formulário) */
export function centsToInput(cents: number | null | undefined) {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** Preço efetivo de um produto (promocional quando válido). */
export function effectivePrice(product: { price: number; salePrice: number | null }) {
  return product.salePrice != null && product.salePrice < product.price ? product.salePrice : product.price;
}

/** Percentual de desconto arredondado, para o selo "-20%". */
export function discountPercent(product: { price: number; salePrice: number | null }) {
  const final = effectivePrice(product);
  if (final >= product.price) return 0;
  return Math.round(((product.price - final) / product.price) * 100);
}

/** Parcelamento ilustrativo exibido na vitrine (sem juros, parcela mínima R$ 30). */
export function installments(cents: number, max = 6, minInstallment = 3000) {
  const n = Math.max(1, Math.min(max, Math.floor(cents / minInstallment)));
  return { count: n, value: Math.ceil(cents / n) };
}
