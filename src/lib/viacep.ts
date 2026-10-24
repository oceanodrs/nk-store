import "server-only";

export type Address = {
  zipCode: string;
  street: string;
  district: string;
  city: string;
  state: string;
};

export type CepLookup =
  | { status: "ok"; address: Address }
  | { status: "not_found" }
  /** ViaCEP fora do ar/lento: o fluxo continua e o cliente digita o endereço */
  | { status: "unavailable" };

export async function lookupCep(cep: string): Promise<CepLookup> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return { status: "not_found" };
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 60 * 60 * 24 },
    });
    if (res.status === 400) return { status: "not_found" };
    if (!res.ok) return { status: "unavailable" };
    const data = (await res.json()) as {
      erro?: boolean | string;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    };
    if (data.erro) return { status: "not_found" };
    return {
      status: "ok",
      address: {
        zipCode: digits,
        street: data.logradouro ?? "",
        district: data.bairro ?? "",
        city: data.localidade ?? "",
        state: data.uf ?? "",
      },
    };
  } catch {
    return { status: "unavailable" };
  }
}
