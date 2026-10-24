import Link from "next/link";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-ink px-4 text-white">
      <div className="stripes-diagonal absolute inset-0" aria-hidden />
      <div className="relative text-center">
        <Link href="/" aria-label="NK STORE — página inicial" className="inline-block">
          <Logo tone="dark" className="mx-auto h-9 w-auto" />
        </Link>
        <p className="display mt-10 text-[clamp(6rem,24vw,12rem)] text-lime">404</p>
        <h1 className="display text-3xl sm:text-4xl">Bola fora!</h1>
        <p className="mx-auto mt-3 max-w-sm text-white/75">A página que você procura não existe ou mudou de lugar.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-lime">
            Voltar para a loja
          </Link>
          <Link href="/produtos" className="btn-outline-light">
            Ver camisas
          </Link>
        </div>
      </div>
    </main>
  );
}
