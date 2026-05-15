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
  "lesson-packages",
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

  if (resource === "lesson-packages") {
    return createLessonPackageWithSchedules(payload, now);
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

async function createLessonPackageWithSchedules(
  payload: Record<string, unknown>,
  now: string,
) {
  const id = String(payload.id || `lesson-packages-${crypto.randomUUID()}`);
  const packagePayload = normalizeLessonPackagePayload(payload);

  const record = {
    _id: id,
    ...packagePayload,
    id,
    createdAt: now,
    updatedAt: now,
  };

  await (await collection("lesson-packages")).insertOne(record as Document);

  const scheduleRecords = buildScheduleRecords(pickLessonPackageSchedulePayload(record), now);
  const db = await getMongoDb();
  await db.collection("schedules").insertMany(scheduleRecords as Document[]);
  await ensureAttendanceForSchedules(scheduleRecords, now);

  return fromMongo(record as Document);
}

function normalizeLessonPackagePayload(payload: Record<string, unknown>) {
  const courseId = String(payload.courseId || "");
  const studentId = String(payload.studentId || "");
  const instructorId = String(payload.instructorId || "");
  const billingPeriod = String(payload.billingPeriod || payload.scheduleMonth || "");
  const lessonStartDate = String(payload.lessonStartDate || "");
  const lessonDays = toStringArray(payload.lessonDays);
  const fromTime = String(payload.fromTime || "");
  const toTime = String(payload.toTime || "");

  if (!courseId || !studentId || !instructorId || !billingPeriod || !lessonStartDate || !fromTime || !toTime || lessonDays.length === 0) {
    throw new Error("Lesson package needs student, course, instructor, billing period, start date, lesson days, and time.");
  }

  return {
    ...payload,
    courseId,
    studentId,
    instructorId,
    instrumentId: String(payload.instrumentId || payload.primaryInstrumentId || ""),
    billingPeriod,
    lessonStartDate,
    lessonDays,
    lessonCount: payload.lessonCount || 4,
    fromTime,
    toTime,
    lessonMode: String(payload.lessonMode || payload.preferredLessonMode || "Studio"),
    studioRoomId: String(payload.studioRoomId || ""),
    homeVisitAddress: String(payload.homeVisitAddress || ""),
    travelNotes: String(payload.travelNotes || ""),
    status: String(payload.status || "Active"),
  };
}

function pickLessonPackageSchedulePayload(payload: Record<string, unknown>) {
  const lessonPackageId = String(payload.id || "");
  const billingPeriod = String(payload.billingPeriod || "");

  return {
    id: `schedule-${lessonPackageId}`,
    lessonPackageId,
    courseId: String(payload.courseId || ""),
    studentId: String(payload.studentId || ""),
    instructorId: String(payload.instructorId || ""),
    instrumentId: String(payload.instrumentId || ""),
    scheduleMonth: billingPeriod,
    lessonStartDate: String(payload.lessonStartDate || ""),
    lessonDays: payload.lessonDays,
    lessonCount: payload.lessonCount || 4,
    fromTime: String(payload.fromTime || ""),
    toTime: String(payload.toTime || ""),
    lessonMode: String(payload.lessonMode || "Studio"),
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
  const lessonStartDate = String(payload.lessonStartDate || "");
  const lessonDays = toStringArray(payload.lessonDays);
  const lessonCount = Number(payload.lessonCount || 4);
  const singleDate = String(payload.scheduleDate || "");
  const packageDates =
    (lessonStartDate || scheduleMonth) && lessonDays.length > 0
      ? expandPackageLessonDates(lessonStartDate || `${scheduleMonth}-01`, lessonDays, lessonCount)
      : [];
  const dates = packageDates.length > 0 ? packageDates : [singleDate];
  const baseId = String(payload.id || `schedules-${crypto.randomUUID()}`);

  return dates.map((scheduleDate, index) => {
    const id = index === 0 ? baseId : `${baseId}-${index + 1}`;

    return {
      _id: id,
      ...payload,
      id,
      scheduleDate,
      scheduleMonth,
      lessonStartDate,
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
              lessonPackageId: String(schedule.lessonPackageId || ""),
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
              lessonPackageId: String(schedule.lessonPackageId || ""),
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

function expandPackageLessonDates(
  lessonStartDate: string,
  lessonDays: string[],
  lessonCount: number,
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lessonStartDate)) return [];

  const [year, month, day] = lessonStartDate.split("-").map(Number);
  const current = new Date(Date.UTC(year, month - 1, day));

  if (Number.isNaN(current.getTime())) return [];

  const selectedDays = new Set(
    lessonDays.map(Number).filter((dayOfWeek) => dayOfWeek >= 0 && dayOfWeek <= 6),
  );
  const maxDates = Number.isFinite(lessonCount) && lessonCount > 0 ? lessonCount : 4;
  const dates: string[] = [];

  if (selectedDays.size === 0) return [];

  for (let attempts = 0; dates.length < maxDates && attempts < 370; attempts += 1) {
    if (selectedDays.has(current.getUTCDay())) {
      dates.push(formatDate(current));
    }

    current.setUTCDate(current.getUTCDate() + 1);
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
