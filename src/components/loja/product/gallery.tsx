"use client";

import { useEffect, useRef, useState } from "react";
import { ShirtImage } from "@/components/shirt-image";

type Props = { images: { id: string; url: string; alt: string }[] };

/**
 * Galeria: no celular desliza com o dedo (scroll-snap); no desktop usa miniaturas.
 * A imagem ativa é detectada pela rolagem, então os dois modos ficam sincronizados.
 */
export function Gallery({ images }: Props) {
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
      },
      { root: track, threshold: 0.6 },
    );
    track.querySelectorAll("[data-index]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [images.length]);

  function go(index: number) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: track.clientWidth * index, behavior: "smooth" });
  }

  if (images.length === 0) {
    return <div className="aspect-[4/5] rounded-[var(--radius-xl2)] bg-line" />;
  }

  return (
    <div className="flex flex-col-reverse gap-3 lg:flex-row lg:gap-4">
      {images.length > 1 && (
        <ul className="flex gap-2 lg:w-20 lg:flex-col" aria-label="Escolher imagem">
          {images.map((img, i) => (
            <li key={img.id}>
              <button
                type="button"
                onClick={() => go(i)}
                aria-label={`Ver imagem ${i + 1} de ${images.length}: ${img.alt}`}
                aria-current={active === i}
                className="relative block aspect-[4/5] w-16 overflow-hidden rounded-xl bg-line opacity-60 ring-2 ring-transparent transition hover:opacity-100 aria-[current=true]:opacity-100 aria-[current=true]:ring-ink lg:w-20"
              >
                <ShirtImage src={img.url} alt="" fill sizes="80px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative flex-1">
        <div
          ref={trackRef}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-[var(--radius-xl2)] bg-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          tabIndex={0}
          aria-label="Imagens do produto. Use as setas para navegar."
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") go(Math.min(images.length - 1, active + 1));
            if (e.key === "ArrowLeft") go(Math.max(0, active - 1));
          }}
        >
          {images.map((img, i) => (
            <div key={img.id} data-index={i} className="relative aspect-[4/5] w-full shrink-0 snap-center">
              <ShirtImage
                src={img.url}
                alt={img.alt}
                fill
                priority={i === 0}
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
        {images.length > 1 && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5 lg:hidden" aria-hidden>
            {images.map((img, i) => (
              <span
                key={img.id}
                className={`h-1.5 rounded-full transition-all ${active === i ? "w-6 bg-ink" : "w-1.5 bg-ink/30"}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
