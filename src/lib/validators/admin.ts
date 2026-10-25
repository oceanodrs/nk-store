import { z } from "zod";
import { SIZES } from "@/lib/constants";
import { parseBRL } from "@/lib/money";
import { isAllowedImageUrl } from "@/lib/image-url";

/** Estado devolvido pelas server actions dos formulários do painel. */
export type FormState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
};

const slug = z
  .string()
  .trim()
  .min(2, "Mínimo de 2 caracteres.")
  .max(80)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use só letras minúsculas, números e hífens (ex.: camisa-azul-24-25).");

const money = (label: string) =>
  z.string().transform((s, ctx) => {
    const cents = parseBRL(s);
    if (cents == null || cents <= 0) {
      ctx.addIssue({ code: "custom", message: `Informe ${label} válido, ex.: 199,90.` });
      return z.NEVER;
    }
    return cents;
  });

const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());

export const productImageSchema = z.object({
  url: z.string().refine(isAllowedImageUrl, "Imagem inválida."),
  alt: z.string().trim().min(3, "Descreva a imagem (texto alternativo).").max(200),
});

export const productFormSchema = z
  .object({
    name: z.string().trim().min(3, "Mínimo de 3 caracteres.").max(120),
    slug,
    categoryId: z.string().min(1, "Escolha uma categoria."),
    description: z.string().trim().min(10, "Escreva pelo menos uma frase.").max(5000),
    price: money("um preço"),
    salePrice: z
      .string()
      .optional()
      .transform((s, ctx) => {
        if (!s?.trim()) return null;
        const cents = parseBRL(s);
        if (cents == null || cents <= 0) {
          ctx.addIssue({ code: "custom", message: "Preço promocional inválido." });
          return z.NEVER;
        }
        return cents;
      }),
    weightGrams: z.coerce.number().int("Use um número inteiro.").min(50, "Mínimo 50 g.").max(5000, "Máximo 5000 g."),
    active: checkbox,
    featured: checkbox,
    stock: z.object(
      Object.fromEntries(
        SIZES.map((s) => [s, z.coerce.number().int("Use um número inteiro.").min(0, "Não pode ser negativo.").max(99999)]),
      ) as Record<(typeof SIZES)[number], z.ZodCoercedNumber<unknown>>,
    ),
    images: z
      .string()
      .transform((s, ctx) => {
        try {
          return JSON.parse(s) as unknown;
        } catch {
          ctx.addIssue({ code: "custom", message: "Imagens inválidas." });
          return z.NEVER;
        }
      })
      .pipe(z.array(productImageSchema).min(1, "Adicione pelo menos uma imagem.").max(10, "Máximo de 10 imagens.")),
  })
  .refine((d) => d.salePrice == null || d.salePrice < d.price, {
    path: ["salePrice"],
    message: "O preço promocional precisa ser menor que o preço normal.",
  });

export type ProductFormData = z.infer<typeof productFormSchema>;

export function readProductForm(form: FormData) {
  return productFormSchema.safeParse({
    name: form.get("name") ?? "",
    slug: form.get("slug") ?? "",
    categoryId: form.get("categoryId") ?? "",
    description: form.get("description") ?? "",
    price: form.get("price") ?? "",
    salePrice: form.get("salePrice") ?? "",
    weightGrams: form.get("weightGrams") ?? "",
    active: form.get("active"),
    featured: form.get("featured"),
    stock: Object.fromEntries(SIZES.map((s) => [s, form.get(`stock_${s}`) ?? "0"])),
    images: form.get("images") ?? "[]",
  });
}

export const categoryFormSchema = z.object({
  name: z.string().trim().min(2, "Mínimo de 2 caracteres.").max(60),
  slug,
  description: z.string().trim().max(300).optional().transform((s) => s || null),
  sortOrder: z.coerce.number().int().min(0).max(999),
  active: checkbox,
});

/** Converte erros do Zod em { campo: mensagem } para exibir ao lado de cada campo. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
