import { Logo } from "@/components/logo";
import { ShirtImage } from "@/components/shirt-image";

/** Logo enviado no painel (Configurações) ou, se não houver, o logo padrão em SVG. */
export function StoreLogo({
  logoUrl,
  storeName,
  tone = "light",
  decorative,
  className,
}: {
  logoUrl: string | null;
  storeName: string;
  tone?: "light" | "dark";
  /** true quando o link já tem um texto acessível próprio */
  decorative?: boolean;
  className?: string;
}) {
  if (!logoUrl) return <Logo tone={tone} decorative={decorative} className={className} />;
  return (
    <span className={`relative block aspect-[4/1] ${className ?? ""}`}>
      <ShirtImage src={logoUrl} alt={decorative ? "" : storeName} fill sizes="200px" loading="eager" className="object-contain object-left" />
    </span>
  );
}
