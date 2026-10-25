import { Logo } from "@/components/logo";
import { ShirtImage } from "@/components/shirt-image";

/** Logo enviado no painel (Configurações) ou, se não houver, o logo padrão em SVG. */
export function StoreLogo({
  logoUrl,
  storeName,
  tone = "light",
  className,
}: {
  logoUrl: string | null;
  storeName: string;
  tone?: "light" | "dark";
  className?: string;
}) {
  if (!logoUrl) return <Logo tone={tone} className={className} />;
  return (
    <span className={`relative block aspect-[4/1] ${className ?? ""}`}>
      <ShirtImage src={logoUrl} alt={storeName} fill sizes="200px" priority className="object-contain object-left" />
    </span>
  );
}
