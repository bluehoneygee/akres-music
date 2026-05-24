export { auth as proxy } from "@/auth";

export const config = {
  matcher: ["/((?!api|login|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|gif|svg|ico|css|js|map|txt|xml)).*)"],
};
