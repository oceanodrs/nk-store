import { z } from "zod";

export const MAX_QTY_PER_ITEM = 10;
export const MAX_CART_LINES = 30;

const id = z.string().min(1).max(40);
const quantity = z.number().int().min(1).max(MAX_QTY_PER_ITEM);

export const cepSchema = z
  .string()
  .transform((s) => s.replace(/\D/g, ""))
  .refine((s) => s.length === 8, "Informe um CEP válido com 8 dígitos.");

export const shippingQuoteSchema = z.object({
  cep: cepSchema,
  items: z
    .array(z.object({ productId: id, quantity }))
    .min(1, "Adicione pelo menos um produto.")
    .max(MAX_CART_LINES),
});

export const cartValidateSchema = z.object({
  items: z.array(z.object({ variantId: id, quantity })).max(MAX_CART_LINES),
});
