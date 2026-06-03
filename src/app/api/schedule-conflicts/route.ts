import { NextRequest, NextResponse } from "next/server";
import type { Document, Filter } from "mongodb";

import { auth } from "@/auth";
import { ensureSeedData } from "@/lib/db";
import { getMongoDb } from "@/lib/mongodb";
import { canAccessResource } from "@/lib/roles";
import { sessionRole } from "@/lib/session";
import { filterRecordsForSession, mongoScopeFilterForSession } from "@/lib/visibility";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessResource({ role: sessionRole(session), resource: "schedules", action: "read" })) {
    return NextResponse.json({ error: "You do not have access to schedules" }, { status: 403 });
  }

  const studentId = request.nextUrl.searchParams.get("studentId") ?? "";
  const instructorId = request.nextUrl.searchParams.get("instructorId") ?? "";
  const roomId = request.nextUrl.searchParams.get("roomId") ?? "";
  const month = request.nextUrl.searchParams.get("month") ?? "";
  const fromTime = request.nextUrl.searchParams.get("fromTime") ?? "";
  const toTime = request.nextUrl.searchParams.get("toTime") ?? "";
  const orFilters: Filter<Document>[] = [];
  if (studentId) orFilters.push({ studentId });
  if (instructorId) orFilters.push({ instructorId });
  if (roomId) orFilters.push({ studioRoomId: roomId });

  if (!month && orFilters.length === 0) {
    return NextResponse.json({ data: [] });
  }

  await ensureSeedData();
  const db = await getMongoDb();
  const scopeFilter = await mongoScopeFilterForSession("schedules", session);
  const filters: Filter<Document>[] = [scopeFilter];
  if (month) filters.push({ scheduleDate: { $regex: `^${escapeRegex(month)}` } });
  if (orFilters.length > 0) filters.push({ $or: orFilters });

  const rows = await db
    .collection("schedules")
    .find(filters.length > 1 ? { $and: filters } : filters[0])
    .project({
      _id: 0,
      id: 1,
      scheduleDate: 1,
      scheduleStatus: 1,
      fromTime: 1,
      toTime: 1,
      studentId: 1,
      instructorId: 1,
      studioRoomId: 1,
      lessonMode: 1,
    })
    .sort({ scheduleDate: 1, fromTime: 1 })
    .toArray();
  const overlappingRows =
    fromTime && toTime
      ? rows.filter((row) =>
          rangesOverlap(
            fromTime,
            toTime,
            String(row.fromTime ?? ""),
            String(row.toTime ?? ""),
          ),
        )
      : rows;
  const data = await filterRecordsForSession("schedules", overlappingRows, session);

  return NextResponse.json({ data });
}

function rangesOverlap(startA: string, endA: string, startB: string, endB: string) {
  const startAMinutes = timeToMinutes(startA);
  const endAMinutes = timeToMinutes(endA);
  const startBMinutes = timeToMinutes(startB);
  const endBMinutes = timeToMinutes(endB);
  if ([startAMinutes, endAMinutes, startBMinutes, endBMinutes].some((value) => value < 0)) {
    return true;
  }
  return startAMinutes < endBMinutes && startBMinutes < endAMinutes;
}

function timeToMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return -1;
  return hour * 60 + minute;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
