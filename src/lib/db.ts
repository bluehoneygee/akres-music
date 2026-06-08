import type { ClientSession, Collection, Db, Document, Filter } from "mongodb";

import type { AnyRecord, ResourceName } from "@/lib/models";
import { getMongoClient, getMongoDb } from "@/lib/mongodb";
import { seedDatabase } from "@/lib/seed";

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
  await ensureIndexes();
}

let indexPromise: Promise<void> | null = null;

async function ensureIndexes() {
  if (!indexPromise) {
    indexPromise = (async () => {
      const db = await getMongoDb();
      await Promise.all([
        db.collection("schedules").createIndex({ lessonPackageId: 1 }),
        db.collection("schedules").createIndex({ studentId: 1 }),
        db.collection("schedules").createIndex({ instructorId: 1 }),
        db.collection("schedules").createIndex({ scheduleDate: 1 }),
        db.collection("schedules").createIndex({ scheduleMonth: 1 }),
        db.collection("student-attendance").createIndex({ courseScheduleId: 1 }),
        db.collection("student-attendance").createIndex({ date: 1 }),
        db.collection("student-attendance").createIndex({ studentId: 1, date: 1 }),
        db.collection("instructor-attendance").createIndex({ courseScheduleId: 1 }),
        db.collection("instructor-attendance").createIndex({ attendanceDate: 1 }),
        db.collection("instructor-attendance").createIndex({ instructorId: 1, attendanceDate: 1 }),
        db.collection("lesson-packages").createIndex({ studentId: 1 }),
        db.collection("lesson-packages").createIndex({ instructorId: 1 }),
        db.collection("lesson-packages").createIndex({ billingPeriod: 1 }),
        db.collection("schedules").createIndex({ instructorId: 1, scheduleDate: 1 }),
        db.collection("schedules").createIndex({ studentId: 1, scheduleDate: 1 }),
        db.collection("schedules").createIndex({ studioRoomId: 1, scheduleDate: 1 }),
        db.collection("schedules").createIndex({ studioRoomId: 1, scheduleMonth: 1 }),
        db.collection("schedules").createIndex({ instructorId: 1, scheduleMonth: 1 }),
        db.collection("schedules").createIndex({ studentId: 1, scheduleMonth: 1 }),
        db.collection("lesson-packages").createIndex({ instructorId: 1, createdAt: -1 }),
        db.collection("lesson-packages").createIndex({ studentId: 1, createdAt: -1 }),
        db.collection("invoices").createIndex({ studentId: 1, billingPeriod: -1 }),
        db.collection("invoices").createIndex({ lessonPackageId: 1 }),
        db.collection("invoices").createIndex({ status: 1, billingPeriod: -1 }),
        db.collection("users").createIndex({ email: 1 }),
        db.collection("users").createIndex({ role: 1 }),
        db.collection("notifications").createIndex({ targetRole: 1, studentId: 1, createdAt: -1 }),
        db.collection("notifications").createIndex({ readByUserIds: 1 }),
        db.collection("journals").createIndex({ studentId: 1, parentVisible: 1, confirmed: 1 }),
        db.collection("journals").createIndex({ confirmed: 1, lessonDate: -1 }),
        db.collection("journals").createIndex({ studentId: 1, confirmed: 1, lessonDate: -1 }),
        db.collection("schedules").createIndex({ scheduleStatus: 1, scheduleDate: 1 }),
        db.collection("courses").createIndex({ instrumentId: 1 }),
        db.collection("instructor-availability").createIndex({ instructorId: 1, active: 1 }),
      ]);
    })();
  }

  await indexPromise;
}

async function seed() {
  const seedProfile = getDemoSeedProfile();
  if (seedProfile === "full") {
    await ensureDemoRecords();
  } else if (seedProfile === "studio") {
    await ensureStudioScheduleRecords();
  }
}

function getDemoSeedProfile(): "none" | "studio" | "full" {
  const profile = String(process.env.SEED_PROFILE || "").toLowerCase().trim();
  if (profile === "none" || profile === "studio" || profile === "full") {
    return profile;
  }

  if (process.env.SEED_DEMO_DATA === "false") return "none";
  if (process.env.SEED_DEMO_DATA === "true") return "full";

  return "none";
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

async function ensureStudioScheduleRecords() {
  const db = await getMongoDb();
  const now = new Date().toISOString();
  const studioPackageLimit = Math.max(
    1,
    Number.parseInt(process.env.SEED_STUDIO_PACKAGE_LIMIT || "1", 10) || 1,
  );
  const studioPackages = seedDatabase["lesson-packages"]
    .filter(
    (lessonPackage) => String(lessonPackage.lessonMode || "") === "Studio",
    )
    .slice(0, studioPackageLimit);
  const studentIds = new Set(studioPackages.map((pkg) => String(pkg.studentId || "")));
  const courseIds = new Set(studioPackages.map((pkg) => String(pkg.courseId || "")));
  const instructorIds = new Set(studioPackages.map((pkg) => String(pkg.instructorId || "")));
  const instrumentIds = new Set(studioPackages.map((pkg) => String(pkg.instrumentId || "")));
  const roomIds = new Set(studioPackages.map((pkg) => String(pkg.studioRoomId || "")).filter(Boolean));

  const scopedRows: Record<ResourceName, Array<Record<string, unknown>>> = {
    instruments: seedDatabase.instruments.filter((row) => instrumentIds.has(String(row.id || ""))),
    rooms: seedDatabase.rooms.filter((row) => roomIds.has(String(row.id || ""))),
    instructors: seedDatabase.instructors.filter((row) => instructorIds.has(String(row.id || ""))),
    "instructor-availability": seedDatabase["instructor-availability"].filter((row) =>
      instructorIds.has(String(row.instructorId || "")),
    ),
    students: seedDatabase.students.filter((row) => studentIds.has(String(row.id || ""))),
    courses: seedDatabase.courses.filter((row) => courseIds.has(String(row.id || ""))),
    guardians: [],
    "lesson-packages": [],
    schedules: [],
    "student-attendance": [],
    "instructor-attendance": [],
    journals: [],
    repertoires: [],
    invoices: [],
    notifications: [],
  };

  for (const resource of [
    "instruments",
    "rooms",
    "instructors",
    "instructor-availability",
    "students",
    "courses",
  ] as const) {
    const rows = scopedRows[resource];
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

  for (const lessonPackage of studioPackages) {
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
        const {
          _id: _oldId,
          id: _oldRecordId,
          fromTime: _oldFromTime,
          toTime: _oldToTime,
          updatedAt: _oldUpdatedAt,
          ...hourlyBase
        } = row;

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

export async function listRecordsPage({
  fields,
  filter,
  limit,
  page,
  resource,
  sort,
}: {
  fields?: string[];
  filter: Filter<Document>;
  limit: number;
  page: number;
  resource: ResourceName;
  sort: Record<string, 1 | -1>;
}) {
  const records = await collection(resource);
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const safePage = Math.max(page, 1);
  const skip = (safePage - 1) * safeLimit;
  const projection = fields?.length
    ? Object.fromEntries(["id", "createdAt", ...fields].filter(Boolean).map((field) => [field, 1]))
    : undefined;
  const findCursor = records.find(filter);
  if (projection) findCursor.project(projection);
  const [rows, total] = await Promise.all([
    findCursor.sort(sort).skip(skip).limit(safeLimit).toArray(),
    records.countDocuments(filter),
  ]);

  const data =
    resource === "lesson-packages"
      ? await hydrateLessonPackageInstruments(rows).then((hydratedRows) => hydratedRows.map(fromMongo))
      : rows.map(fromMongo);

  return {
    data,
    limit: safeLimit,
    page: safePage,
    total,
  };
}

export async function distinctRecordValues(
  resource: ResourceName,
  filter: Filter<Document>,
  fields: string[],
) {
  const records = await collection(resource);
  const entries = await Promise.all(
    fields.map(async (field) => [field, await records.distinct(field, filter)] as const),
  );

  return Object.fromEntries(entries) as Record<string, unknown[]>;
}

export async function listRecordsProjected(
  resource: ResourceName,
  fields: string[],
  filter: Filter<Document> = {},
  options?: {
    limit?: number;
    sort?: Record<string, 1 | -1>;
  },
) {
  const projection = Object.fromEntries(
    ["id", "createdAt", ...fields.filter(Boolean)].map((field) => [field, 1]),
  );
  const cursor = (await collection(resource))
    .find(filter)
    .project(projection)
    .sort(options?.sort ?? { createdAt: -1 });

  if (options?.limit && options.limit > 0) {
    cursor.limit(Math.min(options.limit, 500));
  }

  const records = await cursor.toArray();

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
    await assertInstructorAvailabilityNotDuplicate(payload);
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

async function assertInstructorAvailabilityNotDuplicate(payload: Record<string, unknown>) {
  const db = await getMongoDb();
  const instructorId = String(payload.instructorId || "");
  const dayOfWeek = String(payload.dayOfWeek || "");
  const fromTime = String(payload.fromTime || "");
  const toTime = String(payload.toTime || "");

  const duplicate = await db.collection("instructor-availability").findOne({
    instructorId,
    dayOfWeek,
    fromTime,
    toTime,
    active: { $ne: false },
  });

  if (duplicate) {
    throw new Error(
      `Slot ${fromTime}-${toTime} di hari ${dayOfWeek} sudah ada untuk instructor ini.`,
    );
  }
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
  context?: {
    db?: Db;
    session?: ClientSession;
  },
) {
  const lessonPackageId = String(lessonPackage.id || "");
  if (!lessonPackageId) return;

  const db = context?.db ?? (await getMongoDb());
  const session = context?.session;
  const course = await db.collection("courses").findOne<{
    courseName?: string;
    defaultFee?: number;
    packageAFee?: number;
    packageBFee?: number;
  }>({ id: String(lessonPackage.courseId || "") }, session ? { session } : undefined);
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
    { upsert: true, session },
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

  await assertStudentSlotAvailable({
    studentId,
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

function rescheduleQuotaForLessonCount(value: unknown) {
  void value;
  return 2;
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

function activeScheduleFilter() {
  return { $nin: ["Cancelled", "Rescheduled"] };
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
      scheduleStatus: activeScheduleFilter(),
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
      scheduleMonth: scheduleDate.slice(0, 7) || scheduleMonth,
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
  context?: {
    db?: Db;
    session?: ClientSession;
  },
) {
  const db = context?.db ?? (await getMongoDb());
  const session = context?.session;

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
              pendingRescheduleStudioRoomId: "",
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
          { upsert: true, session },
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
              pendingRescheduleStudioRoomId: "",
              notes: "",
              confirmed: false,
              confirmedByUserId: "",
              confirmedByName: "",
              confirmedAt: "",
              createdAt: now,
              updatedAt: now,
            },
          },
          { upsert: true, session },
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
      scheduleStatus: activeScheduleFilter(),
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

async function assertStudentSlotAvailable({
  studentId,
  lessonStartDate,
  lessonDays,
  lessonCount,
  fromTime,
  scheduleSlotTimes = [],
  toTime,
}: {
  studentId: string;
  lessonStartDate: string;
  lessonDays: string[];
  lessonCount: number;
  fromTime: string;
  scheduleSlotTimes?: ScheduleSlotTime[];
  toTime: string;
}) {
  const dates = expandPackageLessonDates(lessonStartDate, lessonDays, lessonCount);
  if (dates.length === 0 || !studentId) return;

  const db = await getMongoDb();
  const existingSchedules = await db
    .collection("schedules")
    .find({
      studentId,
      scheduleDate: { $in: dates },
      scheduleStatus: activeScheduleFilter(),
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
      `Student sudah terjadwal pada ${String(conflict.scheduleDate || "")}, ${String(conflict.fromTime || "")} - ${String(conflict.toTime || "")}.`,
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

function addOneMonthFromDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString().slice(0, 10);
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

  if (resource === "lesson-packages") {
    return updateLessonPackageWithSchedules(id, updatePayload, previous, updatedAt);
  }

  const result = await records.findOneAndUpdate(
    { id },
    { $set: { ...updatePayload, id, updatedAt } },
    { returnDocument: "after" },
  );

  if (result) {
    await syncScheduleStatusFromAttendance(resource, result, updatedAt, previous, actor);
  }

  return result ? (fromMongo(result) as AnyRecord) : null;
}

async function updateLessonPackageWithSchedules(
  id: string,
  payload: Record<string, unknown>,
  previous: Document | null,
  updatedAt: string,
) {
  if (!previous) return null;

  const mergedPayload = {
    ...previous,
    ...payload,
    id,
  };
  const packagePayload = await normalizeLessonPackagePayload(mergedPayload);
  const record = {
    ...previous,
    ...packagePayload,
    id,
    _id: id,
    updatedAt,
  };

  await withMongoTransaction(async ({ db, session }) => {
    await db.collection("lesson-packages").updateOne(
      { id },
      {
        $set: {
          ...record,
          updatedAt,
        },
      },
      { session },
    );

    const scheduleRecords = buildScheduleRecords(pickLessonPackageSchedulePayload(record), updatedAt);
    const nextScheduleIds = new Set(scheduleRecords.map((schedule) => String(schedule.id || "")));
    const existingSchedules = await db
      .collection("schedules")
      .find({ lessonPackageId: id }, { session })
      .toArray();
    const existingSchedulesById = new Map(existingSchedules.map((schedule) => [String(schedule.id || ""), schedule]));

    for (const schedule of scheduleRecords) {
      const existing = existingSchedulesById.get(String(schedule.id || ""));
      const scheduleRecord = {
        ...schedule,
        createdAt: String(existing?.createdAt || schedule.createdAt || updatedAt),
        updatedAt,
      };

      await db.collection("schedules").updateOne(
        { id: scheduleRecord.id },
        {
          $set: scheduleRecord,
          $setOnInsert: {
            _id: scheduleRecord.id,
            createdAt: scheduleRecord.createdAt,
          },
        },
        { upsert: true, session },
      );
      await syncAttendanceForSchedule(scheduleRecord, updatedAt, { db, session });
    }

    const removedScheduleIds = existingSchedules
      .map((schedule) => String(schedule.id || ""))
      .filter((scheduleId) => scheduleId && !nextScheduleIds.has(scheduleId));

    if (removedScheduleIds.length > 0) {
      await Promise.all([
        db.collection("schedules").deleteMany({ id: { $in: removedScheduleIds } }, { session }),
        db.collection("student-attendance").deleteMany({ courseScheduleId: { $in: removedScheduleIds } }, { session }),
        db.collection("instructor-attendance").deleteMany({ courseScheduleId: { $in: removedScheduleIds } }, { session }),
      ]);
    }

    await ensureInvoiceForLessonPackage(record, updatedAt);
  });

  return fromMongo(record as Document) as AnyRecord;
}

async function syncAttendanceForSchedule(
  schedule: Record<string, unknown>,
  now: string,
  context?: {
    db?: Db;
    session?: ClientSession;
  },
) {
  const db = context?.db ?? (await getMongoDb());
  const session = context?.session;
  const scheduleId = String(schedule.id || "");
  if (!scheduleId) return;

  const studentAttendanceId = `student-attendance-${scheduleId}`;
  const instructorAttendanceId = `instructor-attendance-${scheduleId}`;
  const studentAttendance = await db.collection("student-attendance").findOne<{
    confirmed?: boolean;
    status?: string;
    absenceReason?: string;
    makeupRequired?: boolean;
    makeupScheduleId?: string;
    pendingRescheduleDate?: string;
    pendingRescheduleFromTime?: string;
    pendingRescheduleToTime?: string;
    pendingRescheduleStudioRoomId?: string;
    parentNotified?: boolean;
    confirmedByUserId?: string;
    confirmedByName?: string;
    confirmedAt?: string;
    notes?: string;
  }>({ _id: studentAttendanceId } as unknown as Filter<Document>, { session });
  const instructorAttendance = await db.collection("instructor-attendance").findOne<{
    confirmed?: boolean;
    status?: string;
    substituteInstructorId?: string;
    rescheduleRequired?: boolean;
    rescheduleScheduleId?: string;
    pendingRescheduleDate?: string;
    pendingRescheduleFromTime?: string;
    pendingRescheduleToTime?: string;
    pendingRescheduleStudioRoomId?: string;
    confirmedByUserId?: string;
    confirmedByName?: string;
    confirmedAt?: string;
    notes?: string;
  }>({ _id: instructorAttendanceId } as unknown as Filter<Document>, { session });

  await Promise.all([
    db.collection("student-attendance").updateOne(
      { _id: studentAttendanceId } as unknown as Filter<Document>,
      {
        $set: {
          lessonPackageId: String(schedule.lessonPackageId || ""),
          studentId: String(schedule.studentId || ""),
          courseScheduleId: scheduleId,
          instrumentId: String(schedule.instrumentId || ""),
          date: String(schedule.scheduleDate || ""),
          updatedAt: now,
        },
        $setOnInsert: {
          _id: studentAttendanceId,
          id: studentAttendanceId,
          status: "Pending",
          absenceReason: "",
          makeupRequired: false,
          makeupScheduleId: "",
          pendingRescheduleDate: "",
          pendingRescheduleFromTime: "",
          pendingRescheduleToTime: "",
          pendingRescheduleStudioRoomId: "",
          parentNotified: false,
          absenceAlertKey: "",
          confirmed: false,
          confirmedByUserId: "",
          confirmedByName: "",
          confirmedAt: "",
          createdAt: now,
        },
      },
      { upsert: true, session },
    ),
    db.collection("instructor-attendance").updateOne(
      { _id: instructorAttendanceId } as unknown as Filter<Document>,
      {
        $set: {
          lessonPackageId: String(schedule.lessonPackageId || ""),
          instructorId: String(schedule.instructorId || ""),
          courseScheduleId: scheduleId,
          instrumentId: String(schedule.instrumentId || ""),
          attendanceDate: String(schedule.scheduleDate || ""),
          updatedAt: now,
        },
        $setOnInsert: {
          _id: instructorAttendanceId,
          id: instructorAttendanceId,
          status: "Pending",
          substituteInstructorId: "",
          rescheduleRequired: false,
          rescheduleScheduleId: "",
          pendingRescheduleDate: "",
          pendingRescheduleFromTime: "",
          pendingRescheduleToTime: "",
          pendingRescheduleStudioRoomId: "",
          confirmed: false,
          confirmedByUserId: "",
          confirmedByName: "",
          confirmedAt: "",
          notes: "",
          createdAt: now,
        },
      },
      { upsert: true, session },
    ),
  ]);

  if (studentAttendance?.confirmed) {
    await db.collection("student-attendance").updateOne(
      { _id: studentAttendanceId } as unknown as Filter<Document>,
      {
        $set: {
          confirmed: true,
          confirmedByUserId: String(studentAttendance.confirmedByUserId || ""),
          confirmedByName: String(studentAttendance.confirmedByName || ""),
          confirmedAt: String(studentAttendance.confirmedAt || now),
          status: String(studentAttendance.status || "Pending"),
          absenceReason: String(studentAttendance.absenceReason || ""),
          makeupRequired: Boolean(studentAttendance.makeupRequired),
          makeupScheduleId: String(studentAttendance.makeupScheduleId || ""),
          pendingRescheduleDate: String(studentAttendance.pendingRescheduleDate || ""),
          pendingRescheduleFromTime: String(studentAttendance.pendingRescheduleFromTime || ""),
          pendingRescheduleToTime: String(studentAttendance.pendingRescheduleToTime || ""),
          pendingRescheduleStudioRoomId: String(studentAttendance.pendingRescheduleStudioRoomId || ""),
          parentNotified: Boolean(studentAttendance.parentNotified),
          updatedAt: now,
        },
      },
      { session },
    );
  }

  if (instructorAttendance?.confirmed) {
    await db.collection("instructor-attendance").updateOne(
      { _id: instructorAttendanceId } as unknown as Filter<Document>,
      {
        $set: {
          confirmed: true,
          confirmedByUserId: String(instructorAttendance.confirmedByUserId || ""),
          confirmedByName: String(instructorAttendance.confirmedByName || ""),
          confirmedAt: String(instructorAttendance.confirmedAt || now),
          status: String(instructorAttendance.status || "Pending"),
          substituteInstructorId: String(instructorAttendance.substituteInstructorId || ""),
          rescheduleRequired: Boolean(instructorAttendance.rescheduleRequired),
          rescheduleScheduleId: String(instructorAttendance.rescheduleScheduleId || ""),
          pendingRescheduleDate: String(instructorAttendance.pendingRescheduleDate || ""),
          pendingRescheduleFromTime: String(instructorAttendance.pendingRescheduleFromTime || ""),
          pendingRescheduleToTime: String(instructorAttendance.pendingRescheduleToTime || ""),
          pendingRescheduleStudioRoomId: String(instructorAttendance.pendingRescheduleStudioRoomId || ""),
          notes: String(instructorAttendance.notes || ""),
          updatedAt: now,
        },
      },
      { session },
    );
  }
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
  actor?: UpdateActor,
) {
  if (resource !== "student-attendance" && resource !== "instructor-attendance") return;

  const scheduleId = String(attendance.courseScheduleId || "");
  const attendanceStatus = String(attendance.status || "");
  await withMongoTransaction(async ({ db, session }) => {
    if (
      resource === "student-attendance" &&
      (attendanceStatus === "Pending" || attendanceStatus === "Present")
    ) {
      const linkedRescheduleId = String(
        previous?.makeupScheduleId || attendance.makeupScheduleId || "",
      );

      if (linkedRescheduleId) {
        await Promise.all([
          db.collection("schedules").deleteOne({ id: linkedRescheduleId }, { session }),
          db.collection("student-attendance").deleteMany({ courseScheduleId: linkedRescheduleId }, { session }),
          db.collection("instructor-attendance").deleteMany({ courseScheduleId: linkedRescheduleId }, { session }),
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
            pendingRescheduleStudioRoomId: "",
            updatedAt,
          },
        },
        { session },
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
          db.collection("schedules").deleteOne({ id: linkedRescheduleId }, { session }),
          db.collection("student-attendance").deleteMany({ courseScheduleId: linkedRescheduleId }, { session }),
          db.collection("instructor-attendance").deleteMany({ courseScheduleId: linkedRescheduleId }, { session }),
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
            pendingRescheduleStudioRoomId: "",
            updatedAt,
          },
        },
        { session },
      );
    }

    if (!attendance.confirmed) return;

    if (
      resource === "student-attendance" &&
      attendanceStatus === "Rescheduled" &&
      !attendance.makeupScheduleId &&
      attendance.pendingRescheduleDate
    ) {
      const rescheduleId = await createConfirmedRescheduleSchedule(resource, attendance, updatedAt, {
        db,
        session,
      });
      attendance.makeupScheduleId = rescheduleId;
    }

    if (
      resource === "instructor-attendance" &&
      attendanceStatus === "Rescheduled" &&
      !attendance.rescheduleScheduleId &&
      attendance.pendingRescheduleDate
    ) {
      const rescheduleId = await createConfirmedRescheduleSchedule(resource, attendance, updatedAt, {
        db,
        session,
      });
      attendance.rescheduleScheduleId = rescheduleId;
    }

    let scheduleStatus = "";

    if (resource === "student-attendance") {
      if (attendanceStatus === "Pending") scheduleStatus = "Scheduled";
      if (attendanceStatus === "Present") scheduleStatus = "Completed";
      if (attendanceStatus === "Rescheduled") {
        scheduleStatus = "Rescheduled";
      }
      if (attendanceStatus === "Absent") scheduleStatus = "Completed";
    }

    if (resource === "instructor-attendance") {
      if (attendanceStatus === "Pending") scheduleStatus = "Scheduled";
      if (attendanceStatus === "Present" || attendanceStatus === "Absent") scheduleStatus = "Completed";
      if (attendanceStatus === "Rescheduled") scheduleStatus = "Rescheduled";
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
      { session },
    );

    if (attendanceStatus !== "Present" && attendanceStatus !== "Rescheduled") return;

    if (attendance.confirmed) {
      const confirmedByUserId = actor?.id ?? String(attendance.confirmedByUserId || "");
      const confirmedByName =
        actor?.name || actor?.email || String(attendance.confirmedByName || "Unknown User");

      if (resource === "student-attendance") {
        const counterpartSet: Record<string, unknown> = {
          status: attendanceStatus,
          confirmed: true,
          confirmedByUserId,
          confirmedByName,
          confirmedAt: updatedAt,
          updatedAt,
        };

        if (attendanceStatus === "Rescheduled") {
          counterpartSet.rescheduleRequired = true;
          counterpartSet.rescheduleScheduleId = String(attendance.makeupScheduleId || "");
        } else {
          counterpartSet.substituteInstructorId = "";
          counterpartSet.rescheduleRequired = false;
          counterpartSet.rescheduleScheduleId = "";
          counterpartSet.pendingRescheduleDate = "";
          counterpartSet.pendingRescheduleFromTime = "";
          counterpartSet.pendingRescheduleToTime = "";
          counterpartSet.pendingRescheduleStudioRoomId = "";
        }

        await db.collection("instructor-attendance").updateOne(
          { courseScheduleId: scheduleId },
          { $set: counterpartSet },
          { session },
        );
      } else {
        const counterpartSet: Record<string, unknown> = {
          status: attendanceStatus,
          confirmed: true,
          confirmedByUserId,
          confirmedByName,
          confirmedAt: updatedAt,
          updatedAt,
        };

        if (attendanceStatus === "Rescheduled") {
          counterpartSet.makeupRequired = true;
          counterpartSet.makeupScheduleId = String(attendance.rescheduleScheduleId || "");
          counterpartSet.absenceReason = "Instructor Rescheduled";
        } else {
          counterpartSet.makeupRequired = false;
          counterpartSet.makeupScheduleId = "";
          counterpartSet.pendingRescheduleDate = "";
          counterpartSet.pendingRescheduleFromTime = "";
          counterpartSet.pendingRescheduleToTime = "";
          counterpartSet.pendingRescheduleStudioRoomId = "";
        }

        await db.collection("student-attendance").updateOne(
          { courseScheduleId: scheduleId },
          { $set: counterpartSet },
          { session },
        );
      }
    }
  });
}

async function createConfirmedRescheduleSchedule(
  resource: ResourceName,
  attendance: Document,
  now: string,
  context?: {
    db?: Db;
    session?: ClientSession;
  },
) {
  const db = context?.db ?? (await getMongoDb());
  const session = context?.session;
  const originalSchedule = await db
    .collection("schedules")
    .findOne<Document>({ id: String(attendance.courseScheduleId || "") }, { session });

  if (!originalSchedule) return "";

  const pendingDate = String(attendance.pendingRescheduleDate || "");
  const pendingFromTime = String(attendance.pendingRescheduleFromTime || originalSchedule.fromTime || "");
  const pendingToTime = String(attendance.pendingRescheduleToTime || originalSchedule.toTime || "");
  const pendingStudioRoomId = String(
    attendance.pendingRescheduleStudioRoomId || originalSchedule.studioRoomId || "",
  );
  const scheduleId = `reschedule-${String(originalSchedule.id)}`;
  const lessonPackageId = String(originalSchedule.lessonPackageId || "");
  const originalScheduleDate = String(originalSchedule.scheduleDate || "");
  const today = formatDate(new Date());
  const minRescheduleDate = originalScheduleDate > today ? originalScheduleDate : today;
  const maxRescheduleDate = addOneMonthFromDate(
    String(originalSchedule.lessonStartDate || originalScheduleDate),
  );

  if (pendingDate < minRescheduleDate) {
    throw new Error(`Reschedule tidak boleh sebelum ${minRescheduleDate}.`);
  }

  if (maxRescheduleDate && pendingDate > maxRescheduleDate) {
    throw new Error(`Reschedule tidak boleh melewati ${maxRescheduleDate}.`);
  }

  if (resource === "student-attendance") {
    const counterpartInstructorAttendance = await db
      .collection("instructor-attendance")
      .findOne<Document>({ courseScheduleId: String(originalSchedule.id || "") }, { session });
    if (counterpartInstructorAttendance?.confirmed) {
      throw new Error("Tidak bisa reschedule: instructor attendance untuk sesi ini sudah confirmed.");
    }
  }

  if (resource === "instructor-attendance") {
    const counterpartStudentAttendance = await db
      .collection("student-attendance")
      .findOne<Document>({ courseScheduleId: String(originalSchedule.id || "") }, { session });
    if (counterpartStudentAttendance?.confirmed) {
      throw new Error("Tidak bisa reschedule: student attendance untuk sesi ini sudah confirmed.");
    }
  }

  const existingRescheduleForOriginal = await db.collection("schedules").findOne(
    {
      originalScheduleId: String(originalSchedule.id || ""),
      id: { $ne: scheduleId },
    },
    { session },
  );
  if (existingRescheduleForOriginal) {
    throw new Error("Sesi ini sudah pernah di-reschedule. Maksimal 2x reschedule.");
  }

  if (lessonPackageId) {
    const lessonPackage = await db
      .collection("lesson-packages")
      .findOne<Document>({ id: lessonPackageId }, { session });
    const originalScheduleCount = await db.collection("schedules").countDocuments({
      lessonPackageId,
      originalScheduleId: "",
      scheduleStatus: { $ne: "Cancelled" },
    }, { session });
    const lessonCountForQuota =
      Number(lessonPackage?.lessonCount || originalSchedule.lessonCount || originalScheduleCount || 4);
    const rescheduleQuota = rescheduleQuotaForLessonCount(lessonCountForQuota);
    const existingRescheduleCount = await db.collection("schedules").countDocuments({
      lessonPackageId,
      originalScheduleId: { $ne: "" },
      id: { $ne: scheduleId },
      scheduleStatus: { $ne: "Cancelled" },
    }, { session });

    if (existingRescheduleCount >= rescheduleQuota) {
      throw new Error(
        `Kuota reschedule package sudah habis (${existingRescheduleCount}/${rescheduleQuota}).`,
      );
    }
  }

  await assertRescheduleSlotAvailable({
    scheduleId,
    originalScheduleId: String(originalSchedule.id || ""),
    studentId: String(originalSchedule.studentId || ""),
    instructorId: String(originalSchedule.instructorId || ""),
    lessonStartDate: String(originalSchedule.lessonStartDate || ""),
    lessonMode: String(originalSchedule.lessonMode || "Studio"),
    studioRoomId: pendingStudioRoomId,
    scheduleDate: pendingDate,
    fromTime: pendingFromTime,
    toTime: pendingToTime,
  }, context);

  const scheduleRecord = {
    ...originalSchedule,
    _id: scheduleId,
    id: scheduleId,
    scheduleDate: pendingDate,
    fromTime: pendingFromTime,
    toTime: pendingToTime,
    lessonStartDate: "",
    lessonDays: [],
    lessonCount: 1,
    scheduleStatus: "Scheduled",
    originalScheduleId: String(originalSchedule.id || ""),
    rescheduleReason: `Rescheduled from ${String(originalSchedule.scheduleDate || "")}`,
    studioRoomId: pendingStudioRoomId,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection("schedules").updateOne(
    { id: scheduleId },
    { $setOnInsert: scheduleRecord },
    { upsert: true, session },
  );
  await ensureAttendanceForSchedules([scheduleRecord], now, context);
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
            pendingRescheduleStudioRoomId: "",
            updatedAt: now,
          },
        },
        { session },
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
        { session },
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
          pendingRescheduleStudioRoomId: "",
          updatedAt: now,
        },
      },
      { session },
    );
  }

  return scheduleId;
}

async function assertRescheduleSlotAvailable({
  scheduleId,
  originalScheduleId,
  studentId,
  instructorId,
  lessonStartDate,
  lessonMode,
  studioRoomId,
  scheduleDate,
  fromTime,
  toTime,
}: {
  scheduleId: string;
  originalScheduleId: string;
  studentId: string;
  instructorId: string;
  lessonStartDate: string;
  lessonMode: string;
  studioRoomId: string;
  scheduleDate: string;
  fromTime: string;
  toTime: string;
},
  context?: {
    db?: Db;
    session?: ClientSession;
  },
) {
  if (!scheduleDate || !fromTime || !toTime) {
    throw new Error("Reschedule harus mengisi tanggal dan jam pengganti.");
  }
  const maxRescheduleDate = addOneMonthFromDate(lessonStartDate || scheduleDate);
  if (maxRescheduleDate && scheduleDate > maxRescheduleDate) {
    throw new Error(`Reschedule tidak boleh melewati ${maxRescheduleDate}.`);
  }

  const db = context?.db ?? (await getMongoDb());
  const session = context?.session;
  const dayOfWeek = String(new Date(`${scheduleDate}T00:00:00.000Z`).getUTCDay());

  const availability = await db
    .collection("instructor-availability")
    .find({
      instructorId,
      dayOfWeek,
      active: { $ne: false },
    })
    .toArray();

  const isWithinInstructorAvailability = availability.some((slot) => {
    return (
      timeToMinutes(String(slot.fromTime || "")) <= timeToMinutes(fromTime) &&
      timeToMinutes(String(slot.toTime || "")) >= timeToMinutes(toTime)
    );
  });

  if (!isWithinInstructorAvailability) {
    throw new Error(
      `Instructor tidak available pada ${scheduleDate}, ${fromTime} - ${toTime}.`,
    );
  }

  const instructorSchedules = await db
    .collection("schedules")
    .find({
      id: { $nin: [scheduleId, originalScheduleId] },
      instructorId,
      scheduleDate,
      scheduleStatus: activeScheduleFilter(),
    })
    .toArray();

  const conflictingInstructorSchedule = instructorSchedules.find((schedule) =>
    rangesOverlap(
      fromTime,
      toTime,
      String(schedule.fromTime || ""),
      String(schedule.toTime || ""),
    ),
  );

  if (conflictingInstructorSchedule) {
    throw new Error(
      `Instructor sudah terisi pada ${scheduleDate}, ${fromTime} - ${toTime}.`,
    );
  }

  if (studentId) {
    const studentSchedules = await db
      .collection("schedules")
      .find({
        id: { $nin: [scheduleId, originalScheduleId] },
        studentId,
        scheduleDate,
        scheduleStatus: activeScheduleFilter(),
      })
      .toArray();

    const conflictingStudentSchedule = studentSchedules.find((schedule) =>
      rangesOverlap(
        fromTime,
        toTime,
        String(schedule.fromTime || ""),
        String(schedule.toTime || ""),
      ),
    );

    if (conflictingStudentSchedule) {
      throw new Error(
        `Student sudah terjadwal pada ${scheduleDate}, ${fromTime} - ${toTime}.`,
      );
    }
  }

  if (lessonMode !== "Studio" || !studioRoomId) return;

  const studioSchedules = await db
    .collection("schedules")
    .find({
      id: { $nin: [scheduleId, originalScheduleId] },
      lessonMode: "Studio",
      studioRoomId,
      scheduleDate,
      scheduleStatus: activeScheduleFilter(),
    })
    .toArray();

  const conflictingStudioSchedule = studioSchedules.find((schedule) =>
    rangesOverlap(
      fromTime,
      toTime,
      String(schedule.fromTime || ""),
      String(schedule.toTime || ""),
    ),
  );

  if (conflictingStudioSchedule) {
    throw new Error(
      `Studio room sudah booked pada ${scheduleDate}, ${fromTime} - ${toTime}.`,
    );
  }
}

async function withMongoTransaction(
  run: (context: { db: Db; session: ClientSession }) => Promise<void>,
) {
  const mongoClient = await getMongoClient();
  const db = await getMongoDb();
  const session = mongoClient.startSession();

  try {
    let executed = false;
    try {
      await session.withTransaction(async () => {
        executed = true;
        await run({ db, session });
      });
    } catch (error) {
      if (!isTransactionUnsupportedError(error)) throw error;
    }

    if (!executed) {
      await run({ db, session });
    }
  } finally {
    await session.endSession();
  }
}

function isTransactionUnsupportedError(error: unknown) {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error ?? "").toLowerCase();
  return (
    message.includes("transaction numbers are only allowed on a replica set member or mongos") ||
    message.includes("transactions are not supported")
  );
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
