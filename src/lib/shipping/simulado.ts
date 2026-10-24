import type { ShippingOption, ShippingProvider, ShippingQuoteInput } from "./types";

// Tabela simulada pelo 1º dígito do CEP de destino (região postal).
// Valores em centavos e prazos em dias úteis, aproximados de PAC/SEDEX
// saindo de São Paulo. Só para demonstração.
const REGIONS: Record<string, { pac: [number, number]; sedex: [number, number] }> = {
  "0": { pac: [1890, 3], sedex: [2990, 1] }, // SP (Grande SP)
  "1": { pac: [1990, 4], sedex: [3190, 2] }, // SP (interior)
  "2": { pac: [2290, 5], sedex: [3490, 2] }, // RJ e ES
  "3": { pac: [2190, 5], sedex: [3290, 2] }, // MG
  "4": { pac: [2890, 8], sedex: [4890, 3] }, // BA e SE
  "5": { pac: [3190, 9], sedex: [5390, 4] }, // PE, AL, PB e RN
  "6": { pac: [3590, 11], sedex: [6290, 5] }, // CE, PI, MA, PA, AP, AM, RR e AC
  "7": { pac: [2790, 7], sedex: [4590, 3] }, // DF, GO, TO, MT, MS e RO
  "8": { pac: [2390, 5], sedex: [3690, 2] }, // PR e SC
  "9": { pac: [2590, 6], sedex: [3990, 3] }, // RS
};

const PACKAGE_WEIGHT_GRAMS = 100;

export class SimulatedShippingProvider implements ShippingProvider {
  readonly name = "simulado";

  async quote(input: ShippingQuoteInput): Promise<ShippingOption[]> {
    const region = REGIONS[input.destinationZip[0]];
    if (!region) return [];

    const grams = PACKAGE_WEIGHT_GRAMS + input.items.reduce((sum, i) => sum + i.weightGrams * i.quantity, 0);
    const kg = Math.max(1, Math.ceil(grams / 1000));
    // cada kg adicional encarece 18%
    const factor = 1 + 0.18 * (kg - 1);
    const price = (base: number) => Math.round((base * factor) / 10) * 10;

    return [
      { id: "simulado:pac", name: "PAC", company: "Correios (simulado)", price: price(region.pac[0]), days: region.pac[1] },
      { id: "simulado:sedex", name: "SEDEX", company: "Correios (simulado)", price: price(region.sedex[0]), days: region.sedex[1] },
    ];
  }
}
