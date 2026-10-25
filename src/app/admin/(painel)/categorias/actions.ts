"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { productDerivedFields } from "@/lib/product-fields";
import { revalidateCatalog } from "@/lib/revalidate";
import { categoryFormSchema, fieldErrors, type FormState } from "@/lib/validators/admin";

export async function saveCategory(categoryId: string | null, _prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();

  const parsed = categoryFormSchema.safeParse({
    name: form.get("name") ?? "",
    slug: form.get("slug") ?? "",
    description: form.get("description") ?? "",
    sortOrder: form.get("sortOrder") || 0,
    active: form.get("active"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: "Confira os campos." };
  const d = parsed.data;

  const slugOwner = await db.category.findUnique({ where: { slug: d.slug }, select: { id: true } });
  if (slugOwner && slugOwner.id !== categoryId) return { errors: { slug: "Já existe uma categoria com este slug." } };

  if (categoryId) {
    const before = await db.category.findUnique({ where: { id: categoryId } });
    if (!before) return { message: "Categoria não encontrada." };
    await db.$transaction(async (tx) => {
      await tx.category.update({ where: { id: categoryId }, data: d });
      // o nome da categoria faz parte do texto de busca dos produtos
      if (before.name !== d.name) {
        const products = await tx.product.findMany({
          where: { categoryId },
          select: { id: true, name: true, price: true, salePrice: true },
        });
        for (const p of products) {
          await tx.product.update({
            where: { id: p.id },
            data: productDerivedFields({ ...p, categoryName: d.name }),
          });
        }
      }
    });
  } else {
    await db.category.create({ data: d });
  }

  revalidateCatalog();
  revalidatePath("/admin/categorias");
  return { ok: true, message: categoryId ? "Categoria atualizada." : "Categoria criada." };
}

export async function deleteCategory(categoryId: string): Promise<FormState> {
  await requireAdmin();
  const count = await db.product.count({ where: { categoryId } });
  if (count > 0) {
    return {
      message: `Esta categoria tem ${count} ${count === 1 ? "produto" : "produtos"}. Mova-os para outra categoria ou desative a categoria.`,
    };
  }
  await db.category.delete({ where: { id: categoryId } });
  revalidateCatalog();
  revalidatePath("/admin/categorias");
  return { ok: true, message: "Categoria excluída." };
}
