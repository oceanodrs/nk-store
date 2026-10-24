export const siteConfig = {
  name: "NK STORE",
  tagline: "Camisas de futebol para quem vive o jogo",
  description:
    "Camisas de futebol de clubes, seleções e modelos retrô. Pagamento seguro via Mercado Pago e envio para todo o Brasil.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
};

export function absoluteUrl(path = "/") {
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
}
