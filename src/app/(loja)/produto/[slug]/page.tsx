import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RefreshCw, ShieldCheck, Truck } from "lucide-react";
import { ProductCard } from "@/components/loja/product-card";
import { Gallery } from "@/components/loja/product/gallery";
import { PurchasePanel } from "@/components/loja/product/purchase-panel";
import { getProductBySlug, getRelatedProducts, getStoreSettings } from "@/lib/catalog";
import { db } from "@/lib/db";
import { discountPercent, formatBRL, installments } from "@/lib/money";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const products = await db.product.findMany({ where: { active: true }, select: { slug: true } });
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  const description = `${product.description.split("\n")[0]} Por ${formatBRL(product.finalPrice)}.`;
  return {
    title: product.name,
    description,
    alternates: { canonical: `/produto/${product.slug}` },
    openGraph: { type: "website", title: product.name, description, url: `/produto/${product.slug}` },
  };
}

const MEASURES = [
  { size: "P", width: 50, length: 70 },
  { size: "M", width: 53, length: 72 },
  { size: "G", width: 56, length: 74 },
  { size: "GG", width: 59, length: 76 },
  { size: "XG", width: 62, length: 78 },
];

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [related, settings] = await Promise.all([
    getRelatedProducts(product.id, product.categoryId),
    getStoreSettings(),
  ]);

  const price = product.finalPrice;
  const off = discountPercent(product);
  const parcel = installments(price);
  const variants = product.variants.map((v) => ({
    id: v.id,
    size: v.size,
    available: Math.max(0, v.stock - v.reserved),
  }));
  const inStock = variants.some((v) => v.available > 0);
  const [summary, ...bullets] = product.description.split("\n").filter(Boolean);

  // Dados estruturados (schema.org/Product) para o Google
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.id,
    image: product.images.map((i) => absoluteUrl(i.url)),
    brand: { "@type": "Brand", name: "NK STORE" },
    category: product.category.name,
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/produto/${product.slug}`),
      priceCurrency: "BRL",
      price: (price / 100).toFixed(2),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  return (
    <div className="container-nk pt-6 sm:pt-10">
      <script
        type="application/ld+json"
        // JSON.stringify + escape de "<" evita injeção de HTML
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <nav aria-label="Você está em" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="hover:text-ink">Início</Link></li>
          <li aria-hidden>/</li>
          <li><Link href={`/categoria/${product.category.slug}`} className="hover:text-ink">{product.category.name}</Link></li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="line-clamp-1 text-ink">{product.name}</li>
        </ol>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-14">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Gallery images={product.images} />
        </div>

        <div>
          <Link href={`/categoria/${product.category.slug}`} className="eyebrow text-muted hover:text-ink">
            {product.category.name}
          </Link>
          <h1 className="display mt-2 text-4xl sm:text-5xl">{product.name}</h1>

          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-3xl font-bold">{formatBRL(price)}</p>
            {off > 0 && (
              <>
                <p className="text-lg text-muted line-through">
                  <span className="sr-only">De </span>
                  {formatBRL(product.price)}
                </p>
                <span className="rounded-full bg-ink px-2.5 py-1 text-xs font-bold text-lime">-{off}%</span>
              </>
            )}
          </div>
          {parcel.count > 1 && (
            <p className="mt-1 text-sm text-muted">
              ou {parcel.count}x de {formatBRL(parcel.value)} sem juros no cartão
            </p>
          )}
          <p className="mt-4 max-w-prose leading-relaxed text-ink/80">{summary}</p>

          <div className="mt-8">
            <PurchasePanel
              product={{
                id: product.id,
                name: product.name,
                slug: product.slug,
                unitPrice: price,
                image: product.images[0]?.url ?? null,
              }}
              variants={variants}
            />
          </div>

          <ul className="mt-8 grid gap-3 text-sm sm:grid-cols-3">
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-5 shrink-0 text-success" aria-hidden /> Compra segura com Mercado Pago
            </li>
            <li className="flex items-center gap-2">
              <Truck className="size-5 shrink-0 text-success" aria-hidden />
              {settings.freeShippingThreshold
                ? `Frete grátis acima de ${formatBRL(settings.freeShippingThreshold)}`
                : "Envio para todo o Brasil"}
            </li>
            <li className="flex items-center gap-2">
              <RefreshCw className="size-5 shrink-0 text-success" aria-hidden /> 1ª troca de tamanho grátis
            </li>
          </ul>

          <div className="mt-10 divide-y divide-line border-y border-line">
            <details className="group py-5" open>
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                Detalhes do produto
                <span aria-hidden className="text-xl transition group-open:rotate-45">+</span>
              </summary>
              <ul className="mt-4 space-y-2 text-sm text-ink/80">
                {bullets.map((b) => (
                  <li key={b}>{b.replace(/^•\s*/, "— ")}</li>
                ))}
              </ul>
            </details>
            <details id="guia-de-medidas" className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                Guia de medidas
                <span aria-hidden className="text-xl transition group-open:rotate-45">+</span>
              </summary>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <caption className="mb-3 text-left text-xs text-muted">
                    Medidas aproximadas da peça em centímetros (modelagem torcedor).
                  </caption>
                  <thead>
                    <tr className="border-b border-line">
                      <th scope="col" className="py-2 font-semibold">Tamanho</th>
                      <th scope="col" className="py-2 font-semibold">Largura</th>
                      <th scope="col" className="py-2 font-semibold">Comprimento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MEASURES.map((m) => (
                      <tr key={m.size} className="border-b border-line/60">
                        <th scope="row" className="py-2 font-semibold">{m.size}</th>
                        <td className="py-2">{m.width} cm</td>
                        <td className="py-2">{m.length} cm</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="pt-20" aria-labelledby="titulo-relacionados">
          <h2 id="titulo-relacionados" className="display text-4xl">
            Você também pode gostar
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
