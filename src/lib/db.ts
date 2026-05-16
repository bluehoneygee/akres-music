import bcrypt from "bcryptjs";
import type { Collection, Document, Filter } from "mongodb";

import type { AnyRecord, Database, ResourceName } from "@/lib/models";
import { getMongoDb } from "@/lib/mongodb";
import { seedDatabase, seedUsers } from "@/lib/seed";

export const resources: ResourceName[] = [
  "instruments",
  "students",
  "guardians",
  "instructors",
  "instructor-availability",
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

type UpdateActor = {
  id?: string;
  name?: string | null;
  email?: string | null;
};

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
  await ensureDemoRecords();

  await marker.updateOne(
    { key: "seeded" },
    { $set: { value: true, seededAt: new Date() } },
    { upsert: true },
  );
}

async function ensureDefaultUsers() {
  const db = await getMongoDb();
  const passwordHash = await bcrypt.hash("admin123", 12);

  await Promise.all(
    seedUsers.map((user) =>
      db.collection("users").updateOne(
        { email: user.email },
        {
          $setOnInsert: {
            email: user.email,
            emailVerified: null,
            name: user.name,
            role: user.role,
            studentId: user.studentId,
            guardianId: user.guardianId,
            instructorId: user.instructorId,
            passwordHash,
            createdAt: new Date().toISOString(),
          },
          $set: {
            updatedAt: new Date().toISOString(),
          },
        },
        { upsert: true },
      ),
    ),
  );
}

async function ensureDemoRecords() {
  const db = await getMongoDb();
  const now = new Date().toISOString();
  const seededResources: ResourceName[] = [
    "instruments",
    "rooms",
    "instructors",
    "instructor-availability",
    "guardians",
    "students",
    "courses",
    "repertoires",
  ];

  for (const resource of seededResources) {
    const rows = seedDatabase[resource] as Array<Record<string, unknown>>;

    await Promise.all(
      rows.map((row) => {
        const { updatedAt: _updatedAt, ...insertOnly } = row;

        return db.collection(resource).updateOne(
          { id: row.id },
          {
            $setOnInsert: {
              _id: row.id,
              ...insertOnly,
              createdAt: row.createdAt ?? now,
            },
            $set: {
              updatedAt: now,
            },
          },
          { upsert: true },
        );
      }),
    );
  }

  await ensureStudioRoomSetup();
  await ensureHourlyInstructorAvailabilitySetup();

  for (const lessonPackage of seedDatabase["lesson-packages"]) {
    const existingPackage = await db
      .collection("lesson-packages")
      .findOne({ id: lessonPackage.id });
    const packageRecord = existingPackage ?? {
      _id: lessonPackage.id,
      ...lessonPackage,
      createdAt: lessonPackage.createdAt ?? now,
      updatedAt: now,
    };

    if (!existingPackage) {
      await db.collection("lesson-packages").insertOne(packageRecord as Document);
    }

    const scheduleRecords = buildScheduleRecords(
      pickLessonPackageSchedulePayload(packageRecord),
      now,
    );

    await Promise.all(
      scheduleRecords.map((schedule) =>
        db.collection("schedules").updateOne(
          { id: schedule.id },
          { $setOnInsert: schedule },
          { upsert: true },
        ),
      ),
    );
    await ensureAttendanceForSchedules(scheduleRecords, now);
    await ensureInvoiceForLessonPackage(packageRecord, now);
  }
}

async function ensureStudioRoomSetup() {
  const db = await getMongoDb();
  const now = new Date().toISOString();
  const legacyRoomMap: Record<string, string> = {
    "room-strings-1": "room-a",
    "room-vocal-1": "room-a",
    "room-piano-1": "room-b",
    "room-guitar-1": "room-b",
    "room-drums-1": "room-b",
  };
  const legacyRoomIds = Object.keys(legacyRoomMap);

  await db.collection("rooms").updateMany(
    { id: { $in: legacyRoomIds } },
    {
      $set: {
        isActive: false,
        updatedAt: now,
      },
    },
  );

  await Promise.all(
    Object.entries(legacyRoomMap).map(([legacyRoomId, studioRoomId]) =>
      Promise.all([
        db.collection("lesson-packages").updateMany(
          { studioRoomId: legacyRoomId },
          { $set: { studioRoomId, updatedAt: now } },
        ),
        db.collection("schedules").updateMany(
          { studioRoomId: legacyRoomId },
          { $set: { studioRoomId, updatedAt: now } },
        ),
      ]),
    ),
  );
}

async function ensureHourlyInstructorAvailabilitySetup() {
  const db = await getMongoDb();
  const now = new Date().toISOString();
  const availabilityRows = await db
    .collection("instructor-availability")
    .find({ active: { $ne: false } })
    .toArray();

  await Promise.all(
    availabilityRows.map(async (row) => {
      const fromMinutes = timeToMinutes(String(row.fromTime || ""));
      const toMinutes = timeToMinutes(String(row.toTime || ""));

      if (
        !Number.isFinite(fromMinutes) ||
        !Number.isFinite(toMinutes) ||
        toMinutes - fromMinutes <= 60
      ) {
        return;
      }

      const hourlySlots = [];
      for (let start = fromMinutes; start + 60 <= toMinutes; start += 30) {
        const fromTime = minutesToTime(start);
        const toTime = minutesToTime(start + 60);
        const id = `${String(row.id || row._id)}-${fromTime.replace(":", "")}`;
        const { _id: _oldId, id: _oldRecordId, fromTime: _oldFromTime, toTime: _oldToTime, ...hourlyBase } = row;

        hourlySlots.push(
          db.collection("instructor-availability").updateOne(
            { id },
            {
              $setOnInsert: {
                _id: id,
                ...hourlyBase,
                id,
                fromTime,
                toTime,
                active: true,
                createdAt: row.createdAt ?? now,
              },
              $set: {
                updatedAt: now,
              },
            },
            { upsert: true },
          ),
        );
      }

      await Promise.all(hourlySlots);
      await db.collection("instructor-availability").updateOne(
        { id: row.id },
        {
          $set: {
            active: false,
            updatedAt: now,
          },
        },
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

  if (resource === "lesson-packages") {
    return hydrateLessonPackageInstruments(records).then((rows) => rows.map(fromMongo));
  }

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

  if (resource === "instructor-availability") {
    payload = normalizeInstructorAvailabilityPayload(payload);
  }

  const id = String(payload.id || `${resource}-${crypto.randomUUID()}`);
  const record = {
    _id: id,
    ...payload,
    ...(resource === "courses" ? { lessonType: "Private" } : {}),
    ...(resource === "journals"
      ? {
          confirmed: false,
          confirmedByUserId: "",
          confirmedByName: "",
          confirmedAt: "",
        }
      : {}),
    id,
    createdAt: now,
    updatedAt: now,
  };

  await (await collection(resource)).insertOne(record as Document);
  return fromMongo(record);
}

function normalizeInstructorAvailabilityPayload(payload: Record<string, unknown>) {
  const fromTime = String(payload.fromTime || "");
  const toTime = String(payload.toTime || nextHour(fromTime));

  if (timeToMinutes(toTime) - timeToMinutes(fromTime) !== 60) {
    throw new Error("Instructor availability harus per 1 jam.");
  }

  return {
    ...payload,
    fromTime,
    toTime,
    active: payload.active ?? true,
  };
}

async function createLessonPackageWithSchedules(
  payload: Record<string, unknown>,
  now: string,
) {
  const id = String(payload.id || `lesson-packages-${crypto.randomUUID()}`);
  const packagePayload = await normalizeLessonPackagePayload(payload);

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
  await ensureInvoiceForLessonPackage(record, now);

  return fromMongo(record as Document);
}

async function ensureInvoiceForLessonPackage(
  lessonPackage: Record<string, unknown>,
  now: string,
) {
  const lessonPackageId = String(lessonPackage.id || "");
  if (!lessonPackageId) return;

  const db = await getMongoDb();
  const course = await db.collection("courses").findOne<{
    courseName?: string;
    defaultFee?: number;
    packageAFee?: number;
    packageBFee?: number;
  }>({ id: String(lessonPackage.courseId || "") });
  const invoiceId = `invoice-${lessonPackageId}`;
  const billingPeriod = String(lessonPackage.billingPeriod || "");

  await db.collection("invoices").updateOne(
    { id: invoiceId },
    {
      $setOnInsert: {
        _id: invoiceId,
        id: invoiceId,
        studentId: String(lessonPackage.studentId || ""),
        instrumentId: String(lessonPackage.instrumentId || ""),
        lessonPackageId,
        courseId: String(lessonPackage.courseId || ""),
        billingPeriod,
        lessonPackage: course?.courseName || "Lesson Package",
        amount: getLessonPackageAmount(course, Number(lessonPackage.lessonCount || 4)),
        dueDate: "",
        paidAt: "",
        status: "Unpaid",
        confirmed: false,
        confirmedByUserId: "",
        confirmedByName: "",
        confirmedAt: "",
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true },
  );
}

async function normalizeLessonPackagePayload(payload: Record<string, unknown>) {
  const courseId = String(payload.courseId || "");
  const studentId = String(payload.studentId || "");
  const instructorId = String(payload.instructorId || "");
  const billingPeriod = String(payload.billingPeriod || payload.scheduleMonth || "");
  const availabilitySlotIds = toStringArray(payload.availabilitySlotId);
  const availableDates = toStringArray(payload.availableDate).sort();
  const instrumentId = String(payload.instrumentId || (await findCourseInstrumentId(courseId)) || "");
  const lessonMode = String(payload.lessonMode || "Studio");
  const lessonCount = normalizeLessonCount(payload.lessonCount);
  const availabilitySlots = await findSelectedInstructorAvailabilitySlots(
    instructorId,
    availabilitySlotIds,
    lessonCount,
  );
  const lessonDays = availabilitySlots.length > 0
    ? Array.from(new Set(availabilitySlots.map((slot) => String(slot.dayOfWeek))))
    : toStringArray(payload.lessonDays);
  const scheduleSlotTimes = availabilitySlots.map((slot) => ({
    availabilitySlotId: String(slot.id || ""),
    dayOfWeek: String(slot.dayOfWeek || ""),
    fromTime: String(slot.fromTime || ""),
    toTime: String(slot.toTime || ""),
  }));
  const fromTime = String(payload.fromTime || scheduleSlotTimes[0]?.fromTime || "");
  const toTime = String(payload.toTime || scheduleSlotTimes[0]?.toTime || "");
  const lessonStartDate =
    availableDates[0] ||
    String(payload.lessonStartDate || "") ||
    firstLessonDateInMonth(billingPeriod, lessonDays);

  if (!courseId || !studentId || !instructorId || !instrumentId || !billingPeriod || !lessonStartDate || !fromTime || !toTime || lessonDays.length === 0) {
    throw new Error("Lesson package needs student, course, instructor, instrument, billing period, start date, lesson days, and time.");
  }

  if (lessonCount === 8 && new Set(lessonDays).size < 2) {
    throw new Error("Paket B perlu minimal 2 lesson days karena jadwalnya 2x per minggu.");
  }

  if (availabilitySlots.length > 0 && new Set(availabilitySlots.map((slot) => String(slot.dayOfWeek))).size !== availabilitySlots.length) {
    throw new Error("Availability slots harus dari hari yang berbeda.");
  }

  if (availabilitySlotIds.length > 0 && availableDates.length !== (lessonCount === 8 ? 2 : 1)) {
    throw new Error(
      lessonCount === 8
        ? "Paket B harus memilih tepat 2 available dates."
        : "Paket A harus memilih tepat 1 available date.",
    );
  }

  const pastAvailableDate = availableDates.find((date) => date < todayDateString());
  if (pastAvailableDate) {
    throw new Error(`Available date ${pastAvailableDate} sudah lewat. Pilih tanggal hari ini atau setelahnya.`);
  }

  if (availableDates.length > 0 && new Set(availableDates.map(dateToDayOfWeek)).size !== availableDates.length) {
    throw new Error("Available dates harus dari hari yang berbeda.");
  }

  await assertInstructorSlotAvailable({
    instructorId,
    lessonStartDate,
    lessonDays,
    lessonCount,
    fromTime,
    scheduleSlotTimes,
    toTime,
  });

  await assertStudioRoomSlotAvailable({
    lessonMode,
    lessonStartDate,
    lessonDays,
    lessonCount,
    studioRoomId: String(payload.studioRoomId || ""),
    fromTime,
    scheduleSlotTimes,
    toTime,
  });

  return {
    ...payload,
    courseId,
    studentId,
    instructorId,
    instrumentId,
    billingPeriod,
    lessonStartDate,
    lessonDays,
    lessonCount,
    fromTime,
    toTime,
    scheduleSlotTimes,
    lessonMode,
    studioRoomId: String(payload.studioRoomId || ""),
    homeVisitAddress: String(payload.homeVisitAddress || ""),
    status: String(payload.status || "Active"),
  };
}

function normalizeLessonCount(value: unknown) {
  const lessonCount = Number(value || 4);
  return lessonCount === 8 ? 8 : 4;
}

type ScheduleSlotTime = {
  availabilitySlotId?: string;
  dayOfWeek: string;
  fromTime: string;
  toTime: string;
};

async function findSelectedInstructorAvailabilitySlots(
  instructorId: string,
  availabilitySlotIds: string[],
  lessonCount: number,
): Promise<Document[]> {
  const requiredSlotCount = lessonCount === 8 ? 2 : 1;
  if (availabilitySlotIds.length === 0) return [];

  if (availabilitySlotIds.length !== requiredSlotCount) {
    throw new Error(
      lessonCount === 8
        ? "Paket B harus memilih tepat 2 availability slots."
        : "Paket A harus memilih tepat 1 availability slot.",
    );
  }

  const db = await getMongoDb();
  const slots = await db
    .collection("instructor-availability")
    .find({
      id: { $in: availabilitySlotIds },
      instructorId,
      active: { $ne: false },
    })
    .toArray();

  if (slots.length !== availabilitySlotIds.length) {
    throw new Error("Availability slot tidak valid untuk instructor yang dipilih.");
  }

  const slotsById = new Map(slots.map((slot) => [String(slot.id || ""), slot]));
  const sortedSlots: Document[] = [];

  availabilitySlotIds.forEach((slotId) => {
    const slot = slotsById.get(slotId);
    if (slot) sortedSlots.push(slot);
  });

  return sortedSlots;
}

function getLessonPackageAmount(
  course: { defaultFee?: number; packageAFee?: number; packageBFee?: number } | null,
  lessonCount: number,
) {
  const packageAFee = Number(course?.packageAFee ?? course?.defaultFee ?? 0);
  if (lessonCount === 8) return Number(course?.packageBFee ?? packageAFee * 2);

  return packageAFee;
}

function firstLessonDateInMonth(monthValue: string, lessonDays: string[]) {
  if (!/^\d{4}-\d{2}$/.test(monthValue) || lessonDays.length === 0) return "";

  const [year, month] = monthValue.split("-").map(Number);
  const current = new Date(Date.UTC(year, month - 1, 1));
  const today = todayDateString();
  const selectedDays = new Set(
    lessonDays.map(Number).filter((dayOfWeek) => dayOfWeek >= 0 && dayOfWeek <= 6),
  );

  while (current.getUTCMonth() === month - 1) {
    const currentDate = current.toISOString().slice(0, 10);

    if (currentDate >= today && selectedDays.has(current.getUTCDay())) {
      return currentDate;
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return "";
}

function todayDateString() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function dateToDayOfWeek(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? String(new Date(`${date}T00:00:00.000Z`).getUTCDay())
    : "";
}

async function assertStudioRoomSlotAvailable({
  fromTime,
  lessonCount,
  lessonDays,
  lessonMode,
  lessonStartDate,
  scheduleSlotTimes = [],
  studioRoomId,
  toTime,
}: {
  fromTime: string;
  lessonCount: number;
  lessonDays: string[];
  lessonMode: string;
  lessonStartDate: string;
  scheduleSlotTimes?: ScheduleSlotTime[];
  studioRoomId: string;
  toTime: string;
}) {
  if (lessonMode !== "Studio") return;
  if (!studioRoomId) {
    throw new Error("Pilih Studio Room untuk lesson mode Studio.");
  }

  const dates = expandPackageLessonDates(lessonStartDate, lessonDays, lessonCount);
  if (dates.length === 0) return;

  const db = await getMongoDb();
  const existingSchedules = await db
    .collection("schedules")
    .find({
      studioRoomId,
      scheduleDate: { $in: dates },
      scheduleStatus: { $ne: "Cancelled" },
    })
    .toArray();

  const conflict = existingSchedules.find((schedule) => {
    const slotTime = slotTimeForDate(String(schedule.scheduleDate || ""), scheduleSlotTimes, fromTime, toTime);

    return rangesOverlap(
      slotTime.fromTime,
      slotTime.toTime,
      String(schedule.fromTime || ""),
      String(schedule.toTime || ""),
    );
  });

  if (conflict) {
    throw new Error(
      `Studio room sudah booked pada ${String(conflict.scheduleDate || "")}, ${String(conflict.fromTime || "")} - ${String(conflict.toTime || "")}.`,
    );
  }
}

async function findCourseInstrumentId(courseId: string) {
  if (!courseId) return "";

  const db = await getMongoDb();
  const course = await db.collection("courses").findOne<{ instrumentId?: string }>({ id: courseId });
  return course?.instrumentId ?? "";
}

async function hydrateLessonPackageInstruments(records: Document[]) {
  const missingCourseIds = [
    ...new Set(
      records
        .filter((record) => !record.instrumentId && record.courseId)
        .map((record) => String(record.courseId)),
    ),
  ];

  if (missingCourseIds.length === 0) return records;

  const db = await getMongoDb();
  const courses = await db
    .collection("courses")
    .find({ id: { $in: missingCourseIds } })
    .project({ id: 1, instrumentId: 1 })
    .toArray();
  const instrumentByCourse = new Map(courses.map((course) => [String(course.id), course.instrumentId]));

  return records.map((record) =>
    record.instrumentId
      ? record
      : { ...record, instrumentId: instrumentByCourse.get(String(record.courseId)) ?? "" },
  );
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
    scheduleSlotTimes: payload.scheduleSlotTimes,
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
  const scheduleSlotTimes = toScheduleSlotTimes(payload.scheduleSlotTimes);

  return dates.map((scheduleDate, index) => {
    const id = index === 0 ? baseId : `${baseId}-${index + 1}`;
    const slotTime = slotTimeForDate(
      scheduleDate,
      scheduleSlotTimes,
      String(payload.fromTime || ""),
      String(payload.toTime || ""),
    );

    return {
      _id: id,
      ...payload,
      id,
      scheduleDate,
      scheduleMonth,
      lessonStartDate,
      lessonDays,
      lessonCount,
      fromTime: slotTime.fromTime,
      toTime: slotTime.toTime,
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
              pendingRescheduleDate: "",
              pendingRescheduleFromTime: "",
              pendingRescheduleToTime: "",
              parentNotified: false,
              absenceAlertKey: "",
              confirmed: false,
              confirmedByUserId: "",
              confirmedByName: "",
              confirmedAt: "",
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
              rescheduleRequired: false,
              rescheduleScheduleId: "",
              pendingRescheduleDate: "",
              pendingRescheduleFromTime: "",
              pendingRescheduleToTime: "",
              notes: "",
              confirmed: false,
              confirmedByUserId: "",
              confirmedByName: "",
              confirmedAt: "",
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

function toScheduleSlotTimes(value: unknown): ScheduleSlotTime[] {
  if (!Array.isArray(value)) return [];

  const slotTimes: ScheduleSlotTime[] = [];

  value.forEach((item) => {
    if (!item || typeof item !== "object") return;

    const record = item as Record<string, unknown>;
    const slotTime = {
      availabilitySlotId: String(record.availabilitySlotId || ""),
      dayOfWeek: String(record.dayOfWeek || ""),
      fromTime: String(record.fromTime || ""),
      toTime: String(record.toTime || ""),
    };

    if (slotTime.dayOfWeek && slotTime.fromTime && slotTime.toTime) {
      slotTimes.push(slotTime);
    }
  });

  return slotTimes;
}

function slotTimeForDate(
  date: string,
  scheduleSlotTimes: ScheduleSlotTime[],
  fallbackFromTime: string,
  fallbackToTime: string,
) {
  const dayOfWeek = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? String(new Date(`${date}T00:00:00.000Z`).getUTCDay())
    : "";
  const slotTime = scheduleSlotTimes.find((slot) => slot.dayOfWeek === dayOfWeek);

  return {
    fromTime: slotTime?.fromTime || fallbackFromTime,
    toTime: slotTime?.toTime || fallbackToTime,
  };
}

async function assertInstructorSlotAvailable({
  instructorId,
  lessonStartDate,
  lessonDays,
  lessonCount,
  fromTime,
  scheduleSlotTimes = [],
  toTime,
}: {
  instructorId: string;
  lessonStartDate: string;
  lessonDays: string[];
  lessonCount: number;
  fromTime: string;
  scheduleSlotTimes?: ScheduleSlotTime[];
  toTime: string;
}) {
  const dates = expandPackageLessonDates(lessonStartDate, lessonDays, lessonCount);
  if (dates.length === 0) return;

  const db = await getMongoDb();
  const availability = await db
    .collection("instructor-availability")
    .find({ instructorId, active: { $ne: false } })
    .toArray();

  if (availability.length === 0) {
    throw new Error("Instructor availability belum diatur. Isi availability instructor dulu sebelum membuat Lesson Package.");
  }

  const unavailableDate = dates.find((date) => {
    const dayOfWeek = String(new Date(`${date}T00:00:00.000Z`).getUTCDay());
    const slotTime = slotTimeForDate(date, scheduleSlotTimes, fromTime, toTime);

    return !availability.some((slot) => {
      return (
        String(slot.dayOfWeek) === dayOfWeek &&
        timeToMinutes(String(slot.fromTime || "")) <= timeToMinutes(slotTime.fromTime) &&
        timeToMinutes(String(slot.toTime || "")) >= timeToMinutes(slotTime.toTime)
      );
    });
  });

  if (unavailableDate) {
    throw new Error(`Instructor tidak available pada ${unavailableDate}, ${fromTime} - ${toTime}.`);
  }

  const existingSchedules = await db
    .collection("schedules")
    .find({
      instructorId,
      scheduleDate: { $in: dates },
      scheduleStatus: { $ne: "Cancelled" },
    })
    .toArray();

  const conflict = existingSchedules.find((schedule) => {
    const slotTime = slotTimeForDate(String(schedule.scheduleDate || ""), scheduleSlotTimes, fromTime, toTime);

    return rangesOverlap(
      slotTime.fromTime,
      slotTime.toTime,
      String(schedule.fromTime || ""),
      String(schedule.toTime || ""),
    );
  });

  if (conflict) {
    throw new Error(
      `Instructor sudah terisi pada ${String(conflict.scheduleDate || "")}, ${String(conflict.fromTime || "")} - ${String(conflict.toTime || "")}.`,
    );
  }
}

function rangesOverlap(
  leftFrom: string,
  leftTo: string,
  rightFrom: string,
  rightTo: string,
) {
  const startA = timeToMinutes(leftFrom);
  const endA = timeToMinutes(leftTo);
  const startB = timeToMinutes(rightFrom);
  const endB = timeToMinutes(rightTo);

  if ([startA, endA, startB, endB].some((value) => Number.isNaN(value))) return false;
  return startA < endB && startB < endA;
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return Number.NaN;

  return hours * 60 + minutes;
}

function minutesToTime(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function nextHour(value: string) {
  const minutes = timeToMinutes(value);
  if (!Number.isFinite(minutes)) return "";

  return minutesToTime(minutes + 60);
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export async function updateRecord(
  resource: ResourceName,
  id: string,
  payload: Record<string, unknown>,
  actor?: UpdateActor,
) {
  const records = await collection(resource);
  const updatedAt = new Date().toISOString();
  const previous = await records.findOne({ id });

  if (isLockableResource(resource) && previous?.confirmed) {
    throw new Error(confirmedRecordMessage(resource));
  }

  const updatePayload = normalizeConfirmationPayload(resource, payload, actor, updatedAt);
  const result = await records.findOneAndUpdate(
    { id },
    { $set: { ...updatePayload, id, updatedAt } },
    { returnDocument: "after" },
  );

  if (result) {
    await syncScheduleStatusFromAttendance(resource, result, updatedAt, previous);
  }

  return result ? (fromMongo(result) as AnyRecord) : null;
}

function isAttendanceResource(resource: ResourceName) {
  return resource === "student-attendance" || resource === "instructor-attendance";
}

function isLockableResource(resource: ResourceName) {
  return isAttendanceResource(resource) || resource === "invoices" || resource === "journals";
}

function confirmedRecordMessage(resource: ResourceName) {
  if (resource === "invoices") return "Payment already confirmed";
  if (resource === "journals") return "Journal already confirmed";
  return "Attendance already confirmed";
}

function normalizeConfirmationPayload(
  resource: ResourceName,
  payload: Record<string, unknown>,
  actor: UpdateActor | undefined,
  updatedAt: string,
) {
  if (!isLockableResource(resource)) return payload;

  const {
    confirmedByUserId: _confirmedByUserId,
    confirmedByName: _confirmedByName,
    confirmedAt: _confirmedAt,
    ...cleanPayload
  } = payload;

  if (resource === "invoices") {
    cleanPayload.status = cleanPayload.status === "Paid" ? "Paid" : "Unpaid";
    cleanPayload.paidAt = cleanPayload.status === "Paid" ? cleanPayload.paidAt || updatedAt : "";
  }

  if (cleanPayload.confirmed === true) {
    return {
      ...cleanPayload,
      confirmed: true,
      confirmedByUserId: actor?.id ?? "",
      confirmedByName: actor?.name || actor?.email || "Unknown User",
      confirmedAt: updatedAt,
    };
  }

  return cleanPayload;
}

async function syncScheduleStatusFromAttendance(
  resource: ResourceName,
  attendance: Document,
  updatedAt: string,
  previous?: Document | null,
) {
  if (resource !== "student-attendance" && resource !== "instructor-attendance") return;

  const scheduleId = String(attendance.courseScheduleId || "");
  const attendanceStatus = String(attendance.status || "");
  const db = await getMongoDb();

  if (
    resource === "student-attendance" &&
    (attendanceStatus === "Pending" || attendanceStatus === "Present")
  ) {
    const linkedRescheduleId = String(
      previous?.makeupScheduleId || attendance.makeupScheduleId || "",
    );

    if (linkedRescheduleId) {
      await Promise.all([
        db.collection("schedules").deleteOne({ id: linkedRescheduleId }),
        db.collection("student-attendance").deleteMany({ courseScheduleId: linkedRescheduleId }),
        db.collection("instructor-attendance").deleteMany({ courseScheduleId: linkedRescheduleId }),
      ]);
    }

    await db.collection("student-attendance").updateOne(
      { id: String(attendance.id || "") },
      {
        $set: {
          absenceReason: "",
          makeupRequired: false,
          makeupScheduleId: "",
          pendingRescheduleDate: "",
          pendingRescheduleFromTime: "",
          pendingRescheduleToTime: "",
          updatedAt,
        },
      },
    );
  }

  if (
    resource === "instructor-attendance" &&
    (attendanceStatus === "Pending" || attendanceStatus === "Present")
  ) {
    const linkedRescheduleId = String(
      previous?.rescheduleScheduleId || attendance.rescheduleScheduleId || "",
    );

    if (linkedRescheduleId) {
      await Promise.all([
        db.collection("schedules").deleteOne({ id: linkedRescheduleId }),
        db.collection("student-attendance").deleteMany({ courseScheduleId: linkedRescheduleId }),
        db.collection("instructor-attendance").deleteMany({ courseScheduleId: linkedRescheduleId }),
      ]);
    }

    await db.collection("instructor-attendance").updateOne(
      { id: String(attendance.id || "") },
      {
        $set: {
          substituteInstructorId: "",
          rescheduleRequired: false,
          rescheduleScheduleId: "",
          pendingRescheduleDate: "",
          pendingRescheduleFromTime: "",
          pendingRescheduleToTime: "",
          updatedAt,
        },
      },
    );
  }

  if (!attendance.confirmed) return;

  if (
    resource === "student-attendance" &&
    ["Absent", "Sick", "Permission", "Rescheduled"].includes(attendanceStatus) &&
    !attendance.makeupScheduleId &&
    attendance.pendingRescheduleDate
  ) {
    const rescheduleId = await createConfirmedRescheduleSchedule(resource, attendance, updatedAt);
    attendance.makeupScheduleId = rescheduleId;
  }

  if (
    resource === "instructor-attendance" &&
    ["Absent", "Cancelled"].includes(attendanceStatus) &&
    !attendance.rescheduleScheduleId &&
    attendance.pendingRescheduleDate
  ) {
    const rescheduleId = await createConfirmedRescheduleSchedule(resource, attendance, updatedAt);
    attendance.rescheduleScheduleId = rescheduleId;
  }

  let scheduleStatus = "";

  if (resource === "student-attendance") {
    if (attendanceStatus === "Pending") scheduleStatus = "Scheduled";
    if (attendanceStatus === "Present") scheduleStatus = "Completed";
    if (["Absent", "Sick", "Permission", "Rescheduled"].includes(attendanceStatus)) {
      scheduleStatus = "Rescheduled";
    }
  }

  if (resource === "instructor-attendance") {
    if (["Cancelled", "Absent", "Rescheduled"].includes(attendanceStatus)) {
      scheduleStatus = "Rescheduled";
    }
  }

  if (!scheduleId || !scheduleStatus) return;

  await db.collection("schedules").updateOne(
    { id: scheduleId },
    {
      $set: {
        scheduleStatus,
        updatedAt,
      },
    },
  );

  if (
    resource === "instructor-attendance" &&
    (attendanceStatus === "Cancelled" || attendanceStatus === "Absent")
  ) {
    await db.collection("student-attendance").updateOne(
      { courseScheduleId: scheduleId },
      {
        $set: {
          status: "Rescheduled",
          makeupRequired: true,
          makeupScheduleId: String(attendance.rescheduleScheduleId || ""),
          absenceReason:
            attendanceStatus === "Absent" ? "Instructor Absent" : "Instructor Cancelled",
          updatedAt,
        },
      },
    );
  }

}

async function createConfirmedRescheduleSchedule(
  resource: ResourceName,
  attendance: Document,
  now: string,
) {
  const db = await getMongoDb();
  const originalSchedule = await db
    .collection("schedules")
    .findOne<Document>({ id: String(attendance.courseScheduleId || "") });

  if (!originalSchedule) return "";

  const scheduleId = `reschedule-${String(originalSchedule.id)}`;
  const scheduleRecord = {
    ...originalSchedule,
    _id: scheduleId,
    id: scheduleId,
    scheduleDate: String(attendance.pendingRescheduleDate || ""),
    fromTime: String(attendance.pendingRescheduleFromTime || originalSchedule.fromTime || ""),
    toTime: String(attendance.pendingRescheduleToTime || originalSchedule.toTime || ""),
    lessonStartDate: "",
    lessonDays: [],
    lessonCount: 1,
    scheduleStatus: "Scheduled",
    originalScheduleId: String(originalSchedule.id || ""),
    rescheduleReason: `Rescheduled from ${String(originalSchedule.scheduleDate || "")}`,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection("schedules").updateOne(
    { id: scheduleId },
    { $setOnInsert: scheduleRecord },
    { upsert: true },
  );
  await ensureAttendanceForSchedules([scheduleRecord], now);
  if (resource === "student-attendance") {
    await Promise.all([
      db.collection("student-attendance").updateOne(
        { id: String(attendance.id || "") },
        {
          $set: {
            makeupRequired: true,
            makeupScheduleId: scheduleId,
            pendingRescheduleDate: "",
            pendingRescheduleFromTime: "",
            pendingRescheduleToTime: "",
            updatedAt: now,
          },
        },
      ),
      db.collection("instructor-attendance").updateOne(
        { courseScheduleId: String(originalSchedule.id || ""), confirmed: { $ne: true } },
        {
          $set: {
            status: "Rescheduled",
            rescheduleRequired: true,
            rescheduleScheduleId: scheduleId,
            updatedAt: now,
          },
        },
      ),
    ]);
  }

  if (resource === "instructor-attendance") {
    await db.collection("instructor-attendance").updateOne(
      { id: String(attendance.id || "") },
      {
        $set: {
          rescheduleRequired: true,
          rescheduleScheduleId: scheduleId,
          pendingRescheduleDate: "",
          pendingRescheduleFromTime: "",
          pendingRescheduleToTime: "",
          updatedAt: now,
        },
      },
    );
  }

  return scheduleId;
}

export async function deleteRecord(resource: ResourceName, id: string) {
  if (resource === "lesson-packages") {
    return deleteLessonPackageCascade(id);
  }

  const result = await (await collection(resource)).deleteOne({ id });
  return result.deletedCount > 0;
}

async function deleteLessonPackageCascade(id: string) {
  const db = await getMongoDb();
  const scheduleIds = await db
    .collection("schedules")
    .find({ lessonPackageId: id })
    .project({ id: 1 })
    .toArray()
    .then((rows) => rows.map((row) => row.id).filter(Boolean));

  const result = await db.collection("lesson-packages").deleteOne({ id });

  if (result.deletedCount === 0) {
    return false;
  }

  await Promise.all([
    db.collection("schedules").deleteMany({ lessonPackageId: id }),
    db.collection("invoices").deleteMany({ lessonPackageId: id }),
    db.collection("student-attendance").deleteMany({
      $or: [{ lessonPackageId: id }, { courseScheduleId: { $in: scheduleIds } }],
    }),
    db.collection("instructor-attendance").deleteMany({
      $or: [{ lessonPackageId: id }, { courseScheduleId: { $in: scheduleIds } }],
    }),
  ]);

  return true;
}
