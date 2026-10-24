// Seed de demonstração da NK STORE.
// Catálogo 100% fictício: nomes, cores e imagens são genéricos.
// Rodar: npm run seed   (idempotente: pode rodar mais de uma vez)

import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { productDerivedFields, slugify } from "../src/lib/product-fields";
import { hash, jerseySvg, type JerseyDesign } from "./jersey-svg";

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" }),
});

const SIZES = ["P", "M", "G", "GG", "XG"] as const;
const IMG_DIR = path.join(process.cwd(), "public", "products");

const categories = [
  { slug: "brasileirao", name: "Brasileirão", description: "Camisas inspiradas nos clubes que fazem o futebol nacional.", sortOrder: 1 },
  { slug: "selecoes", name: "Seleções", description: "Para torcer pelo país em cada jogo.", sortOrder: 2 },
  { slug: "europeu", name: "Europeu", description: "O estilo das grandes ligas do outro lado do Atlântico.", sortOrder: 3 },
  { slug: "retro", name: "Retrô", description: "Modelos clássicos que marcaram época.", sortOrder: 4 },
];

type SeedProduct = {
  name: string;
  category: string;
  price: number;
  salePrice?: number;
  featured?: boolean;
  daysAgo: number;
  number: string;
  design: JerseyDesign;
  blurb: string;
};

const BG = { light: "#ECEEE8", warm: "#F1ECE4", cool: "#E6ECF0", dark: "#1C2320" };

const products: SeedProduct[] = [
  // --- Brasileirão ---
  {
    name: "Camisa Tricolor Clássica 24/25",
    category: "brasileirao",
    price: 29990,
    salePrice: 24990,
    featured: true,
    daysAgo: 40,
    number: "10",
    blurb: "Listras verticais em três cores e gola redonda contrastante. Um clássico das arquibancadas.",
    design: { pattern: "tricolor", primary: "#B3122E", secondary: "#F4F4F0", tertiary: "#111111", accent: "#111111", number: "#F4F4F0", background: BG.light },
  },
  {
    name: "Camisa Alvinegra Listrada 24/25",
    category: "brasileirao",
    price: 27990,
    featured: true,
    daysAgo: 12,
    number: "9",
    blurb: "Listras pretas e brancas largas, punhos pretos e acabamento premium.",
    design: { pattern: "stripes", primary: "#F4F4F0", secondary: "#121212", accent: "#121212", number: "#C8F031", background: BG.cool },
  },
  {
    name: "Camisa Rubro-Verde Torcida 24/25",
    category: "brasileirao",
    price: 25990,
    daysAgo: 55,
    number: "7",
    blurb: "Design meio a meio em vermelho e verde, feito para quem não fica em cima do muro.",
    design: { pattern: "halves", primary: "#C8102E", secondary: "#0B6B3A", accent: "#F4F4F0", number: "#F4F4F0", background: BG.warm },
  },
  {
    name: "Camisa Azul Celeste Home 24/25",
    category: "brasileirao",
    price: 26990,
    daysAgo: 5,
    number: "11",
    blurb: "Azul celeste com faixa horizontal no peito e detalhes em marinho.",
    design: { pattern: "band", primary: "#6CB4E4", secondary: "#0D2A4F", tertiary: "#F4F4F0", accent: "#0D2A4F", number: "#0D2A4F", background: BG.light },
  },
  {
    name: "Camisa Verde Mata Away 24/25",
    category: "brasileirao",
    price: 25990,
    salePrice: 21990,
    daysAgo: 70,
    number: "8",
    blurb: "Uniforme reserva branco com faixa diagonal verde-mata. Leve e respirável.",
    design: { pattern: "sash", primary: "#F4F4F0", secondary: "#14532D", tertiary: "#C8F031", accent: "#14532D", number: "#14532D", background: BG.cool },
  },
  // --- Seleções ---
  {
    name: "Camisa Seleção Ouro 2026",
    category: "selecoes",
    price: 34990,
    featured: true,
    daysAgo: 3,
    number: "10",
    blurb: "Amarelo vibrante com gola em V e detalhes verdes. Feita para dias de jogo grande.",
    design: { pattern: "solid", primary: "#F7D117", secondary: "#0B7A3B", accent: "#0B7A3B", number: "#0B4D8C", background: BG.cool, collar: "v" },
  },
  {
    name: "Camisa Seleção Azul Royal 2026",
    category: "selecoes",
    price: 32990,
    daysAgo: 8,
    number: "20",
    blurb: "Azul royal profundo com risca fina, gola redonda e punhos brancos.",
    design: { pattern: "pinstripes", primary: "#1D3FA6", secondary: "#2E55C9", accent: "#F4F4F0", number: "#F4F4F0", background: BG.light },
  },
  {
    name: "Camisa Seleção Celeste Pampa 2026",
    category: "selecoes",
    price: 32990,
    salePrice: 27990,
    daysAgo: 30,
    number: "10",
    blurb: "Listras celeste e branco com gola preta: tradição sul-americana em tecido tecnológico.",
    design: { pattern: "stripes", primary: "#F4F4F0", secondary: "#7CC4F0", accent: "#111111", number: "#111111", background: BG.warm },
  },
  {
    name: "Camisa Seleção Rubra 2026",
    category: "selecoes",
    price: 31990,
    daysAgo: 20,
    number: "7",
    blurb: "Vermelho intenso com faixa diagonal verde. Garra do primeiro ao último minuto.",
    design: { pattern: "sash", primary: "#B5121B", secondary: "#0E5E36", tertiary: "#F2C230", accent: "#F2C230", number: "#F2C230", background: BG.light },
  },
  // --- Europeu ---
  {
    name: "Camisa Azul Mar 24/25",
    category: "europeu",
    price: 31990,
    featured: true,
    daysAgo: 2,
    number: "17",
    blurb: "Degradê do azul-marinho ao turquesa, inspirado no mar. Modelagem slim.",
    design: { pattern: "gradient", primary: "#0B1F4D", secondary: "#14A3B8", accent: "#C8F031", number: "#C8F031", background: BG.cool },
  },
  {
    name: "Camisa Grená Real 24/25",
    category: "europeu",
    price: 29990,
    daysAgo: 45,
    number: "4",
    blurb: "Grená elegante com faixa dourada no peito. Sóbria, marcante e confortável.",
    design: { pattern: "band", primary: "#6E1423", secondary: "#4A0D18", tertiary: "#D4A537", accent: "#D4A537", number: "#D4A537", background: BG.warm },
  },
  {
    name: "Camisa Noite Listrada 24/25",
    category: "europeu",
    price: 30990,
    salePrice: 25990,
    daysAgo: 25,
    number: "9",
    blurb: "Listras pretas e azul-noite com punhos em amarelo neon.",
    design: { pattern: "stripes", primary: "#0E0E12", secondary: "#1E3A8A", accent: "#E8F53B", number: "#E8F53B", background: BG.light },
  },
  {
    name: "Camisa Branca Imperial 24/25",
    category: "europeu",
    price: 33990,
    daysAgo: 6,
    number: "5",
    blurb: "Branco total com detalhes dourados e gola em V. Pura elegância em campo.",
    design: { pattern: "solid", primary: "#FAFAF7", secondary: "#D4A537", accent: "#D4A537", number: "#1C1C1C", background: BG.dark, collar: "v" },
  },
  // --- Retrô ---
  {
    name: "Camisa Retrô Anos 70 Dourada",
    category: "retro",
    price: 22990,
    daysAgo: 90,
    number: "10",
    blurb: "Modelo retrô em algodão, com gola em V verde e o charme das Copas de antigamente.",
    design: { pattern: "solid", primary: "#F2C230", secondary: "#E2B11F", accent: "#0F6B3A", number: "#0F6B3A", background: BG.warm, collar: "v" },
  },
  {
    name: "Camisa Retrô Faixa Diagonal 1985",
    category: "retro",
    price: 21990,
    salePrice: 18990,
    daysAgo: 120,
    number: "5",
    blurb: "Branca com faixa diagonal preta: o visual clássico dos anos 80.",
    design: { pattern: "sash", primary: "#F4F4F0", secondary: "#151515", tertiary: "#C8102E", accent: "#151515", number: "#151515", background: BG.light },
  },
  {
    name: "Camisa Retrô Aros Verde e Branco 1992",
    category: "retro",
    price: 21990,
    featured: true,
    daysAgo: 60,
    number: "8",
    blurb: "Aros horizontais verde e branco e gola polo. Nostalgia dos anos 90.",
    design: { pattern: "hoops", primary: "#F4F4F0", secondary: "#127A3E", accent: "#127A3E", number: "#127A3E", background: BG.cool },
  },
];

/** Estoque determinístico por tamanho, com alguns casos de estoque baixo/zerado. */
function stockFor(slug: string, size: string, index: number) {
  const base = Math.abs(hash(slug + size)) % 18; // 0..17
  if (index % 5 === 0 && (size === "XG" || size === "P")) return size === "XG" ? 0 : 2;
  if (index % 7 === 3 && size === "GG") return 1;
  return 4 + base;
}

function description(p: SeedProduct) {
  return [
    p.blurb,
    "",
    "• Tecido 100% poliéster com tecnologia de secagem rápida",
    "• Modelagem torcedor, confortável para o dia a dia",
    "• Estampa e detalhes sublimados que não desbotam",
    "• Produto de catálogo demonstrativo, sem marcas oficiais",
  ].join("\n");
}

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("Defina SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD no arquivo .env antes de rodar o seed.");
  }
  if (password.length < 8) throw new Error("SEED_ADMIN_PASSWORD precisa ter pelo menos 8 caracteres.");

  await db.user.upsert({
    where: { email: email.toLowerCase() },
    update: { passwordHash: await bcrypt.hash(password, 12) },
    create: { email: email.toLowerCase(), name: "Admin Demo", passwordHash: await bcrypt.hash(password, 12) },
  });
  console.log(`✔ Admin: ${email}`);

  await db.storeSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      storeName: "NK STORE",
      email: "contato@nkstore.dev",
      phone: "(11) 4000-0000",
      whatsapp: "5511900000000",
      instagram: "nkstore.demo",
      address: "São Paulo/SP — loja online (demonstração)",
      originZipCode: "01310100",
      freeShippingThreshold: 29990,
    },
  });
  console.log("✔ Configurações da loja");

  const categoryIds: Record<string, string> = {};
  for (const c of categories) {
    const saved = await db.category.upsert({ where: { slug: c.slug }, update: c, create: c });
    categoryIds[c.slug] = saved.id;
  }
  console.log(`✔ ${categories.length} categorias`);

  await mkdir(IMG_DIR, { recursive: true });

  for (const [i, p] of products.entries()) {
    const slug = slugify(p.name);
    const views = [
      { view: "front" as const, alt: `${p.name} — frente` },
      { view: "back" as const, alt: `${p.name} — costas` },
      { view: "detail" as const, alt: `${p.name} — detalhe da gola` },
    ];
    for (const v of views) {
      await writeFile(path.join(IMG_DIR, `${slug}-${v.view}.svg`), jerseySvg(p.design, v.view, v.alt, p.number));
    }

    const createdAt = new Date(Date.now() - p.daysAgo * 24 * 60 * 60 * 1000);
    const data = {
      name: p.name,
      description: description(p),
      price: p.price,
      salePrice: p.salePrice ?? null,
      featured: p.featured ?? false,
      active: true,
      weightGrams: 300,
      categoryId: categoryIds[p.category],
      ...productDerivedFields({
        name: p.name,
        price: p.price,
        salePrice: p.salePrice ?? null,
        categoryName: categories.find((c) => c.slug === p.category)!.name,
      }),
    };
    const product = await db.product.upsert({
      where: { slug },
      update: data,
      create: { ...data, slug, createdAt },
    });

    await db.productImage.deleteMany({ where: { productId: product.id } });
    await db.productImage.createMany({
      data: views.map((v, position) => ({
        productId: product.id,
        url: `/products/${slug}-${v.view}.svg`,
        alt: v.alt,
        position,
      })),
    });

    for (const size of SIZES) {
      const stock = stockFor(slug, size, i);
      await db.productVariant.upsert({
        where: { productId_size: { productId: product.id, size } },
        update: { stock },
        create: { productId: product.id, size, stock },
      });
    }
  }
  console.log(`✔ ${products.length} produtos com imagens e estoque por tamanho`);

  const coupons = [
    { code: "BEMVINDO10", type: "PERCENT", value: 10, minSubtotal: null, usageLimit: null },
    { code: "NK20", type: "FIXED", value: 2000, minSubtotal: 15000, usageLimit: 100 },
  ];
  for (const c of coupons) {
    await db.coupon.upsert({ where: { code: c.code }, update: {}, create: c });
  }
  console.log("✔ Cupons de exemplo: BEMVINDO10 (10%) e NK20 (R$ 20 acima de R$ 150)");
}

main()
  .then(() => console.log("\nSeed concluído."))
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
