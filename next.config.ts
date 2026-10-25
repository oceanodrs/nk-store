import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 é um módulo nativo: não deve ser empacotado pelo bundler
  serverExternalPackages: ["better-sqlite3"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Vercel Blob (uploads em produção)
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  poweredByHeader: false,
  // permite abrir o `next dev` pelo túnel (Cloudflare/ngrok) ao testar o webhook
  allowedDevOrigins: ["*.trycloudflare.com", "*.ngrok-free.app", "*.ngrok.app"],
};

export default nextConfig;
