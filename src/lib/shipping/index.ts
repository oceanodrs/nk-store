import "server-only";
import { SimulatedShippingProvider } from "./simulado";
import type { ShippingOption, ShippingPackageItem, ShippingProvider } from "./types";

export type { ShippingOption } from "./types";

let provider: ShippingProvider | null = null;

/** Escolhe o provedor pela variável SHIPPING_PROVIDER ("simulado" | "melhorenvio"). */
export function getShippingProvider(): ShippingProvider {
  if (provider) return provider;
  // O provedor do Melhor Envio é ligado na Fase 4; até lá, sempre simulado.
  provider = new SimulatedShippingProvider();
  return provider;
}

/** Aplica a regra de frete grátis: a opção mais barata fica gratuita acima do valor mínimo. */
export function applyFreeShipping(options: ShippingOption[], subtotal: number, threshold: number | null) {
  if (threshold == null || subtotal < threshold || options.length === 0) return options;
  const cheapest = options.reduce((a, b) => (b.price < a.price ? b : a));
  return options.map((o) => (o.id === cheapest.id ? { ...o, price: 0, free: true } : o));
}

export async function quoteShipping(params: {
  originZip: string;
  destinationZip: string;
  items: ShippingPackageItem[];
  freeShippingThreshold: number | null;
}) {
  const subtotal = params.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const options = await getShippingProvider().quote({
    originZip: params.originZip,
    destinationZip: params.destinationZip,
    items: params.items,
  });
  return applyFreeShipping(
    options.sort((a, b) => a.price - b.price),
    subtotal,
    params.freeShippingThreshold,
  );
}
