import type { Metadata } from "next";
import Link from "next/link";
import { DemoNotice, InstitutionalPage } from "@/components/loja/institutional";
import { getStoreSettings } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Quais dados a NK STORE coleta, para que usa e como você exerce seus direitos pela LGPD.",
  alternates: { canonical: "/politica-de-privacidade" },
};

export default async function PrivacidadePage() {
  const settings = await getStoreSettings();
  return (
    <InstitutionalPage
      eyebrow="Institucional"
      title="Política de privacidade"
      intro="Usamos só os dados necessários para entregar seu pedido, e você pode pedir para vê-los ou apagá-los quando quiser."
      updatedAt="25/10/2026"
    >
      <div className="prose-nk">
        <h2>Quais dados coletamos</h2>
        <ul>
          <li><strong>Na compra:</strong> nome, e-mail, telefone, CPF (opcional) e endereço de entrega;</li>
          <li><strong>No pagamento:</strong> os dados do cartão, Pix ou boleto são informados diretamente ao Mercado Pago. A NK STORE não recebe nem armazena dados de cartão;</li>
          <li><strong>Na navegação:</strong> o carrinho e o CEP ficam salvos apenas no seu navegador (armazenamento local), não em nossos servidores.</li>
        </ul>

        <h2>Para que usamos</h2>
        <ul>
          <li>Processar o pagamento, separar e entregar o pedido;</li>
          <li>Permitir o acompanhamento do pedido e o atendimento de trocas;</li>
          <li>Cumprir obrigações legais e fiscais.</li>
        </ul>
        <p>Não vendemos nem compartilhamos seus dados para publicidade.</p>

        <h2>Com quem compartilhamos</h2>
        <ul>
          <li><strong>Mercado Pago</strong>, para processar o pagamento;</li>
          <li><strong>Transportadoras</strong> (Correios ou parceiros), apenas nome e endereço para a entrega;</li>
          <li>Provedores de hospedagem e banco de dados que mantêm o site funcionando.</li>
        </ul>

        <h2>Cookies</h2>
        <p>
          Usamos apenas o essencial para o site funcionar. Não usamos cookies de rastreamento ou publicidade. A área
          administrativa usa um cookie de sessão para manter a equipe conectada.
        </p>

        <h2>Seus direitos (LGPD)</h2>
        <p>
          Pela Lei Geral de Proteção de Dados (Lei 13.709/2018), você pode pedir acesso, correção, portabilidade ou exclusão dos
          seus dados, e saber com quem foram compartilhados. Dados de pedidos podem ser mantidos pelo prazo exigido pela
          legislação fiscal.
        </p>
        <p>
          Para exercer seus direitos, escreva para{" "}
          {settings.email ? <a href={`mailto:${settings.email}`}>{settings.email}</a> : <Link href="/contato">nosso contato</Link>}.
        </p>

        <h2>Segurança</h2>
        <p>
          O site usa conexão criptografada (HTTPS), senhas da equipe são armazenadas com hash e o acesso ao painel é restrito.
        </p>
      </div>
      <div className="mt-8"><DemoNotice /></div>
    </InstitutionalPage>
  );
}
