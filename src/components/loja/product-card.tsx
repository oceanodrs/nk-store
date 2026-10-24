import Link from "next/link";
import { ShirtImage } from "@/components/shirt-image";
import { isNew, type ProductCardData } from "@/lib/catalog";
import { discountPercent, effectivePrice, formatBRL, installments } from "@/lib/money";

type Props = {
  product: ProductCardData;
  /** marca a imagem como prioritária (primeiras da dobra) */
  priority?: boolean;
};

export function ProductCard({ product, priority }: Props) {
  const price = effectivePrice(product);
  const off = discountPercent(product);
  const parcel = installments(price);
  const [front, back] = product.images;
  const available = product.variants.some((v) => v.stock - v.reserved > 0);

  return (
    <article className="group relative flex flex-col">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] bg-line">
        {front && (
          <ShirtImage
            src={front.url}
            alt={front.alt}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition duration-500 ease-out group-hover:scale-[1.03]"
          />
        )}
        {back && (
          <ShirtImage
            src={back.url}
            alt=""
            aria-hidden
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover opacity-0 transition duration-500 ease-out group-hover:scale-[1.03] group-hover:opacity-100"
          />
        )}

        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {off > 0 && (
            <span className="rounded-full bg-ink px-2.5 py-1 text-xs font-bold text-lime">-{off}%</span>
          )}
          {isNew(product.createdAt) && (
            <span className="rounded-full bg-lime px-2.5 py-1 text-xs font-bold text-ink">Novo</span>
          )}
          {!available && (
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-ink">Esgotado</span>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-1 flex-col gap-1 px-0.5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">{product.category.name}</p>
        <h3 className="text-[15px] font-semibold leading-snug">
          <Link href={`/produto/${product.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto pt-1">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-lg font-bold">{formatBRL(price)}</span>
            {off > 0 && <span className="text-sm text-muted line-through">{formatBRL(product.price)}</span>}
          </p>
          {parcel.count > 1 && (
            <p className="text-xs text-muted">
              ou {parcel.count}x de {formatBRL(parcel.value)} sem juros
            </p>
          )}
        </div>
      </div>
      {/* foco do link "esticado" desenhado no card inteiro */}
      <span className="pointer-events-none absolute -inset-1.5 rounded-[1.5rem] ring-[3px] ring-transparent group-has-[:focus-visible]:ring-lime" />
    </article>
  );
}
