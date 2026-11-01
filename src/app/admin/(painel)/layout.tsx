import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdminPage } from "@/lib/auth";
import { DEMO_RESET_TIME, isDemoMode } from "@/lib/demo/config";

// o painel nunca é pré-gerado nem guardado em cache
export const dynamic = "force-dynamic";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminPage();
  return (
    <div className="min-h-dvh bg-paper lg:flex">
      <AdminNav email={session.user.email ?? ""} />
      <main id="conteudo" className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-6xl">
          {isDemoMode() && (
            <p role="note" className="mb-6 rounded-xl bg-lime-soft px-4 py-3 text-sm">
              <strong>Modo demonstração:</strong> fique à vontade para criar produtos, cupons e mudar pedidos. Tudo volta ao
              original todos os dias às {DEMO_RESET_TIME}. As configurações da loja ficam travadas.
            </p>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
