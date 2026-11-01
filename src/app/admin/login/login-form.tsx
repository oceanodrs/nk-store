"use client";

import { signIn } from "next-auth/react";
import { useRef, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";

type Props = {
  callbackUrl: string;
  /** credenciais do modo demonstração (portfólio), exibidas na tela */
  demo?: { email: string; password: string } | null;
};

export function LoginForm({ callbackUrl, demo }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function fillDemo() {
    const form = formRef.current;
    if (!form || !demo) return;
    (form.elements.namedItem("email") as HTMLInputElement).value = demo.email;
    (form.elements.namedItem("password") as HTMLInputElement).value = demo.password;
    form.requestSubmit();
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      email: data.get("email"),
      password: data.get("password"),
      redirect: false,
    });
    if (res?.ok && !res.error) {
      // navegação completa para o servidor ler o cookie de sessão novo
      window.location.assign(callbackUrl);
      return;
    }
    setLoading(false);
    setError(
      res?.error === "RATE_LIMIT"
        ? "Muitas tentativas. Aguarde 15 minutos e tente novamente."
        : "E-mail ou senha incorretos.",
    );
  }

  return (
    <>
    {demo && (
      <div className="mt-8 rounded-[var(--radius-card)] bg-lime-soft p-4 text-sm">
        <p className="font-semibold">Acesso de demonstração</p>
        <p className="mt-1 text-ink/80">
          Explore o painel à vontade: os dados voltam ao original todos os dias.
        </p>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt className="text-ink/70">E-mail</dt>
          <dd className="font-mono font-semibold">{demo.email}</dd>
          <dt className="text-ink/70">Senha</dt>
          <dd className="font-mono font-semibold">{demo.password}</dd>
        </dl>
        <button type="button" onClick={fillDemo} disabled={loading} className="btn-dark btn-sm mt-4">
          Entrar como visitante
        </button>
      </div>
    )}
    <form ref={formRef} onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
      <div>
        <label htmlFor="email" className="label">
          E-mail
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required className="input h-12" />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Senha
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            className="input h-12 pr-12"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted hover:text-ink"
            aria-label={show ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={show}
          >
            {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        </div>
      </div>

      <p role="alert" className="min-h-5 text-sm font-semibold text-danger">
        {error}
      </p>

      <button type="submit" disabled={loading} className="btn-dark h-12 w-full">
        {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
    </>
  );
}
