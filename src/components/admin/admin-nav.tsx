"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { ExternalLink, FolderTree, LayoutDashboard, LogOut, Menu, Package, Receipt, Settings, TicketPercent, Users, X } from "lucide-react";
import { Logo } from "@/components/logo";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/pedidos", label: "Pedidos", icon: Receipt },
  { href: "/admin/produtos", label: "Produtos", icon: Package },
  { href: "/admin/categorias", label: "Categorias", icon: FolderTree },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/cupons", label: "Cupons", icon: TicketPercent },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-1">
      {NAV.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white aria-[current=page]:bg-lime aria-[current=page]:text-ink"
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Footer({ email }: { email: string }) {
  return (
    <div className="space-y-1 border-t border-white/10 pt-4 text-sm">
      <Link href="/" target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-white/70 hover:bg-white/5 hover:text-white">
        <ExternalLink className="size-4" aria-hidden /> Ver loja
      </Link>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/admin/login" })}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-white/70 hover:bg-white/5 hover:text-white"
      >
        <LogOut className="size-4" aria-hidden /> Sair
      </button>
      <p className="truncate px-3 pt-2 text-xs text-white/65" title={email}>
        {email}
      </p>
    </div>
  );
}

export function AdminNav({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    ref.current?.close();
  }, [pathname]);

  return (
    <>
      {/* desktop */}
      <aside aria-label="Navegação do painel" className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-ink p-4 lg:flex">
        <Link href="/admin" className="mb-8 mt-2 block px-2">
          <Logo tone="dark" decorative className="h-8 w-auto" />
          <span className="sr-only">NK STORE — painel</span>
        </Link>
        <nav aria-label="Painel" className="flex-1">
          <NavLinks />
        </nav>
        <Footer email={email} />
      </aside>

      {/* celular */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-ink px-4 lg:hidden">
        <Link href="/admin">
          <Logo tone="dark" decorative className="h-7 w-auto" />
          <span className="sr-only">NK STORE — painel</span>
        </Link>
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            ref.current?.showModal();
          }}
          className="grid size-10 place-items-center rounded-full text-white hover:bg-white/10"
          aria-label="Abrir menu do painel"
          aria-expanded={open}
        >
          <Menu className="size-5" aria-hidden />
        </button>
      </header>
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === ref.current && ref.current?.close()}
        aria-label="Menu do painel"
        className="m-0 h-dvh max-h-none w-72 bg-ink p-0 backdrop:bg-ink/60"
      >
        <div className="flex h-full flex-col p-4">
          <div className="mb-6 flex items-center justify-between">
            <Logo tone="dark" className="h-7 w-auto" />
            <button
              type="button"
              onClick={() => ref.current?.close()}
              className="grid size-10 place-items-center rounded-full text-white hover:bg-white/10"
              aria-label="Fechar menu"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <nav aria-label="Painel (menu móvel)" className="flex-1">
            <NavLinks onNavigate={() => ref.current?.close()} />
          </nav>
          <Footer email={email} />
        </div>
      </dialog>
    </>
  );
}
