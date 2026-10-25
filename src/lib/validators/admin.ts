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

const optionalMoney = (label: string) =>
  z
    .string()
    .optional()
    .transform((s, ctx) => {
      if (!s?.trim()) return null;
      const cents = parseBRL(s);
      if (cents == null || cents <= 0) {
        ctx.addIssue({ code: "custom", message: `${label} inválido.` });
        return z.NEVER;
      }
      return cents;
    });

/** "2026-12-31" (input date) => Date no fuso de Brasília; início ou fim do dia. */
const brDate = (edge: "start" | "end") =>
  z
    .string()
    .optional()
    .transform((s, ctx) => {
      if (!s) return null;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        ctx.addIssue({ code: "custom", message: "Data inválida." });
        return z.NEVER;
      }
      return new Date(`${s}T${edge === "start" ? "00:00:00" : "23:59:59"}-03:00`);
    });

export const couponFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,30}$/, "Use de 3 a 30 letras, números, - ou _ (sem espaços)."),
    type: z.enum(["PERCENT", "FIXED"], "Escolha o tipo."),
    value: z.string().trim().min(1, "Informe o valor."),
    minSubtotal: optionalMoney("Valor mínimo"),
    startsAt: brDate("start"),
    expiresAt: brDate("end"),
    usageLimit: z
      .string()
      .optional()
      .transform((s, ctx) => {
        if (!s?.trim()) return null;
        const n = Number(s);
        if (!Number.isInteger(n) || n < 1) {
          ctx.addIssue({ code: "custom", message: "Use um número inteiro maior que zero." });
          return z.NEVER;
        }
        return n;
      }),
    active: checkbox,
  })
  .transform((d, ctx) => {
    // percentual: 1 a 100 | valor fixo: reais => centavos
    let value: number | null;
    if (d.type === "PERCENT") {
      const n = Number(d.value.replace(",", "."));
      value = Number.isInteger(n) && n >= 1 && n <= 100 ? n : null;
      if (value == null) ctx.addIssue({ code: "custom", path: ["value"], message: "Percentual inteiro de 1 a 100." });
    } else {
      value = parseBRL(d.value);
      if (value == null || value <= 0) ctx.addIssue({ code: "custom", path: ["value"], message: "Valor inválido, ex.: 20,00." });
    }
    if (d.startsAt && d.expiresAt && d.expiresAt < d.startsAt) {
      ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "A data final é anterior à inicial." });
    }
    return { ...d, value: value ?? 0 };
  });

export const settingsFormSchema = z.object({
  storeName: z.string().trim().min(2, "Mínimo de 2 caracteres.").max(60),
  logoUrl: z
    .string()
    .trim()
    .optional()
    .transform((s) => s || null)
    .refine((s) => s == null || isAllowedImageUrl(s), "Logo inválido."),
  email: z.union([z.literal(""), z.email("E-mail inválido.")]).transform((s) => s || null),
  phone: z.string().trim().max(30).transform((s) => s || null),
  whatsapp: z
    .string()
    .transform((s) => s.replace(/\D/g, ""))
    .refine((s) => s === "" || (s.length >= 12 && s.length <= 13), "Use DDI + DDD + número, ex.: 5511987654321.")
    .transform((s) => s || null),
  instagram: z
    .string()
    .trim()
    .transform((s) => s.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, ""))
    .refine((s) => s === "" || /^[\w.]{1,30}$/.test(s), "Usuário do Instagram inválido.")
    .transform((s) => s || null),
  address: z.string().trim().max(200).transform((s) => s || null),
  originZipCode: z
    .string()
    .transform((s) => s.replace(/\D/g, ""))
    .refine((s) => s.length === 8, "CEP de origem com 8 dígitos."),
  freeShippingThreshold: optionalMoney("Valor do frete grátis"),
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
