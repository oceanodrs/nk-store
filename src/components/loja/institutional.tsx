import Link from "next/link";

/** Moldura comum das páginas institucionais (Sobre, Trocas, Privacidade...). */
export function InstitutionalPage({
  eyebrow,
  title,
  intro,
  updatedAt,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  updatedAt?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="container-nk pt-8 sm:pt-12">
      <nav aria-label="Você está em" className="text-sm text-muted">
        <ol className="flex items-center gap-1.5">
          <li><Link href="/" className="hover:text-ink">Início</Link></li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-ink">{title}</li>
        </ol>
      </nav>
      <header className="mt-4 max-w-3xl">
        <p className="eyebrow text-muted">{eyebrow}</p>
        <h1 className="display mt-1 text-5xl sm:text-6xl">{title}</h1>
        {intro && <p className="mt-4 text-lg text-muted">{intro}</p>}
        {updatedAt && <p className="mt-2 text-xs text-muted">Atualizado em {updatedAt}</p>}
      </header>
      <div className="mt-10">{children}</div>
    </div>
  );
}

export function DemoNotice() {
  return (
    <p className="max-w-prose rounded-xl bg-lime-soft px-4 py-3 text-sm text-ink">
      <strong>Loja de demonstração.</strong> Este site é um projeto de portfólio: produtos, times e pagamentos são fictícios
      (ambiente de testes do Mercado Pago). Nenhum pedido é enviado de verdade.
    </p>
  );
}
