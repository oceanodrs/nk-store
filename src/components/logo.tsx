type LogoProps = {
  /** "dark" = texto claro, para fundos escuros */
  tone?: "light" | "dark";
  /** true quando o texto ao redor já nomeia o link (o SVG fica oculto para leitores de tela) */
  decorative?: boolean;
  className?: string;
};

export function Logo({ tone = "light", decorative, className }: LogoProps) {
  const text = tone === "dark" ? "#ffffff" : "#0e1311";
  return (
    <svg
      viewBox="0 0 168 40"
      className={className}
      {...(decorative ? { "aria-hidden": true, focusable: false } : { role: "img", "aria-label": "NK STORE" })}
    >
      {/* bloco inclinado com o corte diagonal de uma faixa de camisa */}
      <path d="M8 2h54l-8 36H0z" fill="#c8f031" />
      <path d="M44 2h6l-8 36h-6z" fill="#0e1311" opacity="0.9" />
      <text
        x="27"
        y="29.5"
        textAnchor="middle"
        fontFamily="var(--font-barlow), 'Arial Narrow', sans-serif"
        fontWeight="800"
        fontSize="26"
        fontStyle="italic"
        fill="#0e1311"
      >
        NK
      </text>
      <text
        x="70"
        y="28.5"
        fontFamily="var(--font-barlow), 'Arial Narrow', sans-serif"
        fontWeight="700"
        fontSize="22"
        letterSpacing="4.5"
        fill={text}
      >
        STORE
      </text>
    </svg>
  );
}
