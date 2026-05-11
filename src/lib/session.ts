import type { Session } from "next-auth";

export function sessionRole(session: Session) {
  return (session.user as Session["user"] & { role?: string }).role;
}
