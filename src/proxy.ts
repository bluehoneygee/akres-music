import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export const proxy = auth;

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/attendance/:path*",
    "/billing/:path*",
    "/courses/:path*",
    "/guardians/:path*",
    "/instructor-availability/:path*",
    "/instructor-calendar/:path*",
    "/instructor-spotlight/:path*",
    "/instructors/:path*",
    "/instruments/:path*",
    "/journals/:path*",
    "/lesson-packages/:path*",
    "/notifications/:path*",
    "/programs/:path*",
    "/repertoires/:path*",
    "/reports/:path*",
    "/showcase/:path*",
    "/student-calendar/:path*",
    "/students/:path*",
    "/studio-rooms/:path*",
    "/users/:path*",
    "/portal/:path*",
  ],
};
