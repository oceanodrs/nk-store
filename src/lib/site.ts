export const siteConfig = {
  name: "NK STORE",
  tagline: "Camisas de futebol para quem vive o jogo",
  description:
    "Camisas de futebol de clubes, seleções e modelos retrô. Pagamento seguro via Mercado Pago e envio para todo o Brasil.",
  // na Vercel, sem NEXT_PUBLIC_SITE_URL, usa o domínio de produção do projeto
  url: (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
  ).replace(/\/$/, ""),
};

export function absoluteUrl(path = "/") {
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
}
