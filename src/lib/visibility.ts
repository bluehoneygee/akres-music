import type { Session } from "next-auth";

import type { ResourceName } from "@/lib/models";
import { getMongoDb } from "@/lib/mongodb";
import { sessionRole } from "@/lib/session";

type AnyRow = Record<string, unknown>;

export async function filterRecordsForSession(
  resource: ResourceName,
  records: AnyRow[],
  session: Session,
) {
  const role = sessionRole(session);

  if (role === "System Manager" || role === "Academic Staff") {
    return records;
  }

  const db = await getMongoDb();
  const email = session.user?.email?.toLowerCase();
  const user = email ? await db.collection("users").findOne<AnyRow>({ email }) : null;

  if (!user) return [];

  if (role === "Music Instructor") {
    const instructorId = String(user.instructorId ?? "");
    const schedules = await db
      .collection("schedules")
      .find({ instructorId })
      .project({ id: 1, studentId: 1 })
      .toArray();
    const scheduleIds = new Set(schedules.map((schedule) => schedule.id));
    const studentIds = new Set(schedules.map((schedule) => schedule.studentId));

    if (resource === "students") return records.filter((row) => studentIds.has(row.id));
    if (resource === "schedules") return records.filter((row) => row.instructorId === instructorId);
    if (resource === "instructor-attendance") {
      return records.filter((row) => row.instructorId === instructorId);
    }
    if (resource === "student-attendance") {
      return records.filter((row) => scheduleIds.has(row.courseScheduleId));
    }
    if (resource === "journals") return records.filter((row) => row.instructorId === instructorId);

    return records;
  }

  if (role === "Student Portal User") {
    const studentIds = new Set([String(user.studentId ?? "")].filter(Boolean));
    return filterStudentScoped(resource, records, studentIds);
  }

  if (role === "Parent Portal User") {
    const guardianId = String(user.guardianId ?? "");
    const students = await db
      .collection("students")
      .find({ guardianIds: guardianId })
      .project({ id: 1 })
      .toArray();
    const studentIds = new Set(students.map((student) => student.id));
    return filterStudentScoped(resource, records, studentIds);
  }

  return [];
}

export async function filterTypedRecordsForSession<T extends AnyRow>(
  resource: ResourceName,
  records: T[],
  session: Session,
) {
  return (await filterRecordsForSession(resource, records, session)) as T[];
}

function filterStudentScoped(resource: ResourceName, records: AnyRow[], studentIds: Set<unknown>) {
  if (resource === "students") return records.filter((row) => studentIds.has(row.id));
  if (resource === "journals") {
    return records.filter((row) => studentIds.has(row.studentId) && row.parentVisible === true);
  }
  if (["schedules", "student-attendance", "invoices"].includes(resource)) {
    return records.filter((row) => studentIds.has(row.studentId));
  }
  return [];
}
