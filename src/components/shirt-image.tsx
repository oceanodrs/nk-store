import Image, { type ImageProps } from "next/image";

/**
 * Wrapper do next/image. SVGs locais (placeholders do catálogo) não passam
 * pelo otimizador; fotos enviadas pelo painel (jpg/png/webp) são otimizadas.
 *
 * `priority` (descontinuado no Next 16) vira loading="eager" + fetchPriority="high",
 * como recomenda a documentação: use só na imagem que é o LCP da página.
 */
export function ShirtImage({ priority, ...props }: ImageProps) {
  const src = typeof props.src === "string" ? props.src : "";
  const eager = priority ? { loading: "eager" as const, fetchPriority: "high" as const } : {};
  // eslint-disable-next-line jsx-a11y/alt-text -- alt vem nas props
  return <Image {...eager} {...props} unoptimized={props.unoptimized ?? src.endsWith(".svg")} />;
}
