import { MongoDBAdapter } from "@auth/mongodb-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "@/auth.config";
import { ensureSeedData } from "@/lib/db";
import { client, getMongoDb } from "@/lib/mongodb";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: MongoDBAdapter(client),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").toLowerCase();
        const password = String(credentials?.password ?? "");

        if (!email || !password) return null;

        await ensureSeedData();
        const db = await getMongoDb();
        const user = await db.collection("users").findOne<{
          _id: unknown;
          email: string;
          name?: string;
          passwordHash?: string;
          role?: string;
        }>({ email });

        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: String(user._id),
          email: user.email,
          name: user.name ?? user.email,
          role: user.role ?? "Academic Staff",
        };
      },
    }),
  ],
});
