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
  if (!canAccessResource({ role, resource: "invoices", action: "read" })) {
    return NextResponse.json({ error: "You do not have access to billing" }, { status: 403 });
  }

  const [invoices, lessonPackages, students, courses, instruments] = await Promise.all([
    listScopedRecordsProjected(
      "invoices",
      [
        "lessonPackageId",
        "studentId",
        "courseId",
        "instrumentId",
        "lessonPackage",
        "billingPeriod",
        "amount",
        "status",
        "paidAt",
        "confirmed",
        "confirmedByName",
        "confirmedAt",
      ],
      session,
      { sort: { billingPeriod: -1, createdAt: -1 } },
    ),
    listScopedRecordsProjected("lesson-packages", ["studentId", "courseId", "instrumentId", "lessonCount"], session),
    listScopedRecordsProjected("students", ["firstName", "lastName"], session),
    listScopedRecordsProjected("courses", ["courseName"], session),
    listScopedRecordsProjected("instruments", ["instrumentName"], session),
  ]);

  return NextResponse.json({
    courses,
    instruments,
    invoices,
    lessonPackages,
    role,
    students,
  });
}
