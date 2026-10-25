import { ImageResponse } from "next/og";
import { imageDataUri, OG_SIZE, stripesBackground } from "@/lib/og";

export const alt = "NK STORE — camisas de futebol para quem vive o jogo";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function OpengraphImage() {
  const shirts = await Promise.all(
    ["camisa-azul-mar-24-25-front.svg", "camisa-selecao-ouro-2026-front.svg", "camisa-alvinegra-listrada-24-25-front.svg"].map((f) =>
      imageDataUri(`/products/${f}`),
    ),
  );

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0e1311", backgroundImage: stripesBackground, padding: 72, color: "white" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ display: "flex", background: "#c8f031", color: "#0e1311", fontSize: 44, fontWeight: 900, padding: "4px 22px", transform: "skewX(-12deg)" }}>NK</div>
            <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: 8 }}>STORE</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 112, fontWeight: 900, lineHeight: 0.95, letterSpacing: -2 }}>VISTA</div>
            <div style={{ display: "flex", fontSize: 112, fontWeight: 900, lineHeight: 0.95, letterSpacing: -2 }}>
              O&nbsp;<span style={{ color: "#c8f031" }}>JOGO.</span>
            </div>
            <div style={{ fontSize: 30, color: "rgba(255,255,255,0.75)", marginTop: 24 }}>Clubes, seleções e retrô · Envio para todo o Brasil</div>
          </div>
        </div>
        <div style={{ display: "flex", position: "relative", width: 460, alignItems: "center", justifyContent: "center" }}>
          {/* laterais primeiro, a do meio por último (fica por cima) */}
          {[1, 2, 0].map((i) => [shirts[i], i] as const).map(([src, i]) =>
            src ? (
              // eslint-disable-next-line @next/next/no-img-element -- ImageResponse usa <img>
              <img
                key={i}
                src={src}
                alt=""
                width={i === 0 ? 300 : 230}
                height={i === 0 ? 375 : 288}
                style={{
                  position: "absolute",
                  borderRadius: 28,
                  left: i === 0 ? 80 : i === 1 ? 0 : 230,
                  top: i === 0 ? 60 : 130,
                  ...(i === 1 ? { transform: "rotate(-8deg)" } : i === 2 ? { transform: "rotate(8deg)" } : {}),
                  opacity: i === 0 ? 1 : 0.85,
                }}
              />
            ) : null,
          )}
        </div>
      </div>
    ),
    size,
  );
}
