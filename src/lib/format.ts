export const onlyDigits = (s: string) => s.replace(/\D/g, "");

/** "01310100" => "01310-100" (aceita digitação parcial) */
export function formatCep(value: string) {
  const d = onlyDigits(value).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function pluralDays(n: number) {
  return `${n} ${n === 1 ? "dia útil" : "dias úteis"}`;
}
