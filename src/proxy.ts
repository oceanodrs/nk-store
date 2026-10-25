import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

// Checagem "otimista" na borda: barra quem não tem sessão antes de chegar ao painel.
// A autorização definitiva é feita de novo em cada página, server action e API
// (requireAdminPage / requireAdmin em src/lib/auth.ts).
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token?.role === "ADMIN") return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const login = new URL("/admin/login", req.url);
  login.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
