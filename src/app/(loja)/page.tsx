import Link from "next/link";
import { ArrowRight, CreditCard, RefreshCw, ShieldCheck, Truck } from "lucide-react";
import { ProductCard } from "@/components/loja/product-card";
import { ShirtImage } from "@/components/shirt-image";
import { getCategoriesWithCount, getFeaturedProducts, getNewArrivals, getStoreSettings } from "@/lib/catalog";
import { formatBRL } from "@/lib/money";

// a vitrine é regenerada a cada 60s (ISR)
export const revalidate = 60;

export default async function HomePage() {
  const [featured, newArrivals, categories, settings] = await Promise.all([
    getFeaturedProducts(8),
    getNewArrivals(8),
    getCategoriesWithCount(),
    getStoreSettings(),
  ]);
  const heroShirts = featured.slice(0, 3);

  const trust = [
    { icon: ShieldCheck, title: "Pagamento seguro", text: "Processado pelo Mercado Pago" },
    {
      icon: Truck,
      title: "Envio para todo o Brasil",
      text: settings.freeShippingThreshold
        ? `Frete grátis acima de ${formatBRL(settings.freeShippingThreshold)}`
        : "Rastreio em todas as entregas",
    },
    { icon: CreditCard, title: "Pix, cartão ou boleto", text: "Parcele em até 6x sem juros" },
    { icon: RefreshCw, title: "Troca fácil", text: "Primeira troca de tamanho grátis" },
  ];

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="stripes-diagonal absolute inset-0" aria-hidden />
        <div
          aria-hidden
          className="absolute -right-40 top-1/2 h-[620px] w-[620px] -translate-y-1/2 rounded-full bg-lime/10 blur-3xl"
        />
        <div className="container-nk relative grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div className="animate-fade-up">
            <p className="eyebrow text-lime">Temporada 24/25 · Coleção 2026</p>
            <h1 className="display mt-4 text-[clamp(3.2rem,11vw,7.5rem)]">
              Vista
              <br />o <span className="text-lime">jogo.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-white/75 sm:text-lg">
              Camisas de clubes, seleções e modelos retrô com caimento de torcedor e acabamento de campeão.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/produtos?ordem=novidades" className="btn-lime">
                Ver lançamentos <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link href="/categoria/retro" className="btn-outline-light">
                Coleção retrô
              </Link>
            </div>
          </div>

          {heroShirts.length > 0 && (
            <div className="relative mx-auto h-[340px] w-full max-w-[520px] sm:h-[440px]" aria-hidden>
              {heroShirts.map((p, i) => {
                const pos = [
                  "left-1/2 top-2 z-20 w-[56%] -translate-x-1/2",
                  "left-0 top-14 z-10 w-[46%] -rotate-[8deg] opacity-90",
                  "right-0 top-14 z-10 w-[46%] rotate-[8deg] opacity-90",
                ][i];
                return (
                  <div
                    key={p.id}
                    className={`absolute aspect-[4/5] overflow-hidden rounded-[var(--radius-xl2)] shadow-2xl shadow-black/40 ring-1 ring-white/10 transition duration-500 hover:-translate-y-1 ${pos}`}
                  >
                    {p.images[0] && (
                      <ShirtImage src={p.images[0].url} alt="" fill priority sizes="(min-width: 1024px) 300px, 50vw" className="object-cover" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* SELOS DE CONFIANÇA */}
      <section aria-label="Por que comprar na NK STORE" className="border-b border-line bg-surface">
        <ul className="container-nk grid grid-cols-2 gap-x-4 gap-y-6 py-7 lg:grid-cols-4">
          {trust.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-lime-soft text-ink">
                <Icon className="size-5" aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-semibold">{title}</span>
                <span className="block text-xs text-muted sm:text-sm">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* CATEGORIAS */}
      <section className="container-nk pt-16 sm:pt-20" aria-labelledby="titulo-categorias">
        <SectionHeading id="titulo-categorias" eyebrow="Escolha seu time" title="Categorias" />
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/categoria/${c.slug}`}
                className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-[var(--radius-card)] bg-ink p-4 text-white sm:p-6"
              >
                {c.image && (
                  <ShirtImage
                    src={c.image}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 25vw, 50vw"
                    className="object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
                  />
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" aria-hidden />
                <span className="relative">
                  <span className="display block text-3xl sm:text-4xl">{c.name}</span>
                  <span className="mt-1 flex items-center gap-1.5 text-sm text-white/80">
                    {c.count} {c.count === 1 ? "modelo" : "modelos"}
                    <ArrowRight className="size-4 text-lime transition group-hover:translate-x-1" aria-hidden />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* DESTAQUES */}
      {featured.length > 0 && (
        <section className="container-nk pt-16 sm:pt-24" aria-labelledby="titulo-destaques">
          <SectionHeading id="titulo-destaques" eyebrow="Os mais pedidos" title="Destaques" href="/produtos" />
          <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-4">
            {featured.slice(0, 4).map((p, i) => (
              <ProductCard key={p.id} product={p} priority={i < 2} />
            ))}
          </div>
        </section>
      )}

      {/* BANNER RETRÔ */}
      <section className="container-nk pt-16 sm:pt-24">
        <div className="relative overflow-hidden rounded-[var(--radius-xl2)] bg-ink text-white">
          <div className="stripes-diagonal absolute inset-0" aria-hidden />
          <div className="relative grid gap-6 p-8 sm:p-12 lg:grid-cols-[1.3fr_1fr] lg:items-center lg:p-16">
            <div>
              <p className="eyebrow text-lime">Coleção retrô</p>
              <h2 className="display mt-3 text-5xl sm:text-6xl lg:text-7xl">
                Clássicos que
                <br />
                nunca saem de campo
              </h2>
              <p className="mt-4 max-w-md text-white/75">
                Golas em V, faixas diagonais e aros que marcaram gerações, em tecido confortável para o dia a dia.
              </p>
            </div>
            <div className="flex lg:justify-end">
              <Link href="/categoria/retro" className="btn-lime">
                Explorar retrô <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* LANÇAMENTOS */}
      <section className="container-nk pt-16 sm:pt-24" aria-labelledby="titulo-lancamentos">
        <SectionHeading
          id="titulo-lancamentos"
          eyebrow="Acabou de chegar"
          title="Lançamentos"
          href="/produtos?ordem=novidades"
        />
        <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-4">
          {newArrivals.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </>
  );
}

function SectionHeading({ id, eyebrow, title, href }: { id: string; eyebrow: string; title: string; href?: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="eyebrow text-muted">{eyebrow}</p>
        <h2 id={id} className="display mt-1 text-4xl sm:text-5xl">
          {title}
        </h2>
      </div>
      {href && (
        <Link
          href={href}
          className="group mb-1 inline-flex shrink-0 items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"
        >
          Ver todos <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}
