// Seed de demonstração da NK STORE.
// Catálogo 100% fictício: nomes, cores e imagens são genéricos (src/lib/demo/catalog.ts).
// Rodar: npm run seed   (idempotente: pode rodar mais de uma vez)

import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { createAdapter } from "../src/lib/db-adapter";
import { demoProducts, productImages, seedCatalog } from "../src/lib/demo/catalog";
import { jerseySvg } from "./jersey-svg";

const db = new PrismaClient({ adapter: createAdapter() });
const IMG_DIR = path.join(process.cwd(), "public", "products");

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
    create: { email: email.toLowerCase(), name: "Admin", passwordHash: await bcrypt.hash(password, 12) },
  });
  console.log(`✔ Admin: ${email}`);

  // imagens SVG das camisas fictícias (geradas por código)
  await mkdir(IMG_DIR, { recursive: true });
  for (const p of demoProducts) {
    for (const img of productImages(p)) {
      await writeFile(path.join(IMG_DIR, path.basename(img.url)), jerseySvg(p.design, img.view, img.alt, p.number));
    }
  }
  console.log(`✔ ${demoProducts.length * 3} imagens SVG em public/products`);

  await seedCatalog(db);
  console.log(`✔ Catálogo: 4 categorias, ${demoProducts.length} produtos com estoque por tamanho`);
  console.log("✔ Cupons de exemplo: BEMVINDO10 (10%) e NK20 (R$ 20 acima de R$ 150)");
}

main()
  .then(() => console.log("\nSeed concluído."))
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
