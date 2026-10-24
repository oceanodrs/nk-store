// Gera ilustrações SVG de camisas genéricas para o catálogo demonstrativo.
// Nada aqui reproduz escudos, marcas ou padrões oficiais de clubes.

export type JerseyPattern =
  | "solid"
  | "stripes"
  | "tricolor"
  | "hoops"
  | "sash"
  | "halves"
  | "band"
  | "gradient"
  | "pinstripes";

export type JerseyDesign = {
  pattern: JerseyPattern;
  primary: string;
  secondary: string;
  tertiary?: string;
  accent: string; // gola e punhos
  number: string; // cor do número nas costas
  background: string; // fundo da foto
  collar?: "round" | "v";
};

export type JerseyView = "front" | "back" | "detail";

const W = 480;
const H = 600;

const BODY =
  "M192,92 Q240,150 288,92 L350,108 Q398,140 432,206 L390,268 L342,238 L340,520 Q240,536 140,520 L138,238 L90,268 L48,206 Q82,140 130,108 Z";
const BODY_BACK =
  "M192,92 Q240,112 288,92 L350,108 Q398,140 432,206 L390,268 L342,238 L340,520 Q240,536 140,520 L138,238 L90,268 L48,206 Q82,140 130,108 Z";

function patternLayer(d: JerseyDesign, id: string) {
  const { primary: p, secondary: s, tertiary: t = d.accent } = d;
  const parts: string[] = [`<rect width="${W}" height="${H}" fill="${p}"/>`];

  switch (d.pattern) {
    case "stripes":
      for (let x = 12; x < W; x += 56) parts.push(`<rect x="${x}" y="0" width="28" height="${H}" fill="${s}"/>`);
      break;
    case "tricolor": {
      const colors = [p, s, t];
      for (let i = 0, x = 0; x < W; i++, x += 34)
        parts.push(`<rect x="${x}" y="0" width="34" height="${H}" fill="${colors[i % 3]}"/>`);
      break;
    }
    case "hoops":
      for (let y = 150; y < H; y += 64) parts.push(`<rect x="0" y="${y}" width="${W}" height="32" fill="${s}"/>`);
      break;
    case "sash":
      parts.push(`<polygon points="118,90 188,90 384,540 314,540" fill="${s}"/>`);
      parts.push(`<polygon points="182,90 196,90 392,540 378,540" fill="${t}" opacity="0.9"/>`);
      break;
    case "halves":
      parts.push(`<rect x="${W / 2}" y="0" width="${W / 2}" height="${H}" fill="${s}"/>`);
      break;
    case "band":
      parts.push(`<rect x="0" y="262" width="${W}" height="54" fill="${s}"/>`);
      parts.push(`<rect x="0" y="322" width="${W}" height="8" fill="${t}"/>`);
      break;
    case "gradient":
      parts.push(`<rect width="${W}" height="${H}" fill="url(#${id}-grad)"/>`);
      break;
    case "pinstripes":
      for (let x = 6; x < W; x += 22) parts.push(`<rect x="${x}" y="0" width="3" height="${H}" fill="${s}" opacity="0.85"/>`);
      break;
    case "solid":
      // detalhe lateral discreto
      parts.push(`<rect x="134" y="236" width="14" height="300" fill="${s}"/>`);
      parts.push(`<rect x="332" y="236" width="14" height="300" fill="${s}"/>`);
      break;
  }
  return parts.join("");
}

export function jerseySvg(d: JerseyDesign, view: JerseyView, label: string, num = "10") {
  const id = `j${Math.abs(hash(label + view)).toString(36)}`;
  const body = view === "back" ? BODY_BACK : BODY;
  const viewBox = view === "detail" ? "130 70 220 275" : `0 0 ${W} ${H}`;
  const vCollar = d.collar === "v" && view !== "back";

  const collar =
    view === "back"
      ? `<path d="M192,92 Q240,112 288,92" fill="none" stroke="${d.accent}" stroke-width="16"/>`
      : vCollar
        ? `<path d="M192,92 L240,156 L288,92" fill="${d.accent}" stroke="${d.accent}" stroke-width="16" stroke-linejoin="round"/><path d="M200,92 L240,140 L280,92 Z" fill="${d.background}"/>`
        : `<path d="M192,92 Q240,150 288,92" fill="none" stroke="${d.accent}" stroke-width="18"/>`;

  const backPrint =
    view === "back"
      ? `<text x="240" y="232" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="34" letter-spacing="6" fill="${d.number}">NK</text>
         <text x="240" y="400" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="150" fill="${d.number}" stroke="rgba(0,0,0,.18)" stroke-width="3">${num}</text>`
      : "";

  // pequeno emblema genérico da própria loja (não é escudo de clube)
  const badge =
    view === "back"
      ? ""
      : `<g transform="translate(292 186)"><circle r="17" fill="${d.accent}" stroke="rgba(0,0,0,.2)" stroke-width="2"/><text y="5" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="13" fill="${d.primary}">NK</text></g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${view === "detail" ? 220 : W}" height="${view === "detail" ? 275 : H}" role="img" aria-label="${escapeXml(label)}">
  <defs>
    <radialGradient id="${id}-bg" cx="50%" cy="38%" r="70%">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${id}-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${d.primary}"/>
      <stop offset="1" stop-color="${d.secondary}"/>
    </linearGradient>
    <linearGradient id="${id}-shade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity="0.28"/>
      <stop offset="0.22" stop-color="#000" stop-opacity="0.04"/>
      <stop offset="0.5" stop-color="#fff" stop-opacity="0.10"/>
      <stop offset="0.78" stop-color="#000" stop-opacity="0.04"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.28"/>
    </linearGradient>
    <clipPath id="${id}-clip"><path d="${body}"/></clipPath>
    <filter id="${id}-blur" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="10"/></filter>
  </defs>
  <rect x="0" y="0" width="${W}" height="${H}" fill="${d.background}"/>
  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#${id}-bg)"/>
  <ellipse cx="240" cy="550" rx="130" ry="14" fill="#000" opacity="0.18" filter="url(#${id}-blur)"/>
  <g clip-path="url(#${id}-clip)">
    ${patternLayer(d, id)}
    <path d="M432,206 L390,268" stroke="${d.accent}" stroke-width="22"/>
    <path d="M48,206 L90,268" stroke="${d.accent}" stroke-width="22"/>
    ${collar}
    ${backPrint}
    <path d="M168,300 Q182,400 170,500 M312,300 Q298,400 310,500" stroke="#fff" stroke-opacity="0.08" stroke-width="6" fill="none"/>
    <rect x="0" y="0" width="${W}" height="${H}" fill="url(#${id}-shade)"/>
  </g>
  ${badge}
  <path d="${body}" fill="none" stroke="#000" stroke-opacity="0.16" stroke-width="2"/>
</svg>`;
}

function escapeXml(s: string) {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);
}

export function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
