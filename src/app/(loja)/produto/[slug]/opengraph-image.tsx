import { ImageResponse } from "next/og";
import { getProductBySlug } from "@/lib/catalog";
import { formatBRL } from "@/lib/money";
import { imageDataUri, OG_SIZE, stripesBackground } from "@/lib/og";

export const alt = "Camisa à venda na NK STORE";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function ProductOgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  const image = await imageDataUri(product?.images[0]?.url);
  const onSale = product && product.finalPrice < product.price;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0e1311", backgroundImage: stripesBackground, color: "white" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: 72 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", background: "#c8f031", color: "#0e1311", fontSize: 36, fontWeight: 900, padding: "2px 18px", transform: "skewX(-12deg)" }}>NK</div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 7 }}>STORE</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 26, color: "#c8f031", letterSpacing: 4, textTransform: "uppercase" }}>{product?.category.name ?? ""}</div>
            <div style={{ fontSize: 68, fontWeight: 900, lineHeight: 1, marginTop: 12, textTransform: "uppercase" }}>{product?.name ?? "NK STORE"}</div>
            {product && (
              <div style={{ display: "flex", alignItems: "baseline", gap: 20, marginTop: 28 }}>
                <div style={{ fontSize: 56, fontWeight: 800 }}>{formatBRL(product.finalPrice)}</div>
                {onSale && <div style={{ fontSize: 32, color: "rgba(255,255,255,0.55)", textDecoration: "line-through" }}>{formatBRL(product.price)}</div>}
              </div>
            )}
          </div>
        </div>
        {image && (
          <div style={{ display: "flex", width: 504, height: 630, background: "#ecefe8" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse usa <img> */}
            <img src={image} alt="" width={504} height={630} style={{ objectFit: "cover" }} />
          </div>
        )}
      </div>
    ),
    size,
  );
}
