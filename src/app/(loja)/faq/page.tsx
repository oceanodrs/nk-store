import type { Metadata } from "next";
import Link from "next/link";
import { DemoNotice, InstitutionalPage } from "@/components/loja/institutional";
import { getStoreSettings } from "@/lib/catalog";
import { formatBRL } from "@/lib/money";

export const metadata: Metadata = {
  title: "Dúvidas frequentes",
  description: "Prazos de entrega, formas de pagamento, tamanhos, trocas e acompanhamento de pedidos na NK STORE.",
  alternates: { canonical: "/faq" },
};

export default async function FaqPage() {
  const s = await getStoreSettings();
  const free = s.freeShippingThreshold ? formatBRL(s.freeShippingThreshold) : null;

  // texto simples (usado também nos dados estruturados do Google)
  const faqs: { q: string; a: string; extra?: React.ReactNode }[] = [
    {
      q: "Quais formas de pagamento vocês aceitam?",
      a: "Pix, cartão de crédito (em até 6x) e boleto, todos processados com segurança pelo Mercado Pago. Os dados do cartão são informados diretamente ao Mercado Pago.",
    },
    {
      q: "Quanto tempo leva para o pedido chegar?",
      a: "O prazo depende do CEP e da opção de frete escolhida, e aparece antes de você finalizar a compra. Ele começa a contar depois da confirmação do pagamento e do envio.",
    },
    {
      q: "Vocês têm frete grátis?",
      a: free
        ? `Sim. Em compras acima de ${free}, a opção de frete mais econômica fica grátis automaticamente.`
        : "No momento não temos promoção de frete grátis. Calcule o frete na página do produto ou no carrinho.",
    },
    {
      q: "Como escolher o tamanho certo?",
      a: "Cada produto tem um guia de medidas com largura e comprimento da peça. Meça uma camisa que você já usa e compare. Se ficar entre dois tamanhos, prefira o maior para um caimento mais solto.",
    },
    {
      q: "Posso trocar se não servir?",
      a: "Pode. Você tem 30 dias para trocar o tamanho e a primeira troca é por nossa conta. Também pode desistir da compra em até 7 dias após o recebimento.",
      extra: <Link href="/trocas-e-devolucoes" className="font-semibold underline underline-offset-2">Ver política de trocas</Link>,
    },
    {
      q: "Como acompanho meu pedido?",
      a: "Na página Acompanhar pedido, com o número do pedido (ex.: NK-000123) e o e-mail usado na compra. Quando o pedido for enviado, o código de rastreio aparece lá.",
      extra: <Link href="/acompanhar-pedido" className="font-semibold underline underline-offset-2">Acompanhar pedido</Link>,
    },
    {
      q: "Paguei com boleto. Quando o pedido é confirmado?",
      a: "O boleto é compensado em até 3 dias úteis. Os itens ficam reservados para você nesse período; se o pagamento não for identificado, o pedido é cancelado automaticamente.",
    },
    {
      q: "As camisas são oficiais?",
      a: "Este é um catálogo demonstrativo de portfólio: os times e modelos são fictícios e não há nenhuma marca oficial de clubes ou seleções.",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <InstitutionalPage eyebrow="Ajuda" title="Dúvidas frequentes" intro="As perguntas que mais recebemos. Não achou a sua? Fale com a gente.">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="max-w-3xl divide-y divide-line border-y border-line">
        {faqs.map((f) => (
          <details key={f.q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">
              {f.q}
              <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-ink/5 text-xl transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 max-w-prose leading-relaxed text-ink/80">{f.a}</p>
            {f.extra && <p className="mt-2 text-sm">{f.extra}</p>}
          </details>
        ))}
      </div>
      <p className="mt-8 text-sm text-muted">
        Ainda com dúvida? <Link href="/contato" className="font-semibold text-ink underline underline-offset-2">Fale com a gente</Link>.
      </p>
      <div className="mt-8"><DemoNotice /></div>
    </InstitutionalPage>
  );
}
