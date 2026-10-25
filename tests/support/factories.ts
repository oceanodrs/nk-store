import { db } from "@/lib/db";

let seq = 0;
const uid = () => `${Date.now().toString(36)}${(seq++).toString(36)}`;

/** Cria categoria + produto com uma variante (tamanho M) e o estoque informado. */
export async function makeVariant(opts: { stock: number; reserved?: number; price?: number }) {
  const id = uid();
  const category = await db.category.create({ data: { name: `Cat ${id}`, slug: `cat-${id}` } });
  const price = opts.price ?? 20000;
  const product = await db.product.create({
    data: {
      name: `Camisa ${id}`,
      slug: `camisa-${id}`,
      description: "Produto de teste",
      price,
      finalPrice: price,
      searchText: `camisa ${id}`,
      categoryId: category.id,
      variants: { create: { size: "M", stock: opts.stock, reserved: opts.reserved ?? 0 } },
    },
    include: { variants: true },
  });
  return product.variants[0];
}

export async function variantState(id: string) {
  return db.productVariant.findUniqueOrThrow({ where: { id }, select: { stock: true, reserved: true } });
}

/** Pedido "aguardando pagamento" com a reserva já feita (como o checkout deixa). */
export async function makeAwaitingOrder(opts: { variantId: string; quantity: number; unitPrice: number; shipping?: number; couponCode?: string }) {
  const id = uid();
  const customer = await db.customer.create({ data: { email: `c${id}@teste.com`, name: "Cliente Teste" } });
  await db.productVariant.update({ where: { id: opts.variantId }, data: { reserved: { increment: opts.quantity } } });
  const subtotal = opts.unitPrice * opts.quantity;
  const shipping = opts.shipping ?? 0;
  return db.order.create({
    data: {
      accessToken: `token-de-teste-${id}`,
      customerId: customer.id,
      customerName: "Cliente Teste",
      customerEmail: customer.email,
      customerPhone: "11987654321",
      zipCode: "01310100",
      street: "Av. Paulista",
      number: "1000",
      district: "Bela Vista",
      city: "São Paulo",
      state: "SP",
      subtotal,
      shippingCost: shipping,
      total: subtotal + shipping,
      shippingService: "PAC",
      couponCode: opts.couponCode,
      items: {
        create: {
          variantId: opts.variantId,
          productName: "Camisa",
          productSlug: "camisa",
          size: "M",
          unitPrice: opts.unitPrice,
          quantity: opts.quantity,
        },
      },
    },
  });
}
