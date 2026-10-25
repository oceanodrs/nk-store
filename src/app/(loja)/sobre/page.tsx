import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Shirt, Truck } from "lucide-react";
import { DemoNotice, InstitutionalPage } from "@/components/loja/institutional";

export const metadata: Metadata = {
  title: "Sobre a NK STORE",
  description: "Conheça a NK STORE: camisas de futebol de clubes, seleções e modelos retrô, com compra segura e envio para todo o Brasil.",
  alternates: { canonical: "/sobre" },
};

const values = [
  { icon: Shirt, title: "Curadoria de quem joga", text: "Escolhemos cada modelo pensando em caimento, tecido e no que faz uma camisa virar clássica." },
  { icon: BadgeCheck, title: "Compra sem dor de cabeça", text: "Pagamento pelo Mercado Pago, estoque conferido na hora e acompanhamento do pedido pelo site." },
  { icon: Truck, title: "Do nosso estoque à sua casa", text: "Enviamos para todo o Brasil com rastreio, e a primeira troca de tamanho é por nossa conta." },
];

export default function SobrePage() {
  return (
    <InstitutionalPage
      eyebrow="Institucional"
      title="Sobre a NK STORE"
      intro="Nascemos da arquibancada: a ideia é simples, vender a camisa que a gente mesmo gostaria de vestir no dia do jogo."
    >
      <ul className="grid gap-5 sm:grid-cols-3">
        {values.map(({ icon: Icon, title, text }) => (
          <li key={title} className="card">
            <span className="grid size-11 place-items-center rounded-full bg-lime-soft"><Icon className="size-5" aria-hidden /></span>
            <h2 className="mt-4 font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted">{text}</p>
          </li>
        ))}
      </ul>

      <div className="prose-nk mt-12">
        <h2>Nossa história</h2>
        <p>
          A NK STORE começou como um perfil de amigos que trocavam camisas raras entre si. Com o tempo, os pedidos de quem
          acompanhava viraram rotina e a troca virou loja. Hoje reunimos modelos inspirados no futebol brasileiro, em seleções,
          nas ligas europeias e nas camisas retrô que marcaram época.
        </p>
        <p>
          Trabalhamos com estoque próprio e controle por tamanho: se aparece disponível no site, está separado aqui. Dúvidas sobre
          medidas, prazos ou trocas? <Link href="/contato">Fale com a gente</Link>.
        </p>
      </div>
      <div className="mt-8"><DemoNotice /></div>
    </InstitutionalPage>
  );
}
