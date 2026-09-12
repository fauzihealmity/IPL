import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/services/rate-limit.service";
import { UserRole, UserStatus } from "@prisma/client";

// Fields we attach to the session/JWT beyond NextAuth's defaults.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: UserRole;
      residentId: string | null;
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    residentId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    residentId: string | null;
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Never trust client input — re-validate shape server-side.
        const email = credentials.email.trim().toLowerCase();

        // Rate limit by email to blunt credential-stuffing / brute
        // force against a single account (spec §37). Deliberately
        // keyed by email rather than IP: an attacker rotating IPs
        // still can't exceed this, and it never locks out unrelated
        // users sharing a NAT/IP.
        const rateLimit = checkRateLimit(`login:${email}`, 5, 15 * 60 * 1000);
        if (!rateLimit.allowed) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: { resident: true },
        });

        if (!user || user.status !== UserStatus.ACTIVE) {
          return null;
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          residentId: user.resident?.id ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.residentId = user.residentId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.residentId = token.residentId;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
