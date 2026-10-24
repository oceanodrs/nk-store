import Image, { type ImageProps } from "next/image";

/**
 * Wrapper do next/image. SVGs locais (placeholders do catálogo) não passam
 * pelo otimizador; fotos enviadas pelo painel (jpg/png/webp) são otimizadas.
 */
export function ShirtImage(props: ImageProps) {
  const src = typeof props.src === "string" ? props.src : "";
  // eslint-disable-next-line jsx-a11y/alt-text -- alt vem nas props
  return <Image {...props} unoptimized={props.unoptimized ?? src.endsWith(".svg")} />;
}
