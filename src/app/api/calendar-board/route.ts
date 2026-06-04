import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { listScopedRecordsProjected } from "@/lib/scoped-records";
import { canAccessResource } from "@/lib/roles";
import { sessionRole } from "@/lib/session";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = sessionRole(session) ?? "";
  const board = request.nextUrl.searchParams.get("board") ?? "";
  const month = request.nextUrl.searchParams.get("month") ?? "";
  const view = request.nextUrl.searchParams.get("view") ?? "month";
  const scheduleFilter = view === "month" && month ? scheduleDateMonthFilter(month) : {};

  if (board === "student-calendar") {
    if (!canAccessResource({ role, resource: "schedules", action: "read" })) {
      return NextResponse.json({ error: "You do not have access to calendar" }, { status: 403 });
    }

    const [schedules, students, courses, instructors, rooms] = await Promise.all([
      listScopedRecordsProjected(
        "schedules",
        [
          "studentId",
          "courseId",
          "instructorId",
          "studioRoomId",
          "lessonMode",
          "homeVisitAddress",
          "scheduleStatus",
          "scheduleDate",
          "scheduleMonth",
          "fromTime",
          "toTime",
          "originalScheduleId",
        ],
        session,
        { filter: scheduleFilter, sort: { scheduleDate: 1, fromTime: 1 } },
      ),
      listScopedRecordsProjected("students", ["studentName", "firstName", "lastName", "name"], session),
      listScopedRecordsProjected("courses", ["courseName"], session),
      listScopedRecordsProjected("instructors", ["instructorName"], session),
      listScopedRecordsProjected("rooms", ["roomName"], session),
    ]);

    return NextResponse.json({ data: { courses, instructors, role, rooms, schedules, students } });
  }

  if (board === "studio-room") {
    if (!canAccessResource({ role, resource: "rooms", action: "read" })) {
      return NextResponse.json({ error: "You do not have access to studio rooms" }, { status: 403 });
    }

    const [rooms, schedules, students, courses, instructors] = await Promise.all([
      listScopedRecordsProjected("rooms", ["roomName", "isActive"], session),
      listScopedRecordsProjected(
        "schedules",
        [
          "studentId",
          "courseId",
          "instructorId",
          "studioRoomId",
          "lessonMode",
          "scheduleStatus",
          "scheduleDate",
          "fromTime",
          "toTime",
          "originalScheduleId",
        ],
        session,
        { filter: scheduleFilter, sort: { scheduleDate: 1, fromTime: 1 } },
      ),
      listScopedRecordsProjected("students", ["firstName", "lastName"], session),
      listScopedRecordsProjected("courses", ["courseName"], session),
      listScopedRecordsProjected("instructors", ["instructorName"], session),
    ]);

    return NextResponse.json({ data: { courses, instructors, role, rooms, schedules, students } });
  }

  if (board === "instructor-availability") {
    if (!canAccessResource({ role, resource: "instructor-availability", action: "read" })) {
      return NextResponse.json({ error: "You do not have access to availability" }, { status: 403 });
    }

    const [instructors, availability, schedules, students, courses] = await Promise.all([
      listScopedRecordsProjected("instructors", ["instructorName"], session),
      listScopedRecordsProjected(
        "instructor-availability",
        ["instructorId", "dayOfWeek", "fromTime", "toTime", "lessonMode", "active"],
        session,
      ),
      listScopedRecordsProjected(
        "schedules",
        [
          "studentId",
          "courseId",
          "instructorId",
          "scheduleDate",
          "scheduleMonth",
          "fromTime",
          "toTime",
          "lessonMode",
          "scheduleStatus",
          "originalScheduleId",
        ],
        session,
        { filter: scheduleFilter, sort: { scheduleDate: 1, fromTime: 1 } },
      ),
      listScopedRecordsProjected("students", ["firstName", "lastName"], session),
      listScopedRecordsProjected("courses", ["courseName"], session),
    ]);

    return NextResponse.json({ data: { availability, courses, instructors, role, schedules, students } });
  }

  return NextResponse.json({ error: "Unknown calendar board" }, { status: 404 });
}

function scheduleDateMonthFilter(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return {};

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1));

  return {
    scheduleDate: {
      $gte: start.toISOString().slice(0, 10),
      $lt: end.toISOString().slice(0, 10),
    },
  };
}
