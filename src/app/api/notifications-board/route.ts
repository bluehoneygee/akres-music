import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { listScopedRecordsProjected } from "@/lib/scoped-records";
import { canAccessResource } from "@/lib/roles";
import { sessionRole } from "@/lib/session";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = sessionRole(session) ?? "";
  if (!canAccessResource({ role, resource: "notifications", action: "read" })) {
    return NextResponse.json({ error: "You do not have access to notifications" }, { status: 403 });
  }

  const [notifications, students] = await Promise.all([
    listScopedRecordsProjected(
      "notifications",
      ["type", "targetRole", "studentId", "message", "sentAt", "createdAt", "readByUserIds"],
      session,
      { sort: { sentAt: -1, createdAt: -1 }, limit: 100 },
    ),
    listScopedRecordsProjected("students", ["firstName", "lastName"], session),
  ]);

  return NextResponse.json({
    notifications,
    students,
    userId: String(session.user.id ?? ""),
  });
}
