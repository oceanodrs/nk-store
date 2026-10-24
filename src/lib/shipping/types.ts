export type ShippingPackageItem = {
  weightGrams: number;
  quantity: number;
  /** centavos, usado para seguro/valor declarado */
  unitPrice: number;
};

export type ShippingQuoteInput = {
  originZip: string;
  destinationZip: string;
  items: ShippingPackageItem[];
};

export type ShippingOption = {
  /** identificador estável, ex.: "simulado:pac" ou "melhorenvio:1" */
  id: string;
  name: string;
  company: string;
  /** centavos */
  price: number;
  /** prazo em dias úteis */
  days: number;
  /** true quando a regra de frete grátis zerou o preço */
  free?: boolean;
};

/** Contrato que todo provedor de frete implementa. Troque o provedor sem mexer no resto. */
export interface ShippingProvider {
  readonly name: string;
  quote(input: ShippingQuoteInput): Promise<ShippingOption[]>;
}
