import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { getAdminSession } from "@/lib/auth";
import { demoAdminCredentials } from "@/lib/demo/config";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

type Props = { searchParams: Promise<{ callbackUrl?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  if (await getAdminSession()) redirect("/admin");
  const { callbackUrl } = await searchParams;
  // só aceita voltar para dentro do painel (evita redirecionamento aberto)
  const target = callbackUrl?.startsWith("/admin") && !callbackUrl.startsWith("//") ? callbackUrl : "/admin";

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="stripes-diagonal absolute inset-0" aria-hidden />
        <Logo tone="dark" className="relative h-10 w-auto self-start" />
        <div className="relative">
          <p className="eyebrow text-lime">Painel administrativo</p>
          <p className="display mt-3 text-6xl">
            Sua loja,
            <br />
            no seu <span className="text-lime">controle.</span>
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <Logo className="h-9 w-auto lg:hidden" />
          <h1 className="display mt-8 text-4xl lg:mt-0">Entrar no painel</h1>
          <p className="mt-2 text-sm text-muted">Acesso restrito à equipe da loja.</p>
          <LoginForm callbackUrl={target} demo={demoAdminCredentials()} />
        </div>
      </div>
    </main>
  );
}
