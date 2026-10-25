import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdminPage } from "@/lib/auth";

// o painel nunca é pré-gerado nem guardado em cache
export const dynamic = "force-dynamic";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminPage();
  return (
    <div className="min-h-dvh bg-paper lg:flex">
      <AdminNav email={session.user.email ?? ""} />
      <main id="conteudo" className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
