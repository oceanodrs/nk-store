/** URLs de imagem aceitas ao salvar um produto (evita apontar para domínios arbitrários). */
export function isAllowedImageUrl(url: string) {
  if (/^\/(uploads|products)\/[\w.-]+\.(jpg|png|webp|avif|svg)$/.test(url)) return true;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}
