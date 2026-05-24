import type { Document } from "mongodb";

import { getMongoDb } from "@/lib/mongodb";
import { sendPushToUsers } from "@/lib/push";

type JobResult = {
  created: number;
  skipped: number;
};

export type NotificationRunResult = {
  classReminder: JobResult;
};

type StudentRow = {
  id: string;
  firstName?: string;
  lastName?: string;
  guardianIds?: string[];
};

type ScheduleRow = {
  id: string;
  studentId?: string;
  instructorId?: string;
  scheduleDate?: string;
  fromTime?: string;
  courseId?: string;
  scheduleStatus?: string;
};

type CourseRow = {
  id: string;
  courseName?: string;
};

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function dayOffset(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return dateOnly(date);
}

function isoNow() {
  return new Date().toISOString();
}

function getJakartaNowParts() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
  };
}

function parseScheduleStartUtcMs(scheduleDate: string, fromTime: string) {
  const [year, month, day] = scheduleDate.split("-").map((value) => Number(value));
  const [hour, minute] = fromTime.split(":").map((value) => Number(value));
  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) return NaN;
  // Asia/Jakarta is UTC+7 (no DST)
  return Date.UTC(year, month - 1, day, hour - 7, minute, 0, 0);
}

function studentName(student: StudentRow | undefined) {
  if (!student) return "Murid";
  const full = `${String(student.firstName ?? "")} ${String(student.lastName ?? "")}`.trim();
  return full || "Murid";
}

async function upsertNotification(params: {
  idempotencyKey: string;
  message: string;
  studentId?: string;
  targetRole: "Music Instructor" | "Parent Portal User" | "Student Portal User";
}) {
  const db = await getMongoDb();
  const now = isoNow();
  const id = `notif-${params.idempotencyKey}`;

  const result = await db.collection("notifications").updateOne(
    { idempotencyKey: params.idempotencyKey },
    {
      $setOnInsert: {
        _id: id,
        id,
        createdAt: now,
        updatedAt: now,
        sentAt: now,
        type: "Class Reminder",
        targetRole: params.targetRole,
        studentId: String(params.studentId ?? ""),
        invoiceId: "",
        message: params.message,
        idempotencyKey: params.idempotencyKey,
      },
    },
    { upsert: true },
  );

  return result.upsertedCount > 0;
}

type ReminderMode = "all" | "morning" | "preclass3h";

async function runClassReminderRule(mode: ReminderMode) {
  const db = await getMongoDb();
  const reminderDates = [dayOffset(0), dayOffset(1)];

  const schedules = (await db
    .collection("schedules")
    .find({
      scheduleDate: { $in: reminderDates },
      scheduleStatus: { $in: ["Scheduled", "Rescheduled"] },
    })
    .project<ScheduleRow>({
      id: 1,
      studentId: 1,
      instructorId: 1,
      scheduleDate: 1,
      fromTime: 1,
      courseId: 1,
      scheduleStatus: 1,
    })
    .toArray()) as ScheduleRow[];

  if (schedules.length === 0) return { created: 0, skipped: 0 };

  const studentIds = [...new Set(schedules.map((row) => String(row.studentId ?? "")).filter(Boolean))];
  const courseIds = [...new Set(schedules.map((row) => String(row.courseId ?? "")).filter(Boolean))];

  const students = (await db
    .collection("students")
    .find({ id: { $in: studentIds } })
    .project<StudentRow>({ id: 1, firstName: 1, lastName: 1, guardianIds: 1 })
    .toArray()) as StudentRow[];
  const courses = (await db
    .collection("courses")
    .find({ id: { $in: courseIds } })
    .project<CourseRow>({ id: 1, courseName: 1 })
    .toArray()) as CourseRow[];
  const studentsById = new Map(students.map((row) => [String(row.id), row]));
  const coursesById = new Map(courses.map((row) => [String(row.id), row]));
  const users = (await db
    .collection("users")
    .find({
      role: { $in: ["Parent Portal User", "Student Portal User", "Music Instructor"] },
    })
    .project<{ _id: unknown; role?: string; studentId?: string; guardianId?: string; instructorId?: string }>({
      _id: 1,
      role: 1,
      studentId: 1,
      guardianId: 1,
      instructorId: 1,
    })
    .toArray()) as Array<{
    _id: unknown;
    role?: string;
    studentId?: string;
    guardianId?: string;
    instructorId?: string;
  }>;
  const today = dayOffset(0);
  const nowUtc = Date.now();
  const jakartaNow = getJakartaNowParts();
  const isMorningSlot = jakartaNow.hour === 7;

  let created = 0;
  let skipped = 0;

  for (const schedule of schedules) {
    const scheduleDate = String(schedule.scheduleDate ?? "");
    const scheduleId = String(schedule.id ?? "");
    const sid = String(schedule.studentId ?? "");
    const fromTime = String(schedule.fromTime ?? "");
    const label = scheduleDate === today ? "hari ini" : "besok";
    const courseName = String(coursesById.get(String(schedule.courseId ?? ""))?.courseName ?? "kelas musik");
    const message = `Reminder kelas ${label}: ${studentName(studentsById.get(sid))}, ${courseName}, ${scheduleDate} ${fromTime}.`;
    const scheduleStartUtcMs = parseScheduleStartUtcMs(scheduleDate, fromTime);

    const shouldSendMorning =
      (mode === "all" || mode === "morning") && isMorningSlot && scheduleDate === today;
    const diffMs = scheduleStartUtcMs - nowUtc;
    const inThreeHourWindow = diffMs >= 3 * 60 * 60 * 1000 && diffMs < (3 * 60 + 15) * 60 * 1000;
    const shouldSendPreclass = (mode === "all" || mode === "preclass3h") && inThreeHourWindow;

    if (!shouldSendMorning && !shouldSendPreclass) continue;

    for (const targetRole of ["Parent Portal User", "Student Portal User", "Music Instructor"] as const) {
      const stages: string[] = [];
      if (shouldSendMorning) stages.push("morning");
      if (shouldSendPreclass) stages.push("preclass3h");

      for (const stage of stages) {
        const inserted = await upsertNotification({
          idempotencyKey: `class-reminder:${stage}:${targetRole}:${scheduleId}:${scheduleDate}:${fromTime}`,
          message:
            stage === "morning"
              ? `[07:00] ${message}`
              : `[T-3 Jam] ${message}`,
          studentId: sid,
          targetRole,
        });
        if (inserted) created += 1;
        else skipped += 1;

        if (inserted) {
          const recipientIds = resolveRecipientUserIds({
            users,
            targetRole,
            studentId: sid,
            instructorId: String(schedule.instructorId ?? ""),
            guardianIds: (studentsById.get(sid)?.guardianIds ?? []) as string[],
          });
          await sendPushToUsers(recipientIds, {
            title: "Akres Music Reminder",
            body:
              stage === "morning"
                ? `[07:00] ${message}`
                : `[T-3 Jam] ${message}`,
            url: "/notifications",
          });
        }
      }
    }
  }

  return { created, skipped };
}

function resolveRecipientUserIds({
  users,
  targetRole,
  studentId,
  instructorId,
  guardianIds,
}: {
  users: Array<{
    _id: unknown;
    role?: string;
    studentId?: string;
    guardianId?: string;
    instructorId?: string;
  }>;
  targetRole: "Music Instructor" | "Parent Portal User" | "Student Portal User";
  studentId: string;
  instructorId: string;
  guardianIds: string[];
}) {
  if (targetRole === "Student Portal User") {
    return users
      .filter((user) => user.role === targetRole && String(user.studentId ?? "") === studentId)
      .map((user) => String(user._id));
  }

  if (targetRole === "Music Instructor") {
    return users
      .filter((user) => user.role === targetRole && String(user.instructorId ?? "") === instructorId)
      .map((user) => String(user._id));
  }

  const guardianSet = new Set(guardianIds.map(String));
  return users
    .filter(
      (user) =>
        user.role === targetRole && guardianSet.has(String(user.guardianId ?? "")),
    )
    .map((user) => String(user._id));
}

export async function runNotificationSchedulers(mode: ReminderMode = "all") {
  const classReminder = await runClassReminderRule(mode);
  return { classReminder } satisfies NotificationRunResult;
}

export async function listNotifications(limit = 50) {
  const db = await getMongoDb();
  const rows = (await db
    .collection("notifications")
    .find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray()) as Document[];
  return rows.map((row) => {
    const { _id: _dropId, ...rest } = row as Document & { _id: unknown };
    return rest;
  });
}
