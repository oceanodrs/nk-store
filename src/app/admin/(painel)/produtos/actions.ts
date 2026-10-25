"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { SIZES } from "@/lib/constants";
import { db } from "@/lib/db";
import { productDerivedFields } from "@/lib/product-fields";
import { revalidateCatalog } from "@/lib/revalidate";
import { fieldErrors, readProductForm, type FormState } from "@/lib/validators/admin";

export async function saveProduct(productId: string | null, _prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();

  const parsed = readProductForm(form);
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), message: "Confira os campos destacados." };
  }
  const d = parsed.data;

  const category = await db.category.findUnique({ where: { id: d.categoryId } });
  if (!category) return { errors: { categoryId: "Categoria não encontrada." } };

  const slugOwner = await db.product.findUnique({ where: { slug: d.slug }, select: { id: true } });
  if (slugOwner && slugOwner.id !== productId) {
    return { errors: { slug: "Já existe um produto com este endereço (slug)." } };
  }

  const existing = productId
    ? await db.product.findUnique({ where: { id: productId }, include: { variants: true } })
    : null;
  if (productId && !existing) return { message: "Produto não encontrado." };

  // não deixa o estoque ficar abaixo do que já está reservado em pedidos aguardando pagamento
  for (const v of existing?.variants ?? []) {
    const newStock = d.stock[v.size as (typeof SIZES)[number]];
    if (newStock != null && newStock < v.reserved) {
      return {
        errors: { [`stock.${v.size}`]: `Há ${v.reserved} reservada(s) em pedidos abertos.` },
        message: "Estoque menor que o reservado.",
      };
    }
  }

  const data = {
    name: d.name,
    slug: d.slug,
    description: d.description,
    price: d.price,
    salePrice: d.salePrice,
    weightGrams: d.weightGrams,
    active: d.active,
    featured: d.featured,
    categoryId: d.categoryId,
    ...productDerivedFields({ name: d.name, price: d.price, salePrice: d.salePrice, categoryName: category.name }),
  };

  const saved = await db.$transaction(async (tx) => {
    const product = existing
      ? await tx.product.update({ where: { id: existing.id }, data })
      : await tx.product.create({ data });

    await tx.productImage.deleteMany({ where: { productId: product.id } });
    await tx.productImage.createMany({
      data: d.images.map((img, position) => ({ productId: product.id, url: img.url, alt: img.alt, position })),
    });

    for (const size of SIZES) {
      await tx.productVariant.upsert({
        where: { productId_size: { productId: product.id, size } },
        update: { stock: d.stock[size] },
        create: { productId: product.id, size, stock: d.stock[size] },
      });
    }
    return product;
  });

  revalidateCatalog([saved.slug, ...(existing && existing.slug !== saved.slug ? [existing.slug] : [])]);

  if (!existing) redirect(`/admin/produtos/${saved.id}?criado=1`);
  return { ok: true, message: "Produto salvo com sucesso." };
}

export async function toggleProductActive(productId: string) {
  await requireAdmin();
  const product = await db.product.findUnique({ where: { id: productId }, select: { active: true, slug: true } });
  if (!product) return;
  await db.product.update({ where: { id: productId }, data: { active: !product.active } });
  revalidateCatalog([product.slug]);
  revalidatePath("/admin", "layout");
}

export async function deleteProduct(productId: string): Promise<FormState> {
  await requireAdmin();
  const product = await db.product.findUnique({
    where: { id: productId },
    select: { slug: true, _count: { select: { variants: { where: { orderItems: { some: {} } } } } } },
  });
  if (!product) return { message: "Produto não encontrado." };
  if (product._count.variants > 0) {
    return {
      message: "Este produto já aparece em pedidos e não pode ser excluído. Desative-o para tirá-lo da loja.",
    };
  }
  await db.product.delete({ where: { id: productId } });
  revalidateCatalog([product.slug]);
  redirect("/admin/produtos?excluido=1");
}
