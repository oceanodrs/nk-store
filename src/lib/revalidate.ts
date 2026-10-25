import "server-only";
import { revalidatePath } from "next/cache";

/** Atualiza as páginas públicas do catálogo depois de mudanças no painel. */
export function revalidateCatalog(productSlugs: string[] = []) {
  revalidatePath("/");
  revalidatePath("/produtos");
  revalidatePath("/categoria/[slug]", "page");
  for (const slug of productSlugs) revalidatePath(`/produto/${slug}`);
}
