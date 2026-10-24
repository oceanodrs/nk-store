"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";

type Props = { links: { href: string; label: string }[] };

export function MobileMenu({ links }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);

  // fecha ao trocar de página
  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="-ml-2 grid size-10 place-items-center rounded-full transition hover:bg-ink/5"
        aria-label="Abrir menu"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Menu className="size-6" aria-hidden />
      </button>

      {/* <dialog> nativo: prende o foco, fecha com Esc e bloqueia o fundo */}
      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === dialogRef.current && setOpen(false)}
        aria-label="Menu"
        className="m-0 h-dvh max-h-none w-[86vw] max-w-sm bg-ink p-0 text-white backdrop:bg-ink/60 backdrop:backdrop-blur-sm open:animate-[fade-up_.35s_var(--ease-out-soft)]"
      >
        <div className="stripes-diagonal flex h-full flex-col">
          <div className="flex h-16 items-center justify-between px-4">
            <Logo tone="dark" className="h-8 w-auto" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid size-10 place-items-center rounded-full transition hover:bg-white/10"
              aria-label="Fechar menu"
            >
              <X className="size-6" aria-hidden />
            </button>
          </div>
          <nav aria-label="Menu principal" className="flex-1 overflow-y-auto px-4 pb-8 pt-4">
            <ul className="space-y-1">
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="display block rounded-xl px-3 py-3 text-3xl transition hover:bg-white/5 hover:text-lime"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="mt-8 space-y-1 border-t border-white/10 pt-6 text-sm text-white/75">
              <li><Link href="/acompanhar-pedido" onClick={() => setOpen(false)} className="block px-3 py-2 hover:text-white">Acompanhar pedido</Link></li>
              <li><Link href="/trocas-e-devolucoes" onClick={() => setOpen(false)} className="block px-3 py-2 hover:text-white">Trocas e devoluções</Link></li>
              <li><Link href="/faq" onClick={() => setOpen(false)} className="block px-3 py-2 hover:text-white">Dúvidas frequentes</Link></li>
              <li><Link href="/contato" onClick={() => setOpen(false)} className="block px-3 py-2 hover:text-white">Contato</Link></li>
            </ul>
          </nav>
        </div>
      </dialog>
    </div>
  );
}
