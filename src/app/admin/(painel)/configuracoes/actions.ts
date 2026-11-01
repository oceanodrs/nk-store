"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { isDemoMode } from "@/lib/demo/config";
import { fieldErrors, settingsFormSchema, type FormState } from "@/lib/validators/admin";

export async function saveSettings(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  // na demonstração pública, ninguém troca contatos/WhatsApp por links de terceiros
  if (isDemoMode()) return { message: "No modo demonstração as configurações da loja não podem ser alteradas." };
  const get = (k: string) => String(form.get(k) ?? "");
  const parsed = settingsFormSchema.safeParse({
    storeName: get("storeName"),
    logoUrl: get("logoUrl"),
    email: get("email").trim(),
    phone: get("phone"),
    whatsapp: get("whatsapp"),
    instagram: get("instagram"),
    address: get("address"),
    originZipCode: get("originZipCode"),
    freeShippingThreshold: get("freeShippingThreshold"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: "Confira os campos destacados." };

  await db.storeSettings.upsert({ where: { id: 1 }, update: parsed.data, create: { id: 1, ...parsed.data } });
  // nome, contatos e frete grátis aparecem em todas as páginas da loja
  revalidatePath("/", "layout");
  return { ok: true, message: "Configurações salvas." };
}
