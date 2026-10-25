import { describe, expect, it } from "vitest";
import { formatOrderNumber, parseOrderNumber } from "@/lib/constants";
import { discountPercent, effectivePrice, formatBRL, parseBRL } from "@/lib/money";
import { applyFreeShipping } from "@/lib/shipping";
import { SimulatedShippingProvider } from "@/lib/shipping/simulado";
import { checkoutSchema, isValidCpf } from "@/lib/validators/checkout";

describe("dinheiro", () => {
  it("formata e interpreta valores em reais", () => {
    expect(formatBRL(19990)).toBe("R$ 199,90");
    expect(parseBRL("199,90")).toBe(19990);
    expect(parseBRL("R$ 1.299,90")).toBe(129990);
    expect(parseBRL("49.9")).toBe(4990);
    expect(parseBRL("abc")).toBeNull();
  });

  it("usa o preço promocional só quando é menor que o normal", () => {
    expect(effectivePrice({ price: 29990, salePrice: 24990 })).toBe(24990);
    expect(effectivePrice({ price: 29990, salePrice: 39990 })).toBe(29990);
    expect(discountPercent({ price: 29990, salePrice: 24990 })).toBe(17);
  });
});

describe("número do pedido", () => {
  it("formata como NK-000123 e aceita variações na busca", () => {
    expect(formatOrderNumber(123)).toBe("NK-000123");
    expect(parseOrderNumber("NK-000123")).toBe(123);
    expect(parseOrderNumber("nk123")).toBe(123);
    expect(parseOrderNumber(" 42 ")).toBe(42);
    expect(parseOrderNumber("NK-abc")).toBeNull();
    expect(parseOrderNumber("0")).toBeNull();
  });
});

describe("CPF", () => {
  it("valida pelos dígitos verificadores", () => {
    expect(isValidCpf("123.456.789-09")).toBe(true);
    expect(isValidCpf("123.456.789-00")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("123")).toBe(false);
  });
});

describe("checkout", () => {
  const valid = {
    customer: { name: "Maria Silva", email: "MARIA@Exemplo.com", phone: "(11) 98765-4321", cpf: "" },
    address: { zipCode: "01310-100", street: "Av. Paulista", number: "1000", complement: "", district: "Bela Vista", city: "São Paulo", state: "SP" },
    items: [{ variantId: "abc", quantity: 1 }],
    shippingOptionId: "simulado:pac",
    couponCode: "",
  };

  it("normaliza os dados válidos", () => {
    const r = checkoutSchema.parse(valid);
    expect(r.customer.email).toBe("maria@exemplo.com");
    expect(r.customer.phone).toBe("11987654321");
    expect(r.customer.cpf).toBeNull();
    expect(r.address.zipCode).toBe("01310100");
    expect(r.couponCode).toBeNull();
  });

  it("recusa quantidade acima do limite e campos obrigatórios vazios", () => {
    expect(checkoutSchema.safeParse({ ...valid, items: [{ variantId: "abc", quantity: 11 }] }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...valid, customer: { ...valid.customer, name: "Maria" } }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...valid, address: { ...valid.address, state: "XX" } }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...valid, items: [] }).success).toBe(false);
  });

  it("o navegador não consegue enviar preço: campos extras são descartados", () => {
    const r = checkoutSchema.parse({ ...valid, items: [{ variantId: "abc", quantity: 1, unitPrice: 1 }], total: 1 });
    expect(r.items[0]).toEqual({ variantId: "abc", quantity: 1 });
    expect("total" in r).toBe(false);
  });
});

describe("frete", () => {
  it("frete grátis zera a opção mais barata acima do valor mínimo", () => {
    const options = [
      { id: "a", name: "PAC", company: "x", price: 1890, days: 5 },
      { id: "b", name: "SEDEX", company: "x", price: 2990, days: 2 },
    ];
    expect(applyFreeShipping(options, 29990, 29990).map((o) => o.price)).toEqual([0, 2990]);
    expect(applyFreeShipping(options, 29989, 29990).map((o) => o.price)).toEqual([1890, 2990]);
    expect(applyFreeShipping(options, 99999, null).map((o) => o.price)).toEqual([1890, 2990]);
  });

  it("frete simulado encarece com o peso e varia por região", async () => {
    const provider = new SimulatedShippingProvider();
    const one = await provider.quote({ originZip: "01310100", destinationZip: "01310100", items: [{ weightGrams: 300, quantity: 1, unitPrice: 1 }] });
    const many = await provider.quote({ originZip: "01310100", destinationZip: "01310100", items: [{ weightGrams: 300, quantity: 6, unitPrice: 1 }] });
    const north = await provider.quote({ originZip: "01310100", destinationZip: "69005000", items: [{ weightGrams: 300, quantity: 1, unitPrice: 1 }] });
    expect(many[0].price).toBeGreaterThan(one[0].price);
    expect(north[0].price).toBeGreaterThan(one[0].price);
    expect(north[0].days).toBeGreaterThan(one[0].days);
  });
});
