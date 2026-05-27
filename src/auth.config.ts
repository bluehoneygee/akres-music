import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  providers: [],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (
        pathname === "/" ||
        pathname === "/login" ||
        pathname === "/about" ||
        pathname.startsWith("/about/") ||
        pathname === "/results" ||
        pathname === "/opposing-scroll-gallery.html"
      ) {
        return true;
      }
      return Boolean(auth?.user);
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = "role" in user ? String(user.role) : "Academic Staff";
      }
      return token;
    },
    session({ session, token }) {
      const currentUser = session.user as typeof session.user & { id: string; role: string };
      currentUser.id = token.sub ?? "";
      currentUser.role = String(token.role ?? "Academic Staff");
      return session;
    },
  },
} satisfies NextAuthConfig;
