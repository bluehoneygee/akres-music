import fs from "node:fs";
import path from "node:path";

import { MongoClient } from "mongodb";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function jakartaParts(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

async function main() {
  loadEnvFile(path.resolve(".env.local"));

  const mongoUri = String(process.env.MONGODB_URI ?? "").trim();
  const mongoDbName = String(process.env.MONGODB_DB ?? "").trim();
  const cronSecret = String(process.env.CRON_SECRET ?? "").trim();
  const authUrl = String(process.env.AUTH_URL ?? "http://localhost:3000").trim();

  if (!mongoUri || !mongoDbName || !cronSecret) {
    throw new Error("Missing required env: MONGODB_URI, MONGODB_DB, or CRON_SECRET");
  }

  const targetDate = new Date(Date.now() + (3 * 60 + 5) * 60 * 1000);
  const start = jakartaParts(targetDate);
  const end = jakartaParts(new Date(targetDate.getTime() + 60 * 60 * 1000));

  const smokeId = `smoke-notif-${Date.now()}`;
  const nowIso = new Date().toISOString();

  const scheduleDoc = {
    _id: smokeId,
    id: smokeId,
    lessonPackageId: "",
    courseId: "",
    studentId: "smoke-student",
    instructorId: "smoke-instructor",
    instrumentId: "",
    scheduleDate: start.date,
    fromTime: start.time,
    toTime: end.time,
    lessonMode: "Home Visit",
    studioRoomId: "",
    homeVisitAddress: "",
    travelNotes: "",
    privateLesson: true,
    scheduleMonth: start.date.slice(0, 7),
    lessonStartDate: start.date,
    lessonDays: [],
    lessonCount: 1,
    scheduleStatus: "Scheduled",
    originalScheduleId: "",
    rescheduleReason: "",
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const client = await new MongoClient(mongoUri).connect();
  const db = client.db(mongoDbName);

  try {
    await db.collection("schedules").insertOne(scheduleDoc);

    const runUrl = new URL("/api/notifications/run", authUrl);
    runUrl.searchParams.set("mode", "preclass3h");
    runUrl.searchParams.set("secret", cronSecret);

    const response = await fetch(runUrl, { method: "GET" });
    if (!response.ok) {
      throw new Error(`Runner failed: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json();
    const created = Number(payload?.data?.classReminder?.created ?? 0);
    const skipped = Number(payload?.data?.classReminder?.skipped ?? 0);

    console.log("Smoke result:", { created, skipped, schedule: { date: start.date, fromTime: start.time } });

    if (created < 3) {
      throw new Error(`Expected >=3 created notifications (3 roles), got ${created}`);
    }
  } finally {
    if (!keepData) {
      await db.collection("schedules").deleteOne({ id: smokeId });
      await db
        .collection("notifications")
        .deleteMany({ idempotencyKey: { $regex: smokeId } });
    }
    await client.close();
  }
}

main().catch((error) => {
  console.error("Notification smoke failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
  const keepData = process.argv.includes("--keep");
