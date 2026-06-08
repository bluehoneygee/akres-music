import type { ReactNode } from "react";

import type { AttendanceGroup, CombinedAttendanceGroup, Row, SessionRow } from "@/components/attendance-board";
import { formatDisplayText } from "@/lib/utils";

export function buildGroup({
  id,
  lessonPackage,
  packageSchedules,
  studentsById,
  coursesById,
  instructorsById,
  attendanceByScheduleId,
}: {
  id: string;
  lessonPackage: Row | null;
  packageSchedules: Row[];
  studentsById: Map<string, Row>;
  coursesById: Map<string, Row>;
  instructorsById: Map<string, Row>;
  attendanceByScheduleId: Map<string, Row>;
}): AttendanceGroup {
  const firstSchedule = packageSchedules[0];
  const studentId = String(lessonPackage?.studentId ?? firstSchedule?.studentId ?? "");
  const courseId = String(lessonPackage?.courseId ?? firstSchedule?.courseId ?? "");
  const instructorId = String(lessonPackage?.instructorId ?? firstSchedule?.instructorId ?? "");

  const sessions = [...packageSchedules]
    .map((schedule) => ({
      schedule,
      attendance: attendanceByScheduleId.get(schedule.id) ?? null,
    }))
    .flatMap((session) => {
      const pendingDate = String(session.attendance?.pendingRescheduleDate ?? "");

      if (!pendingDate || session.attendance?.makeupScheduleId) return [session];

      return [
        session,
        {
          schedule: {
            ...session.schedule,
            id: `draft-reschedule-${session.schedule.id}`,
            scheduleDate: pendingDate,
            fromTime: String(session.attendance?.pendingRescheduleFromTime ?? session.schedule.fromTime ?? ""),
            toTime: String(session.attendance?.pendingRescheduleToTime ?? session.schedule.toTime ?? ""),
            originalScheduleId: session.schedule.id,
            isDraftReschedule: true,
            scheduleStatus: "Rescheduled",
          },
          attendance: null,
        },
      ];
    })
    .sort((left, right) => compareScheduleRows(left.schedule, right.schedule));

  return {
    id,
    package: lessonPackage,
    student: studentsById.get(studentId) ?? null,
    course: coursesById.get(courseId) ?? null,
    instructor: instructorsById.get(instructorId) ?? null,
    sessions,
  };
}

export function mapById(rows: Row[]) {
  return new Map(rows.map((row) => [row.id, row]));
}

export function combineAttendanceGroups(groups: AttendanceGroup[]) {
  const combined = new Map<string, CombinedAttendanceGroup>();

  groups.forEach((group) => {
    const studentId = String(
      group.package?.studentId ?? group.sessions[0]?.schedule.studentId ?? group.student?.id ?? "",
    );
    const courseId = String(
      group.package?.courseId ?? group.sessions[0]?.schedule.courseId ?? group.course?.id ?? "",
    );
    const id = studentId && courseId ? `${studentId}-${courseId}` : group.id;
    const current = combined.get(id);

    if (current) {
      current.groups.push(group);
      return;
    }

    combined.set(id, {
      id,
      groups: [group],
      student: group.student,
      course: group.course,
    });
  });

  return [...combined.values()].map((group) => ({
    ...group,
    groups: group.groups.sort((left, right) => packageSortKey(left).localeCompare(packageSortKey(right))),
  }));
}

export function selectedAttendanceGroup(group: CombinedAttendanceGroup, selectedId?: string) {
  return group.groups.find((packageGroup) => packageGroup.id === selectedId) ?? group.groups[0];
}

export function prepareAttendanceGroups(
  groups: CombinedAttendanceGroup[],
  searchTerm: string,
  dayFilter: string,
  sortMode: "nearest" | "default",
) {
  const query = searchTerm.trim().toLowerCase();
  const filtered = groups.filter((group) => {
    const matchesSearch = query ? studentName(group.student).toLowerCase().includes(query) : true;
    const matchesDay = dayFilter ? groupHasDay(group, dayFilter) : true;
    return matchesSearch && matchesDay;
  });

  if (sortMode !== "nearest") return filtered;

  return [...filtered].sort((left, right) => {
    const leftTime = nearestScheduleTime(left);
    const rightTime = nearestScheduleTime(right);

    if (leftTime !== rightTime) return leftTime - rightTime;
    return studentName(left.student).localeCompare(studentName(right.student), undefined, {
      sensitivity: "base",
    });
  });
}

function groupHasDay(group: CombinedAttendanceGroup, dayFilter: string) {
  return group.groups
    .flatMap((packageGroup) => packageGroup.sessions)
    .some(({ schedule }) => scheduleDayValue(schedule.scheduleDate) === dayFilter);
}

function nearestScheduleTime(group: CombinedAttendanceGroup) {
  const now = Date.now();
  const sessionTimes = group.groups
    .flatMap((packageGroup) => packageGroup.sessions)
    .map(({ schedule }) => scheduleStartTime(schedule))
    .filter((value) => Number.isFinite(value));
  const upcoming = sessionTimes.filter((value) => value >= now).sort((left, right) => left - right);
  if (upcoming[0] !== undefined) return upcoming[0];

  const past = sessionTimes.sort((left, right) => right - left);
  return past[0] ?? Number.MAX_SAFE_INTEGER;
}

function scheduleStartTime(schedule: Row) {
  const date = String(schedule.scheduleDate ?? "");
  const fromTime = String(schedule.fromTime ?? "00:00");
  const timestamp = new Date(`${date}T${fromTime}:00`).getTime();
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

function packageSortKey(group: AttendanceGroup) {
  return String(group.package?.billingPeriod ?? group.package?.lessonStartDate ?? group.id);
}

export function packageLabel(group: AttendanceGroup) {
  const period = stringField(group.package, "billingPeriod");
  const start = stringField(group.package, "lessonStartDate");
  return [period, start ? `Start ${start}` : ""].filter(Boolean).join(" | ") || formatDisplayText(group.id);
}

export function stringField(row: Row | null, key: string) {
  return formatDisplayText(row?.[key]);
}

export function studentName(student: Row | null) {
  if (!student) return "Unknown student";
  return formatDisplayText(`${String(student.firstName ?? "")} ${String(student.lastName ?? "")}`);
}

export function scheduleDateTime(schedule: Row) {
  const date = String(schedule.scheduleDate ?? "-");
  const fromTime = String(schedule.fromTime ?? "-");
  const toTime = String(schedule.toTime ?? "-");
  return `${date}, ${fromTime} - ${toTime}`;
}

export function indonesianDayName(value: unknown) {
  const dateValue = String(value ?? "");
  const date = new Date(`${dateValue}T00:00:00`);
  if (!dateValue || Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", { weekday: "long" }).format(date);
}

function scheduleDayValue(value: unknown) {
  const dateValue = String(value ?? "");
  const date = new Date(`${dateValue}T00:00:00`);
  if (!dateValue || Number.isNaN(date.getTime())) return "";

  return String(date.getDay());
}

export function pendingRescheduleLabel(attendance: Row | null) {
  if (!attendance?.pendingRescheduleDate) return "";
  const date = String(attendance.pendingRescheduleDate);
  const fromTime = String(attendance.pendingRescheduleFromTime || "-");
  const toTime = String(attendance.pendingRescheduleToTime || "-");
  return `${date}, ${fromTime} - ${toTime}`;
}

export function formatDateTime(value: unknown) {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function compareScheduleRows(left: Row, right: Row) {
  return scheduleSortKey(left).localeCompare(scheduleSortKey(right));
}

function scheduleSortKey(schedule: Row) {
  return [
    String(schedule.scheduleDate ?? ""),
    String(schedule.fromTime ?? ""),
    String(schedule.toTime ?? ""),
    String(schedule.id ?? ""),
  ].join("|");
}

function findRescheduledToSchedule(schedules: Row[], scheduleId: string) {
  if (!scheduleId) return null;
  return (
    schedules.find(
      (row) =>
        String(row.originalScheduleId ?? "") === scheduleId &&
        String(row.scheduleStatus ?? "").toLowerCase() !== "cancelled",
    ) ?? null
  );
}

export function rescheduleTargetForSchedule(schedules: Row[], schedule: Row) {
  const originalScheduleId = String(schedule.originalScheduleId || schedule.id || "");
  return findRescheduledToSchedule(schedules, originalScheduleId);
}

export function packageRescheduleQuota(_schedule: Row, _schedules: Row[]) {
  return 2;
}

export function packageRescheduleUsage({
  attendanceRows,
  instructorAttendanceRows,
  schedule,
  schedules,
}: {
  attendanceRows: Row[];
  instructorAttendanceRows: Row[];
  schedule: Row;
  schedules: Row[];
}) {
  const packageId = String(schedule.lessonPackageId ?? "");
  const limit = packageRescheduleQuota(schedule, schedules);
  const originalScheduleIds = new Set(
    schedules
      .filter(
        (row) =>
          String(row.lessonPackageId ?? "") === packageId &&
          !String(row.originalScheduleId ?? ""),
      )
      .map((row) => String(row.id ?? ""))
      .filter(Boolean),
  );
  const usedOriginalIds = new Set<string>();

  for (const row of schedules) {
    const originalScheduleId = String(row.originalScheduleId ?? "");
    if (
      String(row.lessonPackageId ?? "") === packageId &&
      originalScheduleId &&
      originalScheduleIds.has(originalScheduleId) &&
      String(row.scheduleStatus ?? "").toLowerCase() !== "cancelled"
    ) {
      usedOriginalIds.add(originalScheduleId);
    }
  }

  for (const row of [...attendanceRows, ...instructorAttendanceRows]) {
    const courseScheduleId = String(row.courseScheduleId ?? "");
    const hasPendingReschedule = Boolean(
      String(row.pendingRescheduleDate ?? "") ||
        String(row.pendingRescheduleFromTime ?? "") ||
        String(row.pendingRescheduleToTime ?? ""),
    );
    if (
      String(row.lessonPackageId ?? "") === packageId &&
      originalScheduleIds.has(courseScheduleId) &&
      hasPendingReschedule
    ) {
      usedOriginalIds.add(courseScheduleId);
    }
  }

  return {
    limit,
    used: usedOriginalIds.size,
  };
}

export function studentProgressLabel(sessions: SessionRow[]) {
  const total = originalSessionCount(sessions);
  const done = Math.min(
    total,
    sessions.filter(({ attendance }) => attendance?.status === "Present").length,
  );

  return `${done}/${total} done`;
}

export function instructorProgressLabel(sessions: SessionRow[]) {
  const total = originalSessionCount(sessions);
  const present = Math.min(
    total,
    sessions.filter(({ attendance }) => attendance?.status === "Present").length,
  );

  return `${present}/${total} present`;
}

function originalSessionCount(sessions: SessionRow[]) {
  return sessions.filter(({ schedule }) => !schedule.originalScheduleId).length || sessions.length;
}

export function statusVariant(status: string) {
  if (status === "Present") return "success";
  if (status === "Pending") return "outline";
  if (status === "Rescheduled") return "warning";
  return "danger";
}

export function instructorStatusVariant(status: string) {
  if (status === "Present") return "success";
  if (status === "Pending") return "outline";
  if (status === "Rescheduled") return "warning";
  return "danger";
}

export function statusDotClass(status: string) {
  if (status === "Present") return "bg-emerald-500";
  if (status === "Pending") return "bg-zinc-300";
  if (status === "Rescheduled") {
    return "bg-amber-500";
  }

  return "bg-rose-500";
}

type RescheduleSlotOption = {
  value: string;
  label: string;
  dayOfWeek: number;
  fromTime: string;
  toTime: string;
};

type RescheduleDateOption = {
  value: string;
  label: string;
  date: string;
  conflicts: {
    instructor: boolean;
    student: boolean;
    studio: boolean;
  };
  disabled: boolean;
};

export type StudioRoomOption = {
  id: string;
  label: string;
  disabled: boolean;
};

export function buildRescheduleSlotOptions({
  availabilityRows,
  schedule
}: {
  availabilityRows: Row[];
  schedule: Row;
}): RescheduleSlotOption[] {
  const instructorId = String(schedule.instructorId ?? "");
  const availability = availabilityRows
    .filter(
      (row) =>
        String(row.instructorId ?? "") === instructorId &&
        Boolean(row.dayOfWeek) &&
        Boolean(row.fromTime) &&
        Boolean(row.toTime),
    )
    .map((row) => ({
      dayOfWeek: dayNameToIndex(String(row.dayOfWeek ?? "")),
      fromTime: String(row.fromTime ?? ""),
      toTime: String(row.toTime ?? ""),
    }))
    .filter((row) => row.dayOfWeek >= 0 && row.fromTime && row.toTime);

  const unique = new Map<string, RescheduleSlotOption>();
  availability.forEach((slot) => {
    const key = `${slot.dayOfWeek}|${slot.fromTime}|${slot.toTime}`;
    if (unique.has(key)) return;
    unique.set(key, {
      value: key,
      dayOfWeek: slot.dayOfWeek,
      fromTime: slot.fromTime,
      toTime: slot.toTime,
      label: `${dayIndexToName(slot.dayOfWeek)} · ${slot.fromTime}-${slot.toTime}`,
    });
  });

  return [...unique.values()].sort((left, right) => left.value.localeCompare(right.value));
}

export function buildRescheduleDateOptions({
  schedule,
  schedules,
  selectedSlot,
}: {
  schedule: Row;
  schedules: Row[];
  selectedSlot: RescheduleSlotOption | undefined;
}): RescheduleDateOption[] {
  if (!selectedSlot) return [];
  const instructorId = String(schedule.instructorId ?? "");
  const studentId = String(schedule.studentId ?? "");
  const lessonMode = String(schedule.lessonMode ?? "");
  const studioRoomId = String(schedule.studioRoomId ?? "");
  const skipIds = new Set([String(schedule.id ?? ""), String(schedule.originalScheduleId ?? "")]);
  const startDate = getMinRescheduleDate(schedule);
  const maxRescheduleDate = getMaxRescheduleDate(schedule);
  if (!maxRescheduleDate || maxRescheduleDate < startDate) return [];

  const endDate = maxRescheduleDate;
  const options: RescheduleDateOption[] = [];

  for (const cursor = new Date(startDate); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)) {
    if (cursor.getDay() !== selectedSlot.dayOfWeek) continue;
    const date = formatDateOnly(cursor);
    const fromTime = selectedSlot.fromTime;
    const toTime = selectedSlot.toTime;
    const conflicts = { instructor: false, student: false, studio: false };
    const isSameSlotAsOriginal =
      date === String(schedule.scheduleDate ?? "") &&
      fromTime === String(schedule.fromTime ?? "") &&
      toTime === String(schedule.toTime ?? "");

    if (isSameSlotAsOriginal) {
      conflicts.instructor = true;
      conflicts.student = true;
      if (lessonMode.toLowerCase() === "studio" && studioRoomId) {
        conflicts.studio = true;
      }
    }

    schedules.forEach((existing) => {
      const existingId = String(existing.id ?? "");
      if (skipIds.has(existingId)) return;
      if (String(existing.scheduleDate ?? "") !== date) return;
      if (String(existing.scheduleStatus ?? "").toLowerCase() === "cancelled") return;
      if (
        !rangesOverlap(
          fromTime,
          toTime,
          String(existing.fromTime ?? ""),
          String(existing.toTime ?? ""),
        )
      ) return;

      if (String(existing.instructorId ?? "") === instructorId) conflicts.instructor = true;
      if (studentId && String(existing.studentId ?? "") === studentId) conflicts.student = true;
      if (
        lessonMode.toLowerCase() === "studio" &&
        studioRoomId &&
        String(existing.lessonMode ?? "").toLowerCase() === "studio" &&
        String(existing.studioRoomId ?? "") === studioRoomId
      ) {
        conflicts.studio = true;
      }
    });

    const reasons: string[] = [];
    if (conflicts.instructor && conflicts.student) {
      reasons.push("Booked (student + instructor)");
    } else if (conflicts.instructor) {
      reasons.push("Booked (instructor)");
    } else if (conflicts.student) {
      reasons.push("Booked (student)");
    }
    const disabled = conflicts.instructor || conflicts.student;
    const label = reasons.length > 0 ? `${date} (${reasons.join(" · ")})` : date;

    options.push({ value: date, label, date, conflicts, disabled });
  }

  return options;
}

function getMaxRescheduleDate(schedule: Row) {
  const sourceDate = String(schedule.lessonStartDate ?? "") || String(schedule.scheduleDate ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sourceDate)) return null;
  const [year, month, day] = sourceDate.split("-").map(Number);
  const result = new Date(year, month - 1, day);
  result.setMonth(result.getMonth() + 1);
  return result;
}

function getMinRescheduleDate(schedule: Row) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const scheduleDate = parseDateOnly(String(schedule.scheduleDate ?? ""));

  if (scheduleDate && scheduleDate > today) return scheduleDate;
  return today;
}

function parseDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dayNameToIndex(dayName: string) {
  const normalized = dayName.toLowerCase();
  if (/^[0-6]$/.test(normalized)) return Number(normalized);
  if (normalized === "sunday") return 0;
  if (normalized === "monday") return 1;
  if (normalized === "tuesday") return 2;
  if (normalized === "wednesday") return 3;
  if (normalized === "thursday") return 4;
  if (normalized === "friday") return 5;
  if (normalized === "saturday") return 6;
  return -1;
}

export function findRescheduleSlotValueForSchedule(
  slotOptions: RescheduleSlotOption[],
  schedule: Row,
) {
  const scheduleDay = new Date(`${String(schedule.scheduleDate ?? "")}T00:00:00`).getDay();
  const scheduleFromTime = String(schedule.fromTime ?? "");
  const scheduleToTime = String(schedule.toTime ?? "");
  const matched = slotOptions.find(
    (slot) =>
      slot.dayOfWeek === scheduleDay &&
      slot.fromTime === scheduleFromTime &&
      slot.toTime === scheduleToTime,
  );
  return matched?.value;
}

function dayIndexToName(dayIndex: number) {
  const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return names[dayIndex] ?? "-";
}

function formatDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function rangesOverlap(startA: string, endA: string, startB: string, endB: string) {
  return startA < endB && endA > startB;
}

export function isStudioRoomBooked({
  schedules,
  roomId,
  date,
  fromTime,
  toTime,
  skipScheduleId,
  skipOriginalScheduleId,
}: {
  schedules: Row[];
  roomId: string;
  date: string;
  fromTime: string;
  toTime: string;
  skipScheduleId: string;
  skipOriginalScheduleId: string;
}) {
  if (!roomId || !date || !fromTime || !toTime) return false;
  return schedules.some((row) => {
    const id = String(row.id ?? "");
    if (id === skipScheduleId || id === skipOriginalScheduleId) return false;
    if (String(row.scheduleStatus ?? "").toLowerCase() === "cancelled") return false;
    if (String(row.lessonMode ?? "").toLowerCase() !== "studio") return false;
    if (String(row.studioRoomId ?? "") !== roomId) return false;
    if (String(row.scheduleDate ?? "") !== date) return false;
    return rangesOverlap(
      fromTime,
      toTime,
      String(row.fromTime ?? ""),
      String(row.toTime ?? ""),
    );
  });
}

export function Info({
  icon,
  label,
  mobileHidden = false,
  showMobileLabel = false,
  value,
}: {
  icon: ReactNode;
  label: string;
  mobileHidden?: boolean;
  showMobileLabel?: boolean;
  value: string;
}) {
  return (
    <span className={`${mobileHidden ? "hidden sm:inline-flex" : "inline-flex"} min-w-0 shrink-0 items-center gap-1.5`}>
      <span className="shrink-0 text-zinc-500">{icon}</span>
      <span className={`${showMobileLabel ? "inline" : "hidden"} shrink-0 text-[10px] uppercase tracking-[0.08em] text-zinc-400 sm:inline`}>
        {label}
      </span>
      <span className="truncate text-xs font-medium text-zinc-800">{value || "-"}</span>
    </span>
  );
}
