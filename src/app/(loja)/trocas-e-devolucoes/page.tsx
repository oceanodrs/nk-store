import type { Metadata } from "next";
import Link from "next/link";
import { DemoNotice, InstitutionalPage } from "@/components/loja/institutional";

export const metadata: Metadata = {
  title: "Trocas e devoluções",
  description: "Como trocar o tamanho ou devolver sua camisa na NK STORE: prazos, condições e reembolso.",
  alternates: { canonical: "/trocas-e-devolucoes" },
};

export default function TrocasPage() {
  return (
    <InstitutionalPage
      eyebrow="Pós-venda"
      title="Trocas e devoluções"
      intro="Não serviu ou mudou de ideia? Resolver é simples."
      updatedAt="25/10/2026"
    >
      <div className="prose-nk">
        <h2>Direito de arrependimento (7 dias)</h2>
        <p>
          Pelo Código de Defesa do Consumidor (art. 49), você pode desistir da compra em até <strong>7 dias corridos</strong> a
          partir do recebimento, sem precisar justificar. Devolvemos o valor integral, incluindo o frete pago.
        </p>

        <h2>Troca de tamanho (30 dias)</h2>
        <p>
          Você tem até <strong>30 dias</strong> após o recebimento para trocar por outro tamanho do mesmo modelo, sujeito à
          disponibilidade em estoque. <strong>A primeira troca de tamanho é por nossa conta</strong>; nas seguintes, o frete de
          reenvio é do cliente.
        </p>

        <h2>Condições do produto</h2>
        <ul>
          <li>Sem sinais de uso, lavagem, odores ou personalização;</li>
          <li>Com etiquetas originais presas;</li>
          <li>Na embalagem original ou em outra que proteja a peça.</li>
        </ul>

        <h2>Defeito de fabricação</h2>
        <p>
          Recebeu com defeito? Você tem até <strong>90 dias</strong> para nos avisar (art. 26 do CDC). Analisamos em até 5 dias
          úteis após o recebimento e enviamos uma peça nova ou devolvemos o valor, como você preferir. O frete é por nossa conta.
        </p>

        <h2>Como solicitar</h2>
        <ol>
          <li>Entre em <Link href="/contato">contato</Link> informando o número do pedido (ex.: NK-000123) e o motivo;</li>
          <li>Enviamos as instruções e o código de postagem;</li>
          <li>Leve o pacote a uma agência dos Correios dentro do prazo indicado;</li>
          <li>Ao recebermos e conferirmos a peça, enviamos a troca ou fazemos o reembolso.</li>
        </ol>

        <h2>Reembolso</h2>
        <p>
          O estorno é feito pelo Mercado Pago na mesma forma de pagamento: no cartão, aparece em até 2 faturas, conforme a
          operadora; no Pix, a devolução é feita na conta de origem em até 5 dias úteis após a aprovação da devolução.
        </p>
      </div>
      <div className="mt-8"><DemoNotice /></div>
    </InstitutionalPage>
  );
}
