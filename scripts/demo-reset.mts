// Restaura os dados de demonstração no banco do .env (catálogo, pedidos de exemplo,
// admin de demonstração). APAGA pedidos, clientes e produtos criados no painel.
//
//   npm run demo:reset -- --confirmar
//
// Útil para preparar uma apresentação no seu computador.
import "dotenv/config";
import { resetDemoStore } from "@/lib/demo/reset";

if (!process.argv.includes("--confirmar") && process.env.DEMO_MODE !== "true") {
  console.error(
    "Este comando APAGA pedidos, clientes e produtos criados no painel e restaura a loja de demonstração.\n" +
      "Para confirmar, rode:  npm run demo:reset -- --confirmar",
  );
  process.exit(1);
}

const result = await resetDemoStore({ force: true });
console.log(`✔ Loja de demonstração restaurada: ${result.orders} pedidos de exemplo (${result.ms} ms).`);
if (!process.env.DEMO_ADMIN_EMAIL) {
  console.log("  (sem DEMO_ADMIN_EMAIL no .env: use o admin do seed para entrar no painel)");
}
process.exit(0);
