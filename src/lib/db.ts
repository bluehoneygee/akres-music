import bcrypt from "bcryptjs";
import type { Collection, Document, Filter } from "mongodb";

import type { AnyRecord, Database, ResourceName } from "@/lib/models";
import { getMongoDb } from "@/lib/mongodb";

export const resources: ResourceName[] = [
  "instruments",
  "students",
  "guardians",
  "instructors",
  "courses",
  "rooms",
  "schedules",
  "student-attendance",
  "instructor-attendance",
  "journals",
  "repertoires",
  "invoices",
  "notifications",
];

export function isResourceName(value: string): value is ResourceName {
  return resources.includes(value as ResourceName);
}

async function collection(resource: ResourceName): Promise<Collection<Document>> {
  const db = await getMongoDb();
  await ensureSeedData();
  return db.collection(resource);
}

let seedPromise: Promise<void> | null = null;

export async function ensureSeedData() {
  if (!seedPromise) {
    seedPromise = seed();
  }

  await seedPromise;
}

async function seed() {
  const db = await getMongoDb();
  const marker = db.collection("_meta");

  await ensureDefaultUsers();

  await marker.updateOne(
    { key: "seeded" },
    { $set: { value: true, seededAt: new Date() } },
    { upsert: true },
  );
}

async function ensureDefaultUsers() {
  const db = await getMongoDb();
  const passwordHash = await bcrypt.hash("admin123", 12);
  const users = [
    {
      email: "admin@akres.test",
      emailVerified: null,
      name: "Administrator Akres",
      role: "System Manager",
      passwordHash,
    },
  ];

  await Promise.all(
    users.map((user) => {
      const { name, role, ...insertOnly } = user;

      return db.collection("users").updateOne(
        { email: user.email },
        {
          $setOnInsert: {
            ...insertOnly,
            createdAt: new Date().toISOString(),
          },
          $set: {
            name,
            role,
            updatedAt: new Date().toISOString(),
          },
        },
        { upsert: true },
      );
    }),
  );
}

function fromMongo<T extends Document>(record: T): Omit<T, "_id"> & { id: string } {
  const { _id, ...rest } = record;
  return {
    id: String("id" in rest ? rest.id : _id),
    ...rest,
  } as Omit<T, "_id"> & { id: string };
}

export async function readDatabase(): Promise<Database> {
  await ensureSeedData();
  const db = await getMongoDb();
  const entries = await Promise.all(
    resources.map(async (resource) => {
      const records = await db.collection(resource).find({}).sort({ createdAt: -1 }).toArray();
      return [resource, records.map(fromMongo)] as const;
    }),
  );

  return Object.fromEntries(entries) as Database;
}

export async function listRecords(resource: ResourceName) {
  const records = await (await collection(resource)).find({}).sort({ createdAt: -1 }).toArray();
  return records.map(fromMongo);
}

export async function createRecord(resource: ResourceName, payload: Record<string, unknown>) {
  const now = new Date().toISOString();

  if (resource === "schedules") {
    const scheduleRecords = buildScheduleRecords(payload, now);
    const records = await collection(resource);
    await records.insertMany(scheduleRecords as Document[]);
    await ensureAttendanceForSchedules(scheduleRecords, now);
    return fromMongo(scheduleRecords[0] as Document);
  }

  if (resource === "students") {
    return createStudentWithOptionalSchedule(payload, now);
  }

  const id = String(payload.id || `${resource}-${crypto.randomUUID()}`);
  const record = {
    _id: id,
    ...payload,
    ...(resource === "courses" ? { lessonType: "Private" } : {}),
    id,
    createdAt: now,
    updatedAt: now,
  };

  await (await collection(resource)).insertOne(record as Document);
  return fromMongo(record);
}

async function createStudentWithOptionalSchedule(
  payload: Record<string, unknown>,
  now: string,
) {
  const id = String(payload.id || `students-${crypto.randomUUID()}`);
  const studentPayload = { ...payload };
  const schedulePayload = pickStudentSchedulePayload(studentPayload, id);

  for (const key of studentSchedulePayloadKeys) {
    delete studentPayload[key];
  }

  const record = {
    _id: id,
    ...studentPayload,
    id,
    createdAt: now,
    updatedAt: now,
  };

  await (await collection("students")).insertOne(record as Document);

  if (schedulePayload) {
    const scheduleRecords = buildScheduleRecords(schedulePayload, now);
    const db = await getMongoDb();
    await db.collection("schedules").insertMany(scheduleRecords as Document[]);
    await ensureAttendanceForSchedules(scheduleRecords, now);
  }

  return fromMongo(record as Document);
}

const studentSchedulePayloadKeys = [
  "onboardingCourseId",
  "onboardingInstructorId",
  "scheduleMonth",
  "lessonDays",
  "lessonCount",
  "fromTime",
  "toTime",
  "studioRoomId",
  "homeVisitAddress",
  "travelNotes",
];

function pickStudentSchedulePayload(payload: Record<string, unknown>, studentId: string) {
  const courseId = String(payload.onboardingCourseId || "");
  const instructorId = String(payload.onboardingInstructorId || "");
  const scheduleMonth = String(payload.scheduleMonth || "");
  const fromTime = String(payload.fromTime || "");
  const toTime = String(payload.toTime || "");

  if (!courseId || !instructorId || !scheduleMonth || !fromTime || !toTime) {
    return null;
  }

  return {
    courseId,
    studentId,
    instructorId,
    instrumentId: String(payload.primaryInstrumentId || ""),
    scheduleMonth,
    lessonDays: payload.lessonDays,
    lessonCount: payload.lessonCount || 4,
    fromTime,
    toTime,
    lessonMode: String(payload.preferredLessonMode || "Studio"),
    studioRoomId: String(payload.studioRoomId || ""),
    homeVisitAddress: String(payload.homeVisitAddress || ""),
    travelNotes: String(payload.travelNotes || ""),
    scheduleStatus: "Scheduled",
    originalScheduleId: "",
    rescheduleReason: "",
  };
}

function buildScheduleRecords(payload: Record<string, unknown>, now: string) {
  const scheduleMonth = String(payload.scheduleMonth || "");
  const lessonDays = toStringArray(payload.lessonDays);
  const lessonCount = Number(payload.lessonCount || 4);
  const singleDate = String(payload.scheduleDate || "");
  const monthlyDates =
    scheduleMonth && lessonDays.length > 0
      ? expandMonthlyLessonDates(scheduleMonth, lessonDays, lessonCount)
      : [];
  const dates = monthlyDates.length > 0 ? monthlyDates : [singleDate];
  const baseId = String(payload.id || `schedules-${crypto.randomUUID()}`);

  return dates.map((scheduleDate, index) => {
    const id = index === 0 ? baseId : `${baseId}-${index + 1}`;

    return {
      _id: id,
      ...payload,
      id,
      scheduleDate,
      scheduleMonth,
      lessonDays,
      lessonCount,
      privateLesson: true,
      scheduleStatus: String(payload.scheduleStatus || "Scheduled"),
      originalScheduleId: String(payload.originalScheduleId || ""),
      rescheduleReason: String(payload.rescheduleReason || ""),
      createdAt: now,
      updatedAt: now,
    };
  });
}

async function ensureAttendanceForSchedules(
  schedules: Record<string, unknown>[],
  now: string,
) {
  const db = await getMongoDb();

  await Promise.all(
    schedules.flatMap((schedule) => {
      const scheduleId = String(schedule.id || "");
      const studentAttendanceId = `student-attendance-${scheduleId}`;
      const instructorAttendanceId = `instructor-attendance-${scheduleId}`;

      return [
        db.collection("student-attendance").updateOne(
          { _id: studentAttendanceId } as unknown as Filter<Document>,
          {
            $setOnInsert: {
              _id: studentAttendanceId,
              id: studentAttendanceId,
              studentId: String(schedule.studentId || ""),
              courseScheduleId: scheduleId,
              instrumentId: String(schedule.instrumentId || ""),
              date: String(schedule.scheduleDate || ""),
              status: "Pending",
              absenceReason: "",
              makeupRequired: false,
              makeupScheduleId: "",
              parentNotified: false,
              absenceAlertKey: "",
              createdAt: now,
              updatedAt: now,
            },
          },
          { upsert: true },
        ),
        db.collection("instructor-attendance").updateOne(
          { _id: instructorAttendanceId } as unknown as Filter<Document>,
          {
            $setOnInsert: {
              _id: instructorAttendanceId,
              id: instructorAttendanceId,
              instructorId: String(schedule.instructorId || ""),
              courseScheduleId: scheduleId,
              attendanceDate: String(schedule.scheduleDate || ""),
              instrumentId: String(schedule.instrumentId || ""),
              status: "Pending",
              substituteInstructorId: "",
              notes: "",
              createdAt: now,
              updatedAt: now,
            },
          },
          { upsert: true },
        ),
      ];
    }),
  );
}

function toStringArray(value: unknown) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function expandMonthlyLessonDates(
  scheduleMonth: string,
  lessonDays: string[],
  lessonCount: number,
) {
  if (!/^\d{4}-\d{2}$/.test(scheduleMonth)) return [];

  const [year, month] = scheduleMonth.split("-").map(Number);
  const selectedDays = new Set(lessonDays.map(Number));
  const maxDates = Number.isFinite(lessonCount) && lessonCount > 0 ? lessonCount : 4;
  const dates: string[] = [];

  for (let day = 1; day <= 31; day += 1) {
    const current = new Date(Date.UTC(year, month - 1, day));

    if (current.getUTCMonth() !== month - 1) {
      break;
    }

    if (selectedDays.has(current.getUTCDay())) {
      dates.push(formatDate(current));

      if (dates.length >= maxDates) {
        break;
      }
    }
  }

  return dates;
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export async function updateRecord(
  resource: ResourceName,
  id: string,
  payload: Record<string, unknown>,
) {
  const records = await collection(resource);
  const updatedAt = new Date().toISOString();
  const result = await records.findOneAndUpdate(
    { id },
    { $set: { ...payload, id, updatedAt } },
    { returnDocument: "after" },
  );

  if (result) {
    await syncScheduleStatusFromAttendance(resource, result, updatedAt);
  }

  return result ? (fromMongo(result) as AnyRecord) : null;
}

async function syncScheduleStatusFromAttendance(
  resource: ResourceName,
  attendance: Document,
  updatedAt: string,
) {
  if (resource !== "student-attendance" && resource !== "instructor-attendance") return;

  const scheduleId = String(attendance.courseScheduleId || "");
  const attendanceStatus = String(attendance.status || "");
  let scheduleStatus = "";

  if (resource === "student-attendance") {
    if (attendanceStatus === "Present") scheduleStatus = "Completed";
    if (attendanceStatus === "Rescheduled") scheduleStatus = "Rescheduled";
  }

  if (resource === "instructor-attendance" && attendanceStatus === "Cancelled") {
    scheduleStatus = "Cancelled";
  }

  if (!scheduleId || !scheduleStatus) return;

  const db = await getMongoDb();
  await db.collection("schedules").updateOne(
    { id: scheduleId },
    {
      $set: {
        scheduleStatus,
        updatedAt,
      },
    },
  );
}

export async function deleteRecord(resource: ResourceName, id: string) {
  const result = await (await collection(resource)).deleteOne({ id });
  return result.deletedCount > 0;
}
