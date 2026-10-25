import type { Metadata } from "next";
import Link from "next/link";
import { AtSign, Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { DemoNotice, InstitutionalPage } from "@/components/loja/institutional";
import { getStoreSettings } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Contato",
  description: "Fale com a NK STORE por WhatsApp, e-mail ou Instagram. Atendimento de segunda a sexta, das 9h às 18h.",
  alternates: { canonical: "/contato" },
};

export default async function ContatoPage() {
  const s = await getStoreSettings();
  const channels = [
    s.whatsapp && {
      icon: MessageCircle,
      title: "WhatsApp",
      text: "O jeito mais rápido de falar com a gente.",
      cta: "Chamar no WhatsApp",
      href: `https://wa.me/${s.whatsapp}?text=${encodeURIComponent("Olá! Vim pelo site da NK STORE.")}`,
      external: true,
    },
    s.email && { icon: Mail, title: "E-mail", text: s.email, cta: "Enviar e-mail", href: `mailto:${s.email}`, external: false },
    s.instagram && {
      icon: AtSign,
      title: "Instagram",
      text: `@${s.instagram}`,
      cta: "Abrir perfil",
      href: `https://instagram.com/${s.instagram}`,
      external: true,
    },
  ].filter(Boolean) as { icon: typeof Mail; title: string; text: string; cta: string; href: string; external: boolean }[];

  return (
    <InstitutionalPage
      eyebrow="Atendimento"
      title="Contato"
      intro="Dúvida sobre tamanho, prazo ou troca? Responderemos o quanto antes."
    >
      <ul className="grid gap-5 sm:grid-cols-3">
        {channels.map(({ icon: Icon, title, text, cta, href, external }) => (
          <li key={title} className="card flex flex-col">
            <span className="grid size-11 place-items-center rounded-full bg-lime-soft"><Icon className="size-5" aria-hidden /></span>
            <h2 className="mt-4 font-semibold">{title}</h2>
            <p className="mt-1 flex-1 break-words text-sm text-muted">{text}</p>
            <a
              href={href}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="btn-dark btn-sm mt-4 self-start"
            >
              {cta}
            </a>
          </li>
        ))}
      </ul>

      <ul className="mt-8 grid gap-4 text-sm sm:grid-cols-3">
        <li className="flex items-start gap-3"><Clock className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden /> Segunda a sexta, das 9h às 18h (exceto feriados).</li>
        {s.phone && <li className="flex items-start gap-3"><Phone className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden /> {s.phone}</li>}
        {s.address && <li className="flex items-start gap-3"><MapPin className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden /> {s.address}</li>}
      </ul>

      <div className="prose-nk mt-10">
        <p>
          Já fez um pedido? Acompanhe o andamento em <Link href="/acompanhar-pedido">Acompanhar pedido</Link> e, ao falar com a
          gente, informe o número (ex.: NK-000123). Muitas respostas estão em <Link href="/faq">Dúvidas frequentes</Link>.
        </p>
      </div>
      <div className="mt-8"><DemoNotice /></div>
    </InstitutionalPage>
  );
}
