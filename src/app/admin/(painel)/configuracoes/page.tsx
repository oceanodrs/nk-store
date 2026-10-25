import { PageHeader } from "@/components/admin/page-header";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { centsToInput } from "@/lib/money";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  await requireAdminPage();
  const s = await db.storeSettings.findUnique({ where: { id: 1 } });

  return (
    <>
      <PageHeader title="Configurações" description="Dados exibidos na loja e regras de frete." />
      <SettingsForm
        values={{
          storeName: s?.storeName ?? "NK STORE",
          logoUrl: s?.logoUrl ?? "",
          email: s?.email ?? "",
          phone: s?.phone ?? "",
          whatsapp: s?.whatsapp ?? "",
          instagram: s?.instagram ?? "",
          address: s?.address ?? "",
          originZipCode: s?.originZipCode ?? "",
          freeShippingThreshold: centsToInput(s?.freeShippingThreshold),
        }}
      />
    </>
  );
}
