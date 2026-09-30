import { getPrisma } from "@/lib/db/client";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Required for Auth.js against localhost when NODE_ENV=production (CI e2e).
  // AUTH_URL / AUTH_TRUST_HOST also cover this; trustHost keeps next start usable.
  trustHost: true,
  adapter: PrismaAdapter(getPrisma()),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await getPrisma().user.findUnique({
          where: { email: parsed.data.email },
        });
        if (user?.passwordHash === null || user?.passwordHash === undefined) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id !== undefined) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user !== undefined && token.sub !== undefined) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
