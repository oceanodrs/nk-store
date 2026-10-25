import Link from "next/link";
import { getNavCategories, getStoreSettings } from "@/lib/catalog";
import { StoreLogo } from "./store-logo";

export async function Footer() {
  const [categories, settings] = await Promise.all([getNavCategories(), getStoreSettings()]);
  const year = new Date().getFullYear();

  const institutional = [
    { href: "/sobre", label: "Sobre a NK STORE" },
    { href: "/trocas-e-devolucoes", label: "Trocas e devoluções" },
    { href: "/politica-de-privacidade", label: "Política de privacidade" },
    { href: "/faq", label: "Dúvidas frequentes" },
    { href: "/contato", label: "Contato" },
  ];

  return (
    <footer className="mt-24 bg-ink text-white">
      <div className="stripes-diagonal">
        <div className="container-nk grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-xs">
            <StoreLogo logoUrl={settings.logoUrl} storeName={settings.storeName} tone="dark" className="h-9 w-auto" />
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              Camisas de futebol para quem vive o jogo, da arquibancada à pelada de domingo.
            </p>
          </div>

          <nav aria-labelledby="rodape-loja">
            <h2 id="rodape-loja" className="eyebrow text-lime">
              Loja
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm text-white/75">
              <li><Link className="hover:text-white" href="/produtos">Todas as camisas</Link></li>
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link className="hover:text-white" href={`/categoria/${c.slug}`}>{c.name}</Link>
                </li>
              ))}
              <li><Link className="hover:text-white" href="/acompanhar-pedido">Acompanhar pedido</Link></li>
            </ul>
          </nav>

          <nav aria-labelledby="rodape-institucional">
            <h2 id="rodape-institucional" className="eyebrow text-lime">
              Institucional
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm text-white/75">
              {institutional.map((l) => (
                <li key={l.href}>
                  <Link className="hover:text-white" href={l.href}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="eyebrow text-lime">Atendimento</h2>
            <ul className="mt-4 space-y-2.5 text-sm text-white/75">
              {settings.email && (
                <li><a className="hover:text-white" href={`mailto:${settings.email}`}>{settings.email}</a></li>
              )}
              {settings.whatsapp && (
                <li>
                  <a className="hover:text-white" href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noopener noreferrer">
                    WhatsApp
                  </a>
                </li>
              )}
              {settings.instagram && (
                <li>
                  <a className="hover:text-white" href={`https://instagram.com/${settings.instagram}`} target="_blank" rel="noopener noreferrer">
                    @{settings.instagram}
                  </a>
                </li>
              )}
              <li>Seg. a sex., 9h às 18h</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="container-nk flex flex-col gap-3 py-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
            <p>© {year} {settings.storeName}. Pagamentos processados pelo Mercado Pago.</p>
            <p>
              Projeto de portfólio: catálogo demonstrativo com times e camisas fictícios.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
