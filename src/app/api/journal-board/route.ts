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
  if (!canAccessResource({ role, resource: "journals", action: "read" })) {
    return NextResponse.json({ error: "You do not have access to journals" }, { status: 403 });
  }

  const isPortal = role === "Parent Portal User" || role === "Student Portal User";
  const [attendance, schedules, students, instructors, instruments, repertoires, journals] = await Promise.all([
    listScopedRecordsProjected(
      "student-attendance",
      ["courseScheduleId", "studentId", "instrumentId", "status", "confirmed", "confirmedAt", "date"],
      session,
      {
        filter: isPortal ? { status: "Present", confirmed: true } : {},
        sort: { date: -1, createdAt: -1 },
      },
    ),
    listScopedRecordsProjected(
      "schedules",
      ["studentId", "instructorId", "instrumentId", "scheduleDate", "fromTime", "toTime"],
      session,
    ),
    listScopedRecordsProjected("students", ["firstName", "lastName"], session),
    listScopedRecordsProjected("instructors", ["instructorName"], session),
    listScopedRecordsProjected("instruments", ["instrumentName"], session),
    listScopedRecordsProjected("repertoires", ["title", "composer", "level", "instrumentId", "isActive"], session),
    listScopedRecordsProjected(
      "journals",
      [
        "attendanceId",
        "studentId",
        "instructorId",
        "materialCovered",
        "techniqueFocus",
        "repertoireIds",
        "homework",
        "teacherNotes",
        "progressRating",
        "parentVisible",
        "confirmed",
        "confirmedAt",
        "confirmedByName",
      ],
      session,
      {
        filter: isPortal ? { confirmed: true } : {},
        sort: { lessonDate: -1, createdAt: -1 },
      },
    ),
  ]);

  return NextResponse.json({
    attendance,
    instructors,
    instruments,
    journals,
    repertoires,
    role,
    schedules,
    students,
  });
}
