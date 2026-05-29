import type { Document } from "mongodb";

import { getMongoDb } from "@/lib/mongodb";
import { sendPushToUsers } from "@/lib/push";

type JobResult = {
  created: number;
  skipped: number;
};

export type NotificationRunResult = {
  classReminder: JobResult;
  debug?: {
    force: boolean;
    mode: ReminderMode;
    nowUtc: string;
    schedules: Array<{
      scheduleId: string;
      scheduleDate: string;
      fromTime: string;
      stage: "morning" | "preclass3h" | "none";
      reason: "created" | "skipped_existing" | "no_window_match" | "invalid_time";
      targetRole?: "Music Instructor" | "Parent Portal User" | "Student Portal User";
      recipientCount?: number;
    }>;
  };
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

function buildRoleMessage(params: {
  targetRole: "Music Instructor" | "Parent Portal User" | "Student Portal User";
  stage: "morning" | "preclass3h";
  scheduleDate: string;
  fromTime: string;
  studentDisplayName: string;
  courseName: string;
  isToday: boolean;
}) {
  const stagePrefix = params.stage === "morning" ? "Pagi ini" : "Mulai 3 jam lagi";
  const whenLabel = params.isToday ? "hari ini" : "besok";
  const timeLabel = `${params.scheduleDate} ${params.fromTime}`;

  if (params.targetRole === "Parent Portal User") {
    return `[${stagePrefix}] Reminder untuk orang tua: ${params.studentDisplayName} ada kelas ${params.courseName} ${whenLabel} pukul ${params.fromTime} (${timeLabel}).`;
  }

  if (params.targetRole === "Student Portal User") {
    return `[${stagePrefix}] Reminder kelasmu: ${params.courseName} ${whenLabel} pukul ${params.fromTime} (${timeLabel}).`;
  }

  return `[${stagePrefix}] Reminder mengajar: ${params.studentDisplayName} (${params.courseName}) ${whenLabel} pukul ${params.fromTime} (${timeLabel}).`;
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
        readByUserIds: [],
      },
    },
    { upsert: true },
  );

  return result.upsertedCount > 0;
}

type ReminderMode = "all" | "morning" | "preclass3h";

type RunSchedulerOptions = {
  force?: boolean;
  debug?: boolean;
};

async function runClassReminderRule(mode: ReminderMode, options?: RunSchedulerOptions) {
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
  const force = options?.force === true;
  const debugEnabled = options?.debug === true;
  const debugSchedules: NonNullable<NotificationRunResult["debug"]>["schedules"] = [];

  let created = 0;
  let skipped = 0;

  for (const schedule of schedules) {
    const scheduleDate = String(schedule.scheduleDate ?? "");
    const scheduleId = String(schedule.id ?? "");
    const sid = String(schedule.studentId ?? "");
    const fromTime = String(schedule.fromTime ?? "");
    const isToday = scheduleDate === today;
    const courseName = String(coursesById.get(String(schedule.courseId ?? ""))?.courseName ?? "kelas musik");
    const studentDisplayName = studentName(studentsById.get(sid));
    const scheduleStartUtcMs = parseScheduleStartUtcMs(scheduleDate, fromTime);
    if (Number.isNaN(scheduleStartUtcMs)) {
      if (debugEnabled) {
        debugSchedules.push({
          scheduleId,
          scheduleDate,
          fromTime,
          stage: "none",
          reason: "invalid_time",
        });
      }
      continue;
    }

    const shouldSendMorning = force
      ? (mode === "all" || mode === "morning") && scheduleDate === today
      : (mode === "all" || mode === "morning") && isMorningSlot && scheduleDate === today;
    const diffMs = scheduleStartUtcMs - nowUtc;
    const inThreeHourWindow = diffMs >= 3 * 60 * 60 * 1000 && diffMs < (3 * 60 + 15) * 60 * 1000;
    const shouldSendPreclass = force
      ? (mode === "all" || mode === "preclass3h") && scheduleDate === today
      : (mode === "all" || mode === "preclass3h") && inThreeHourWindow;

    if (!shouldSendMorning && !shouldSendPreclass) {
      if (debugEnabled) {
        debugSchedules.push({
          scheduleId,
          scheduleDate,
          fromTime,
          stage: "none",
          reason: "no_window_match",
        });
      }
      continue;
    }

    for (const targetRole of ["Parent Portal User", "Student Portal User", "Music Instructor"] as const) {
      const stages: Array<"morning" | "preclass3h"> = [];
      if (shouldSendMorning) stages.push("morning");
      if (shouldSendPreclass) stages.push("preclass3h");

      for (const stage of stages) {
        const formattedMessage = buildRoleMessage({
          targetRole,
          stage,
          scheduleDate,
          fromTime,
          studentDisplayName,
          courseName,
          isToday,
        });
        const inserted = await upsertNotification({
          idempotencyKey: `class-reminder:${stage}:${targetRole}:${scheduleId}:${scheduleDate}:${fromTime}`,
          message: formattedMessage,
          studentId: sid,
          targetRole,
        });
        if (inserted) created += 1;
        else skipped += 1;
        const recipientIds = resolveRecipientUserIds({
          users,
          targetRole,
          studentId: sid,
          instructorId: String(schedule.instructorId ?? ""),
          guardianIds: (studentsById.get(sid)?.guardianIds ?? []) as string[],
        });

        if (debugEnabled) {
          debugSchedules.push({
            scheduleId,
            scheduleDate,
            fromTime,
            stage,
            reason: inserted ? "created" : "skipped_existing",
            targetRole,
            recipientCount: recipientIds.length,
          });
        }

        if (inserted) {
          await sendPushToUsers(recipientIds, {
            title: "Akres Music Reminder",
            body: formattedMessage,
            url: "/notifications",
          });
        }
      }
    }
  }

  return {
    created,
    skipped,
    debug: debugEnabled
      ? {
          force,
          mode,
          nowUtc: new Date(nowUtc).toISOString(),
          schedules: debugSchedules,
        }
      : undefined,
  };
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

export async function runNotificationSchedulers(mode: ReminderMode = "all", options?: RunSchedulerOptions) {
  const classReminder = await runClassReminderRule(mode, options);
  return {
    classReminder: { created: classReminder.created, skipped: classReminder.skipped },
    debug: classReminder.debug,
  } satisfies NotificationRunResult;
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
