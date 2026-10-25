import { z } from "zod";
import { cepSchema, MAX_CART_LINES, MAX_QTY_PER_ITEM } from "./cart";

const digits = (s: string) => s.replace(/\D/g, "");

/** Valida CPF pelos dígitos verificadores. */
export function isValidCpf(value: string) {
  const cpf = digits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

const text = (min: number, max: number, msg: string) => z.string().trim().min(min, msg).max(max);

export const checkoutSchema = z.object({
  customer: z.object({
    name: text(5, 120, "Informe seu nome completo.").refine((s) => s.includes(" "), "Informe nome e sobrenome."),
    email: z.email("Informe um e-mail válido.").max(200).transform((s) => s.toLowerCase().trim()),
    phone: z
      .string()
      .transform(digits)
      .refine((s) => s.length === 10 || s.length === 11, "Informe um telefone com DDD."),
    cpf: z
      .string()
      .optional()
      .transform((s) => (s ? digits(s) : ""))
      .refine((s) => s === "" || isValidCpf(s), "CPF inválido.")
      .transform((s) => s || null),
  }),
  address: z.object({
    zipCode: cepSchema,
    street: text(2, 150, "Informe a rua."),
    number: text(1, 20, "Informe o número (ou S/N)."),
    complement: z.string().trim().max(80).optional().transform((s) => s || null),
    district: text(2, 80, "Informe o bairro."),
    city: text(2, 80, "Informe a cidade."),
    state: z.enum(UFS, "Selecione o estado."),
  }),
  items: z
    .array(z.object({ variantId: z.string().min(1).max(40), quantity: z.number().int().min(1).max(MAX_QTY_PER_ITEM) }))
    .min(1, "Seu carrinho está vazio.")
    .max(MAX_CART_LINES),
  shippingOptionId: z.string().min(1, "Escolha uma opção de frete.").max(60),
  couponCode: z.string().trim().max(40).optional().transform((s) => s || null),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const couponPreviewSchema = z.object({
  code: z.string().trim().min(1, "Digite o código do cupom.").max(40),
  items: checkoutSchema.shape.items,
});
