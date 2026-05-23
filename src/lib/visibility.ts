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
    if (resource === "lesson-packages") {
      return records.filter((row) => row.instructorId === instructorId);
    }
    if (resource === "instructor-availability") {
      return records.filter((row) => row.instructorId === instructorId);
    }
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
    return filterStudentScoped(resource, records, studentIds, db);
  }

  if (role === "Parent Portal User") {
    const guardianId = String(user.guardianId ?? "");
    const students = await db
      .collection("students")
      .find({ guardianIds: guardianId })
      .project({ id: 1 })
      .toArray();
    const studentIds = new Set(students.map((student) => student.id));
    const scoped = await filterStudentScoped(resource, records, studentIds, db);
    if (resource === "journals") {
      return scoped.filter((row) => row.confirmed === true);
    }
    if (resource !== "student-attendance") return scoped;

    return scoped.map((row) => {
      if (row.confirmed === true) return row;

      return {
        ...row,
        status: "Pending",
        absenceReason: "",
        makeupRequired: false,
        makeupScheduleId: "",
        pendingRescheduleDate: "",
        pendingRescheduleFromTime: "",
        pendingRescheduleToTime: "",
        pendingRescheduleStudioRoomId: "",
        confirmed: false,
        confirmedAt: "",
        confirmedBy: "",
        confirmedByName: "",
      };
    });
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

async function filterStudentScoped(
  resource: ResourceName,
  records: AnyRow[],
  studentIds: Set<unknown>,
  db: Awaited<ReturnType<typeof getMongoDb>>,
) {
  if (resource === "students") return records.filter((row) => studentIds.has(row.id));
  if (
    resource === "instruments" ||
    resource === "instructors" ||
    resource === "courses" ||
    resource === "repertoires"
  ) {
    return records;
  }
  if (resource === "journals") {
    return records.filter((row) => studentIds.has(row.studentId) && row.parentVisible === true);
  }
  if (["lesson-packages", "schedules", "student-attendance", "invoices"].includes(resource)) {
    return records.filter((row) => studentIds.has(row.studentId));
  }
  if (resource === "guardians") {
    const students = await db
      .collection("students")
      .find({ id: { $in: [...studentIds].map(String) } })
      .project({ guardianIds: 1 })
      .toArray();
    const guardianIds = new Set(
      students
        .flatMap((student) => (Array.isArray(student.guardianIds) ? student.guardianIds : []))
        .map(String)
        .filter(Boolean),
    );
    return records.filter((row) => guardianIds.has(String(row.id ?? "")));
  }
  if (["instruments", "courses", "instructors", "rooms"].includes(resource)) {
    const schedules = await db
      .collection("schedules")
      .find({ studentId: { $in: [...studentIds].map(String) } })
      .project({ courseId: 1, instructorId: 1, studioRoomId: 1, instrumentId: 1 })
      .toArray();

    if (resource === "instruments") {
      const ids = new Set(schedules.map((row) => row.instrumentId).filter(Boolean));
      return records.filter((row) => ids.has(row.id));
    }
    if (resource === "courses") {
      const ids = new Set(schedules.map((row) => row.courseId).filter(Boolean));
      return records.filter((row) => ids.has(row.id));
    }
    if (resource === "instructors") {
      const ids = new Set(schedules.map((row) => row.instructorId).filter(Boolean));
      return records.filter((row) => ids.has(row.id));
    }
    const ids = new Set(schedules.map((row) => row.studioRoomId).filter(Boolean));
    return records.filter((row) => ids.has(row.id));
  }
  return [];
}
