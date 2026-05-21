import { createHash } from "node:crypto";

import { MongoClient } from "mongodb";

const VISIT_SHEET_ID = "12jlALFEA8W4Djp4LoAlYDVL5QrY2eFwElu2NmacUX_4";
const VISIT_GID = "0";
const STUDIO_SHEET_ID = "1jas5CHNELGXlLb6_UKTWHSkSe0h4BP1B";
const STUDIO_GID = "1054954740";

const DAY_MAP = {
  SENIN: "Monday",
  SELASA: "Tuesday",
  RABU: "Wednesday",
  KAMIS: "Thursday",
  JUMAT: "Friday",
  "JUM'AT": "Friday",
  SABTU: "Saturday",
  MINGGU: "Sunday",
};

const COURSE_FEE = {
  piano: 350000,
  vocal: 350000,
  violin: 350000,
  guitar: 350000,
  drums: 350000,
};

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function shortHash(value) {
  return createHash("sha1").update(value).digest("hex").slice(0, 10);
}

function nowIso() {
  return new Date().toISOString();
}

function formatTime(token) {
  const normalized = String(token).trim().replace(".", ":");
  const [hRaw = "0", mRaw = "0"] = normalized.split(":");
  const h = hRaw.padStart(2, "0");
  const m = mRaw.padStart(2, "0");
  return `${h}:${m}`;
}

function parseRange(range) {
  const [fromRaw = "", toRaw = ""] = String(range).split("-").map((v) => v.trim());
  return {
    fromTime: formatTime(fromRaw),
    toTime: formatTime(toRaw),
  };
}

function splitName(fullName) {
  const cleaned = String(fullName).replace(/\s+/g, " ").trim();
  if (!cleaned) return { firstName: "", lastName: "" };
  const parts = cleaned.split(" ");
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function nextDateForDay(dayName) {
  const targets = {
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
    Sunday: 0,
  };
  const target = targets[dayName] ?? 1;
  const date = new Date();
  const delta = (target - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + delta);
  return date.toISOString().slice(0, 10);
}

function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function fetchCsv(sheetId, gid) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed fetching sheet ${sheetId}/${gid}: ${response.status}`);
  }
  return response.text();
}

function parseCsv(raw) {
  return raw
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(",").map((cell) => cell.trim()));
}

function normalizeInstrument(name) {
  const value = String(name).toLowerCase().trim();
  if (value.includes("piano")) return "piano";
  if (value.includes("vocal")) return "vocal";
  if (value.includes("violin")) return "violin";
  if (value.includes("guitar")) return "guitar";
  if (value.includes("drum")) return "drums";
  return value || "piano";
}

function instrumentLabel(key) {
  const labels = {
    piano: "Piano",
    vocal: "Vocal",
    violin: "Violin",
    guitar: "Guitar",
    drums: "Drums",
  };
  return labels[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

function parseVisitRows(rows) {
  return rows
    .slice(1)
    .map((row) => ({
      day: row[0] ?? "",
      timeRange: row[1] ?? "",
      studentName: row[2] ?? "",
      instructorName: row[3] ?? "",
      classChoice: row[4] ?? "",
      location: row[5] ?? "",
    }))
    .filter((row) => row.day && row.timeRange && row.studentName);
}

function parseStudioRows(rows) {
  const result = [];
  let leftDay = "";
  let rightDay = "";

  for (const row of rows.slice(1)) {
    if (!row.some((cell) => cell)) continue;

    if (row[0]) leftDay = row[0];
    if (row[5]) rightDay = row[5];

    const leftTime = row[1] ?? "";
    const rightTime = row[6] ?? "";
    const leftStudents = [row[2], row[3]].filter(Boolean);
    const rightStudents = [row[7], row[8]].filter(Boolean);

    for (const studentName of leftStudents) {
      result.push({
        day: leftDay,
        timeRange: leftTime,
        studentName,
        roomId: "room-a",
      });
    }
    for (const studentName of rightStudents) {
      result.push({
        day: rightDay,
        timeRange: rightTime,
        studentName,
        roomId: "room-b",
      });
    }
  }

  return result.filter((row) => row.day && row.timeRange && row.studentName);
}

async function upsert(collection, id, data) {
  const { id: _ignoredId, createdAt, ...rest } = data;
  await collection.updateOne(
    { id },
    {
      $setOnInsert: {
        _id: id,
        id,
        createdAt: createdAt ?? nowIso(),
      },
      $set: {
        ...rest,
        updatedAt: nowIso(),
      },
    },
    { upsert: true },
  );
}

async function main() {
  const uri = requireEnv("MONGODB_URI");
  const dbName = requireEnv("MONGODB_DB");
  const billingPeriod = process.env.MIGRATION_BILLING_PERIOD ?? new Date().toISOString().slice(0, 7);

  const [visitCsv, studioCsv] = await Promise.all([
    fetchCsv(VISIT_SHEET_ID, VISIT_GID),
    fetchCsv(STUDIO_SHEET_ID, STUDIO_GID),
  ]);

  const visitRows = parseVisitRows(parseCsv(visitCsv));
  const studioRows = parseStudioRows(parseCsv(studioCsv));

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const now = nowIso();

  try {
    const instruments = new Map();
    for (const row of visitRows) {
      const key = normalizeInstrument(row.classChoice);
      instruments.set(key, {
        id: `inst-${key}`,
        instrumentName: instrumentLabel(key),
        instrumentCategory: key === "vocal" ? "Vocals" : key === "violin" ? "Strings" : "Keyboard",
        isActive: true,
      });
    }
    if (!instruments.size) {
      instruments.set("piano", {
        id: "inst-piano",
        instrumentName: "Piano",
        instrumentCategory: "Keyboard",
        isActive: true,
      });
    }

    for (const instrument of instruments.values()) {
      await upsert(db.collection("instruments"), instrument.id, instrument);
    }

    await upsert(db.collection("rooms"), "room-a", {
      roomName: "Studio A",
      capacity: 1,
      instrumentIds: [...instruments.values()].map((v) => v.id),
      isActive: true,
      createdAt: now,
    });
    await upsert(db.collection("rooms"), "room-b", {
      roomName: "Studio B",
      capacity: 1,
      instrumentIds: [...instruments.values()].map((v) => v.id),
      isActive: true,
      createdAt: now,
    });

    const instructors = new Map();
    for (const row of visitRows) {
      const name = row.instructorName.replace(/\s+/g, " ").trim();
      const iid = `instructor-${slugify(name)}`;
      const instrumentId = `inst-${normalizeInstrument(row.classChoice)}`;
      const existing = instructors.get(iid) ?? {
        id: iid,
        instructorName: name,
        instrumentIds: [],
        levelFrom: "Beginner",
        levelTo: "Advanced",
        portalEnabled: true,
      };
      if (!existing.instrumentIds.includes(instrumentId)) {
        existing.instrumentIds.push(instrumentId);
      }
      instructors.set(iid, existing);
    }
    instructors.set("instructor-studio-pool", {
      id: "instructor-studio-pool",
      instructorName: "Studio Pool",
      instrumentIds: ["inst-piano"],
      levelFrom: "Beginner",
      levelTo: "Advanced",
      portalEnabled: false,
    });

    for (const instructor of instructors.values()) {
      await upsert(db.collection("instructors"), instructor.id, instructor);
    }

    const courses = new Map();
    for (const [key] of instruments) {
      const instrumentId = `inst-${key}`;
      const courseId = `course-${key}-private`;
      courses.set(courseId, {
        id: courseId,
        courseName: `${instrumentLabel(key)} Private`,
        instrumentId,
        courseLevel: "Beginner",
        lessonType: "Private",
        durationMinutes: 60,
        defaultFee: COURSE_FEE[key] ?? 350000,
        packageAFee: COURSE_FEE[key] ?? 350000,
        packageBFee: (COURSE_FEE[key] ?? 350000) * 2,
      });
    }
    for (const course of courses.values()) {
      await upsert(db.collection("courses"), course.id, course);
    }

    const students = new Map();
    const guardians = new Map();
    const lessonPackages = [];

    for (const row of visitRows) {
      const studentName = row.studentName.replace(/\s+/g, " ").trim();
      const sid = `student-${slugify(studentName)}`;
      if (!students.has(sid)) {
        const { firstName, lastName } = splitName(studentName);
        const gid = `guardian-${slugify(studentName)}`;
        guardians.set(gid, {
          id: gid,
          guardianName: `Orang Tua ${studentName}`,
          mobileNumber: "",
        });
        students.set(sid, {
          id: sid,
          firstName,
          lastName,
          skillLevel: "Beginner",
          learningGoal: `Belajar ${row.classChoice}`,
          guardianIds: [gid],
          portalEnabled: true,
          musicNotes: "",
        });
      }
      const instrumentKey = normalizeInstrument(row.classChoice);
      const instructorId = `instructor-${slugify(row.instructorName)}`;
      const courseId = `course-${instrumentKey}-private`;
      const day = DAY_MAP[String(row.day).toUpperCase()] ?? "Monday";
      const { fromTime, toTime } = parseRange(row.timeRange);
      const lessonStartDate = nextDateForDay(day);
      const lpId = `lp-visit-${shortHash(`${sid}-${day}-${fromTime}-${instructorId}`)}`;

      lessonPackages.push({
        id: lpId,
        studentId: sid,
        courseId,
        instructorId,
        instrumentId: `inst-${instrumentKey}`,
        billingPeriod,
        lessonStartDate,
        lessonDays: [day],
        lessonCount: 4,
        fromTime,
        toTime,
        lessonMode: "Home Visit",
        studioRoomId: "",
        homeVisitAddress: row.location,
        status: "Active",
      });
    }

    for (const row of studioRows) {
      const studentName = row.studentName.replace(/\s+/g, " ").trim();
      const sid = `student-${slugify(studentName)}`;
      if (!students.has(sid)) {
        const { firstName, lastName } = splitName(studentName);
        const gid = `guardian-${slugify(studentName)}`;
        guardians.set(gid, {
          id: gid,
          guardianName: `Orang Tua ${studentName}`,
          mobileNumber: "",
        });
        students.set(sid, {
          id: sid,
          firstName,
          lastName,
          skillLevel: "Beginner",
          learningGoal: "Les studio",
          guardianIds: [gid],
          portalEnabled: true,
          musicNotes: "",
        });
      }
      const day = DAY_MAP[String(row.day).toUpperCase()] ?? "Monday";
      const { fromTime, toTime } = parseRange(row.timeRange);
      const lessonStartDate = nextDateForDay(day);
      const lpId = `lp-studio-${shortHash(`${sid}-${day}-${fromTime}-${row.roomId}`)}`;

      lessonPackages.push({
        id: lpId,
        studentId: sid,
        courseId: "course-piano-private",
        instructorId: "instructor-studio-pool",
        instrumentId: "inst-piano",
        billingPeriod,
        lessonStartDate,
        lessonDays: [day],
        lessonCount: 4,
        fromTime,
        toTime,
        lessonMode: "Studio",
        studioRoomId: row.roomId,
        homeVisitAddress: "",
        status: "Active",
      });
    }

    for (const guardian of guardians.values()) {
      await upsert(db.collection("guardians"), guardian.id, guardian);
    }

    for (const student of students.values()) {
      await upsert(db.collection("students"), student.id, student);
    }

    for (const pkg of lessonPackages) {
      await upsert(db.collection("lesson-packages"), pkg.id, pkg);

      for (let i = 0; i < pkg.lessonCount; i += 1) {
        const date = addDays(pkg.lessonStartDate, i * 7);
        const scheduleId = `schedule-${pkg.id}-${i + 1}`;

        await upsert(db.collection("schedules"), scheduleId, {
          lessonPackageId: pkg.id,
          courseId: pkg.courseId,
          studentId: pkg.studentId,
          instructorId: pkg.instructorId,
          instrumentId: pkg.instrumentId,
          scheduleDate: date,
          fromTime: pkg.fromTime,
          toTime: pkg.toTime,
          lessonMode: pkg.lessonMode,
          studioRoomId: pkg.studioRoomId,
          homeVisitAddress: pkg.homeVisitAddress,
          travelNotes: "",
          privateLesson: true,
          scheduleMonth: pkg.billingPeriod,
          lessonStartDate: pkg.lessonStartDate,
          lessonDays: pkg.lessonDays,
          lessonCount: pkg.lessonCount,
          scheduleStatus: "Scheduled",
          originalScheduleId: "",
          rescheduleReason: "",
        });

        const studentAttId = `student-att-${scheduleId}`;
        await upsert(db.collection("student-attendance"), studentAttId, {
          lessonPackageId: pkg.id,
          studentId: pkg.studentId,
          courseScheduleId: scheduleId,
          instrumentId: pkg.instrumentId,
          date,
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
        });

        const instructorAttId = `instructor-att-${scheduleId}`;
        await upsert(db.collection("instructor-attendance"), instructorAttId, {
          lessonPackageId: pkg.id,
          instructorId: pkg.instructorId,
          courseScheduleId: scheduleId,
          attendanceDate: date,
          instrumentId: pkg.instrumentId,
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
        });
      }
    }

    console.log(`Migration completed for "${dbName}".`);
    console.log(`Visit rows: ${visitRows.length}`);
    console.log(`Studio rows: ${studioRows.length}`);
    console.log(`Instruments: ${instruments.size}`);
    console.log(`Instructors: ${instructors.size}`);
    console.log(`Guardians: ${guardians.size}`);
    console.log(`Students: ${students.size}`);
    console.log(`Lesson packages: ${lessonPackages.length}`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
