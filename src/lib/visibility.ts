import type { Session } from "next-auth";
import type { Document, Filter } from "mongodb";

import type { ResourceName } from "@/lib/models";
import { getMongoDb } from "@/lib/mongodb";
import { sessionRole } from "@/lib/session";

type AnyRow = Record<string, unknown>;
type VisibilityScope = {
  email: string;
  guardianIds: Set<string>;
  instructorId: string;
  role: string;
  roomIds: Set<string>;
  scheduleIds: Set<string>;
  studentIds: Set<string>;
  user: AnyRow | null;
};

const VISIBILITY_SCOPE_CACHE_MS = 60_000;
const visibilityScopeCache = new Map<string, { expiresAt: number; scope: VisibilityScope }>();

async function getVisibilityScope(session: Session): Promise<VisibilityScope> {
  const role = sessionRole(session) ?? "";
  const email = String(session.user?.email ?? "").toLowerCase();
  const cacheKey = `${role}:${email}`;
  const cached = visibilityScopeCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) return cached.scope;

  if (role === "System Manager" || role === "Academic Staff") {
    const scope = {
      email,
      guardianIds: new Set<string>(),
      instructorId: "",
      role,
      roomIds: new Set<string>(),
      scheduleIds: new Set<string>(),
      studentIds: new Set<string>(),
      user: null,
    };
    visibilityScopeCache.set(cacheKey, {
      expiresAt: Date.now() + VISIBILITY_SCOPE_CACHE_MS,
      scope,
    });
    return scope;
  }

  const db = await getMongoDb();
  const user = email ? await db.collection("users").findOne<AnyRow>({ email }) : null;
  const instructorId = String(user?.instructorId ?? "");
  let studentIds = new Set<string>();
  let scheduleIds = new Set<string>();
  let guardianIds = new Set<string>();
  let roomIds = new Set<string>();

  if (role === "Music Instructor" && instructorId) {
    const schedules = await db
      .collection("schedules")
      .find({ instructorId })
      .project({ id: 1, studentId: 1 })
      .toArray();

    studentIds = new Set(schedules.map((schedule) => String(schedule.studentId ?? "")).filter(Boolean));
    scheduleIds = new Set(schedules.map((schedule) => String(schedule.id ?? "")).filter(Boolean));
  }

  if (role === "Student Portal User") {
    studentIds = new Set([String(user?.studentId ?? "")].filter(Boolean));
  }

  if (role === "Parent Portal User") {
    const guardianId = String(user?.guardianId ?? "");
    const students = guardianId
      ? await db
          .collection("students")
          .find({ guardianIds: guardianId })
          .project({ id: 1, guardianIds: 1 })
          .toArray()
      : [];

    studentIds = new Set(students.map((student) => String(student.id ?? "")).filter(Boolean));
    guardianIds = new Set(
      students
        .flatMap((student) => (Array.isArray(student.guardianIds) ? student.guardianIds : []))
        .map(String)
        .filter(Boolean),
    );
  }

  if ((role === "Student Portal User" || role === "Parent Portal User") && studentIds.size > 0) {
    const schedules = await db
      .collection("schedules")
      .find({ studentId: { $in: [...studentIds] } })
      .project({ studioRoomId: 1 })
      .toArray();

    roomIds = new Set(schedules.map((schedule) => String(schedule.studioRoomId ?? "")).filter(Boolean));
  }

  const scope = {
    email,
    guardianIds,
    instructorId,
    role,
    roomIds,
    scheduleIds,
    studentIds,
    user,
  };
  visibilityScopeCache.set(cacheKey, {
    expiresAt: Date.now() + VISIBILITY_SCOPE_CACHE_MS,
    scope,
  });

  return scope;
}

export async function mongoScopeFilterForSession(
  resource: ResourceName,
  session: Session,
): Promise<Filter<Document>> {
  const scope = await getVisibilityScope(session);
  const role = scope.role;

  if (role === "System Manager" || role === "Academic Staff") return {};

  if (!scope.user) return { id: "__no_access__" };

  if (role === "Music Instructor") {
    const instructorId = scope.instructorId;
    if (!instructorId) return { id: "__no_access__" };

    if (resource === "students" || resource === "student-attendance") {
      if (resource === "students") {
        return { id: { $in: [...scope.studentIds] } };
      }
      return { courseScheduleId: { $in: [...scope.scheduleIds] } };
    }

    if (resource === "instructors") return { id: instructorId };
    if (
      resource === "lesson-packages" ||
      resource === "instructor-availability" ||
      resource === "schedules" ||
      resource === "instructor-attendance" ||
      resource === "journals"
    ) {
      return { instructorId };
    }
    if (resource === "notifications") return { targetRole: "Music Instructor" };
    return {};
  }

  if (role === "Student Portal User" || role === "Parent Portal User") {
    const studentIds = [...scope.studentIds];

    if (studentIds.length === 0) return { id: "__no_access__" };

    if (resource === "students") return { id: { $in: studentIds } };
    if (resource === "notifications") {
      return {
        studentId: { $in: studentIds },
        targetRole: role,
      };
    }
    if (resource === "journals") {
      return { studentId: { $in: studentIds }, parentVisible: true };
    }
    if (["lesson-packages", "schedules", "student-attendance", "invoices"].includes(resource)) {
      return { studentId: { $in: studentIds } };
    }
    if (resource === "guardians") {
      return { id: { $in: [...scope.guardianIds] } };
    }
    if (resource === "rooms") {
      return { id: { $in: [...scope.roomIds] } };
    }
    return {};
  }

  return { id: "__no_access__" };
}

export async function filterRecordsForSession(
  resource: ResourceName,
  records: AnyRow[],
  session: Session,
) {
  const scope = await getVisibilityScope(session);
  const role = scope.role;

  if (role === "System Manager" || role === "Academic Staff") {
    return records;
  }

  const db = await getMongoDb();
  if (!scope.user) return [];

  if (role === "Music Instructor") {
    const instructorId = scope.instructorId;
    const scheduleIds = scope.scheduleIds;
    const studentIds = scope.studentIds;

    if (resource === "students") return records.filter((row) => studentIds.has(String(row.id ?? "")));
    if (resource === "instructors") {
      return records.filter((row) => String(row.id ?? "") === instructorId);
    }
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
      return records.filter((row) => scheduleIds.has(String(row.courseScheduleId ?? "")));
    }
    if (resource === "journals") return records.filter((row) => row.instructorId === instructorId);
    if (resource === "notifications") {
      return records.filter((row) => String(row.targetRole ?? "") === "Music Instructor");
    }

    return records;
  }

  if (role === "Student Portal User") {
    return filterStudentScoped(resource, records, scope.studentIds, db, scope);
  }

  if (role === "Parent Portal User") {
    if (resource === "notifications") {
      return records.filter(
        (row) =>
          scope.studentIds.has(String(row.studentId ?? "")) &&
          String(row.targetRole ?? "") === "Parent Portal User",
      );
    }
    const scoped = await filterStudentScoped(resource, records, scope.studentIds, db, scope);
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
  studentIds: Set<string>,
  db: Awaited<ReturnType<typeof getMongoDb>>,
  scope?: VisibilityScope,
) {
  if (resource === "students") return records.filter((row) => studentIds.has(String(row.id ?? "")));
  if (resource === "notifications") {
    return records.filter(
      (row) =>
        studentIds.has(String(row.studentId ?? "")) &&
        String(row.targetRole ?? "") === "Student Portal User",
    );
  }
  if (
    resource === "instruments" ||
    resource === "instructors" ||
    resource === "courses" ||
    resource === "repertoires"
  ) {
    return records;
  }
  if (resource === "journals") {
    return records.filter((row) => studentIds.has(String(row.studentId ?? "")) && row.parentVisible === true);
  }
  if (["lesson-packages", "schedules", "student-attendance", "invoices"].includes(resource)) {
    return records.filter((row) => studentIds.has(String(row.studentId ?? "")));
  }
  if (resource === "guardians") {
    if (scope?.guardianIds.size) {
      return records.filter((row) => scope.guardianIds.has(String(row.id ?? "")));
    }

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
  if (resource === "rooms") {
    if (scope?.roomIds.size) {
      return records.filter((row) => scope.roomIds.has(String(row.id ?? "")));
    }

    const schedules = await db
      .collection("schedules")
      .find({ studentId: { $in: [...studentIds].map(String) } })
      .project({ courseId: 1, instructorId: 1, studioRoomId: 1, instrumentId: 1 })
      .toArray();
    const ids = new Set(schedules.map((row) => row.studioRoomId).filter(Boolean));
    return records.filter((row) => ids.has(String(row.id ?? "")));
  }
  return [];
}
