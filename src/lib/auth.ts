import "server-only";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

const credentialsSchema = z.object({
  email: z.email().max(200).transform((s) => s.toLowerCase().trim()),
  password: z.string().min(1).max(200),
});

// hash bcrypt de uma senha aleatória descartada: compara mesmo quando o e-mail
// não existe, para o tempo de resposta não revelar quais e-mails estão cadastrados
const DUMMY_HASH = "$2b$12$Ia1T9pnolTkZX.FqbNwn6OekU0rYUvqR9qKWZe63.W68Upw7CCmUa";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // 8 horas
  pages: { signIn: "/admin/login" },
  providers: [
    CredentialsProvider({
      name: "E-mail e senha",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(raw, req) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        // 5 tentativas a cada 15 min por IP e por e-mail
        const forwarded = req?.headers?.["x-forwarded-for"];
        const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim() || "local";
        const byIp = rateLimit(`login:ip:${ip}`, 10, 15 * 60_000);
        const byEmail = rateLimit(`login:email:${email}`, 5, 15 * 60_000);
        if (!byIp.ok || !byEmail.ok) throw new Error("RATE_LIMIT");

        const user = await db.user.findUnique({ where: { email } });
        const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !valid || user.role !== "ADMIN") return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = (user as { role?: string }).role ?? "ADMIN";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
};

export async function getAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") return null;
  // garante que o usuário ainda existe (ex.: removido do banco após o login)
  const exists = await db.user.findUnique({ where: { id: session.user.id }, select: { id: true } });
  return exists ? session : null;
}

/** Para páginas do painel: redireciona ao login se não houver sessão de admin. */
export async function requireAdminPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

/** Para server actions e APIs: lança erro se não houver sessão de admin. */
export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) throw new UnauthorizedError();
  return session;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Não autorizado.");
  }
}
