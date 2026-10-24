import { CartToast } from "@/components/loja/cart-toast";
import { Footer } from "@/components/loja/footer";
import { Header } from "@/components/loja/header";

export default function LojaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="conteudo" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <Footer />
      <CartToast />
    </>
  );
}
