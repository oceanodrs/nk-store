import Link from "next/link";
import { Search, ShoppingBag } from "lucide-react";
import { Logo } from "@/components/logo";
import { getNavCategories, getStoreSettings } from "@/lib/catalog";
import { formatBRL } from "@/lib/money";
import { MobileMenu } from "./mobile-menu";

export async function Header() {
  const [categories, settings] = await Promise.all([getNavCategories(), getStoreSettings()]);
  const links = [
    { href: "/produtos?ordem=novidades", label: "Lançamentos" },
    ...categories.map((c) => ({ href: `/categoria/${c.slug}`, label: c.name })),
    { href: "/produtos?promocao=1", label: "Promoções" },
  ];

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only z-[60] rounded-full bg-lime px-4 py-2 font-semibold text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Pular para o conteúdo
      </a>

      <div className="bg-ink text-white">
        <p className="container-nk py-2 text-center text-xs font-medium tracking-wide sm:text-[13px]">
          {settings.freeShippingThreshold ? (
            <>
              <span className="text-lime">Frete grátis</span> acima de {formatBRL(settings.freeShippingThreshold)}
            </>
          ) : (
            <>Envio para todo o Brasil</>
          )}
          <span aria-hidden className="mx-2 text-white/40">
            •
          </span>
          Pix, cartão ou boleto
        </p>
      </div>

      <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/85 backdrop-blur-md">
        <div className="container-nk flex h-16 items-center gap-3 lg:h-20">
          <MobileMenu links={links} />

          <Link href="/" className="shrink-0" aria-label="NK STORE — página inicial">
            <Logo className="h-8 w-auto lg:h-9" />
          </Link>

          <nav aria-label="Principal" className="ml-8 hidden lg:block">
            <ul className="flex items-center gap-1">
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="rounded-full px-3 py-2 text-sm font-medium text-ink/80 transition hover:bg-ink/5 hover:text-ink"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <form action="/produtos" role="search" className="relative hidden md:block">
              <label htmlFor="busca-topo" className="sr-only">
                Buscar camisas
              </label>
              <input
                id="busca-topo"
                name="q"
                type="search"
                placeholder="Buscar camisas"
                className="h-10 w-52 rounded-full border border-line bg-surface pl-10 pr-4 text-sm outline-none transition placeholder:text-muted focus:w-64 focus:border-ink"
              />
              <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            </form>
            <Link
              href="/produtos"
              className="grid size-10 place-items-center rounded-full transition hover:bg-ink/5 md:hidden"
              aria-label="Buscar camisas"
            >
              <Search className="size-5" aria-hidden />
            </Link>
            <Link
              href="/carrinho"
              className="relative grid size-10 place-items-center rounded-full transition hover:bg-ink/5"
              aria-label="Carrinho"
            >
              <ShoppingBag className="size-5" aria-hidden />
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
