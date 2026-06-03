import { NextRequest, NextResponse } from "next/server";
import type { Document, Filter } from "mongodb";

import { auth } from "@/auth";
import { isResourceName, listRecordsProjected } from "@/lib/db";
import type { ResourceName } from "@/lib/models";
import { canAccessResource } from "@/lib/roles";
import { sessionRole } from "@/lib/session";
import { filterRecordsForSession, mongoScopeFilterForSession } from "@/lib/visibility";

const attendanceBoardResources = [
  {
    key: "lessonPackages",
    resource: "lesson-packages",
    fields: [
      "studentId",
      "courseId",
      "instructorId",
      "instrumentId",
      "lessonCount",
      "billingPeriod",
      "lessonStartDate",
      "lessonDays",
      "fromTime",
      "toTime",
      "lessonMode",
      "studioRoomId",
      "homeVisitAddress",
      "status",
    ],
    monthFilter: (month: string) => (month ? { billingPeriod: month } : {}),
  },
  { key: "students", resource: "students", fields: ["firstName", "lastName"] },
  { key: "courses", resource: "courses", fields: ["courseName", "durationMinutes"] },
  { key: "instructors", resource: "instructors", fields: ["instructorName"] },
  {
    key: "instructorAvailability",
    resource: "instructor-availability",
    fields: ["instructorId", "dayOfWeek", "fromTime", "toTime", "lessonMode", "active"],
  },
  { key: "studioRooms", resource: "rooms", fields: ["roomName", "isActive"] },
  {
    key: "schedules",
    resource: "schedules",
    fields: [
      "lessonPackageId",
      "courseId",
      "studentId",
      "instructorId",
      "instrumentId",
      "scheduleDate",
      "fromTime",
      "toTime",
      "lessonMode",
      "studioRoomId",
      "homeVisitAddress",
      "travelNotes",
      "privateLesson",
      "scheduleMonth",
      "lessonStartDate",
      "lessonDays",
      "lessonCount",
      "scheduleStatus",
      "originalScheduleId",
      "rescheduleReason",
    ],
    monthFilter: (month: string) => (month ? { scheduleMonth: month } : {}),
  },
  {
    key: "attendance",
    resource: "student-attendance",
    fields: [
      "lessonPackageId",
      "studentId",
      "courseScheduleId",
      "instrumentId",
      "date",
      "status",
      "absenceReason",
      "makeupRequired",
      "makeupScheduleId",
      "pendingRescheduleDate",
      "pendingRescheduleFromTime",
      "pendingRescheduleToTime",
      "pendingRescheduleStudioRoomId",
      "parentNotified",
      "confirmed",
      "confirmedByUserId",
      "confirmedByName",
      "confirmedAt",
      "notes",
    ],
    monthFilter: (month: string) => (month ? { date: { $regex: `^${escapeRegex(month)}` } } : {}),
  },
  {
    key: "instructorAttendance",
    resource: "instructor-attendance",
    fields: [
      "lessonPackageId",
      "instructorId",
      "courseScheduleId",
      "attendanceDate",
      "instrumentId",
      "status",
      "substituteInstructorId",
      "rescheduleRequired",
      "rescheduleScheduleId",
      "pendingRescheduleDate",
      "pendingRescheduleFromTime",
      "pendingRescheduleToTime",
      "pendingRescheduleStudioRoomId",
      "confirmed",
      "confirmedByUserId",
      "confirmedByName",
      "confirmedAt",
      "notes",
    ],
    monthFilter: (month: string) => (month ? { attendanceDate: { $regex: `^${escapeRegex(month)}` } } : {}),
  },
] as const;

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = sessionRole(session) ?? "";
  const month = request.nextUrl.searchParams.get("month") ?? "";
  const entries = await Promise.all(
    attendanceBoardResources.map(async (entry) => {
      const resource = entry.resource;
      if (!isResourceName(resource)) return [entry.key, []] as const;
      if (!canAccessResource({ role, resource, action: "read" })) return [entry.key, []] as const;

      const scopeFilter = await mongoScopeFilterForSession(resource, session);
      const monthFilter = "monthFilter" in entry ? entry.monthFilter(month) : {};
      const filter = mergeMongoFilters(scopeFilter, monthFilter);
      const records = await listRecordsProjected(resource, [...entry.fields], filter);
      const data = await filterRecordsForSession(resource, records, session);
      return [entry.key, data] as const;
    }),
  );

  return NextResponse.json({ data: { ...Object.fromEntries(entries), role } });
}

function mergeMongoFilters(...filters: Array<Filter<Document>>) {
  const activeFilters = filters.filter((filter) => Object.keys(filter).length > 0);
  if (activeFilters.length === 0) return {};
  if (activeFilters.length === 1) return activeFilters[0];
  return { $and: activeFilters };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
