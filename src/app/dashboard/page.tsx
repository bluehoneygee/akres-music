import {
  AlertTriangle,
  Banknote,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";

import { auth } from "@/auth";
import { AttendancePeriodFilter } from "@/components/attendance-period-filter";
import { AppShell } from "@/components/app-shell";
import { LatestJournalList } from "@/components/latest-journal-list";
import { UpcomingScheduleList } from "@/components/upcoming-schedule-list";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readDatabase } from "@/lib/db";
import type {
  CourseSchedule,
  Invoice,
  Student,
  StudentAttendance,
} from "@/lib/models";
import { sessionRole } from "@/lib/session";
import { formatDisplayText } from "@/lib/utils";
import { filterTypedRecordsForSession } from "@/lib/visibility";

export const dynamic = "force-dynamic";

function statusVariant(status: string): "success" | "warning" | "danger" | "secondary" {
  if (["Present", "Completed", "Paid", "Active", "Good", "Excellent"].includes(status)) return "success";
  if (["Late", "Rescheduled", "Unpaid", "Improving"].includes(status)) return "warning";
  if (["Absent", "Sick", "Permission", "Cancelled", "Needs Work"].includes(status)) return "danger";
  return "secondary";
}

function scheduleStartAt(schedule: Pick<CourseSchedule, "scheduleDate" | "fromTime">) {
  return new Date(`${schedule.scheduleDate}T${schedule.fromTime}:00`);
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const session = await auth();
  const role = session ? sessionRole(session) : "";
  const isPortal = role === "Parent Portal User" || role === "Student Portal User";
  const db = await readDatabase();

  const students = session
    ? await filterTypedRecordsForSession("students", db.students, session)
    : db.students;
  const lessonPackages = session
    ? await filterTypedRecordsForSession("lesson-packages", db["lesson-packages"], session)
    : db["lesson-packages"];
  const schedules = session
    ? await filterTypedRecordsForSession("schedules", db.schedules, session)
    : db.schedules;
  const instructors = session
    ? await filterTypedRecordsForSession("instructors", db.instructors, session)
    : db.instructors;
  const journals = session
    ? await filterTypedRecordsForSession("journals", db.journals, session)
    : db.journals;
  const attendance = session
    ? await filterTypedRecordsForSession("student-attendance", db["student-attendance"], session)
    : db["student-attendance"];
  const invoices = session
    ? await filterTypedRecordsForSession("invoices", db.invoices, session)
    : db.invoices;
  const schedulesById = new Map(schedules.map((row) => [row.id, row]));
  const today = new Date();
  const period = readQueryValue(params.period) || "this_month";
  const isParentPortal = role === "Parent Portal User";
  const isStudentPortal = role === "Student Portal User";
  const isInstructor = role === "Music Instructor";
  const allowInstructorScope = !isParentPortal && !isStudentPortal && !isInstructor;
  const allowAllScope = true;
  const allowStudentScope = !isInstructor && students.length > 1;
  const availableScopeOptionCount =
    Number(allowAllScope) + Number(allowStudentScope) + Number(allowInstructorScope);
  const scope = normalizeScope(parseScope(readQueryValue(params.scope)), {
    allowAllScope,
    allowStudentScope,
    allowInstructorScope,
  });
  const targetId = readQueryValue(params.targetId) || "";
  const defaultFrom = toDateInputValue(new Date(today.getFullYear(), today.getMonth(), 1));
  const defaultTo = toDateInputValue(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  const from = readQueryValue(params.from) || defaultFrom;
  const to = readQueryValue(params.to) || defaultTo;
  const attendanceInRange = attendance.filter((row) =>
    isAttendanceInRange({
      from,
      period,
      schedulesById,
      to,
      row,
      today,
    }),
  );
  const attendanceScoped = attendanceInRange.filter((row) =>
    isAttendanceInScope({
      row,
      scope,
      targetId,
      schedulesById,
    }),
  );

  const confirmedJournals = journals.filter((journal) => journal.confirmed);
  const visibleJournals = isPortal
    ? confirmedJournals.filter((journal) => journal.parentVisible)
    : confirmedJournals;
  const activePackages = lessonPackages.filter((lessonPackage) => lessonPackage.status === "Active");
  const openInvoices = invoices.filter((invoice) => invoice.status !== "Paid");
  const attendanceSummary = summarizeAttendance(attendanceScoped);
  const completionPercent = attendanceScoped.length
    ? Math.round((attendanceSummary.present / attendanceScoped.length) * 100)
    : 0;
  const now = new Date();
  const upcomingSchedulesAll = schedules
    .filter((schedule) => schedule.scheduleStatus === "Scheduled")
    .filter((schedule) => {
      const startAt = scheduleStartAt(schedule);
      if (Number.isNaN(startAt.getTime())) return false;
      return startAt >= now;
    })
    .sort((left, right) =>
      `${left.scheduleDate} ${left.fromTime}`.localeCompare(`${right.scheduleDate} ${right.fromTime}`),
    );
  const upcomingSchedules = upcomingSchedulesAll.slice(0, 4);
  const latestJournals = visibleJournals
    .slice()
    .sort((left, right) => String(right.lessonDate).localeCompare(String(left.lessonDate)))
    .slice(0, 3);
  const studentFilterOptions = students.map((student) => ({
    id: student.id,
    label: studentName(student),
  }));
  const showScopeSelect = availableScopeOptionCount > 1;
  const visibleInstructorIds = new Set(schedules.map((schedule) => schedule.instructorId));
  const instructorFilterOptions = instructors
    .filter((instructor) => visibleInstructorIds.has(instructor.id))
    .map((instructor) => ({
      id: instructor.id,
      label: formatDisplayText(instructor.instructorName) || "Unknown Instructor",
    }));

  const metrics = [
    {
      label: isPortal ? "Murid terhubung" : "Murid aktif",
      value: String(students.length),
      delta: isPortal ? "sesuai akun portal" : `${activePackages.length} paket aktif`,
      icon: GraduationCap,
      tint: "bg-sky-100 text-sky-700",
      href: "/students",
    },
    {
      label: "Jadwal aktif",
      value: String(upcomingSchedulesAll.length),
      delta: `${schedules.length} total sesi`,
      icon: CalendarDays,
      tint: "bg-emerald-100 text-emerald-700",
      href: "/attendance",
    },
    {
      label: "Jurnal final",
      value: String(visibleJournals.length),
      delta: isPortal ? "visible untuk portal" : "sudah confirmed",
      icon: BookOpenCheck,
      tint: "bg-violet-100 text-violet-700",
      href: "/journals",
    },
    ...(role !== "Parent Portal User" && role !== "Student Portal User" && role !== "Music Instructor"
      ? [
          {
            label: "Tagihan unpaid",
            value: String(openInvoices.length),
            delta: formatCurrency(sumInvoices(openInvoices)),
            icon: Banknote,
            tint: "bg-amber-100 text-amber-700",
            href: "/billing",
          },
        ]
      : []),
  ];

  const actionItems = [
    {
      title: "Review attendance",
      meta: `${attendance.filter((row) => !row.confirmed && row.status !== "Pending").length} attendance belum confirmed.`,
      variant: "secondary" as const,
    },
    {
      title: "Finalize journal",
      meta: `${journals.filter((journal) => !journal.confirmed).length} journal tersimpan tapi belum confirmed.`,
      variant: "warning" as const,
    },
    ...(role === "System Manager" || role === "Academic Staff"
      ? [
          {
            title: "Follow up billing",
            meta: `${openInvoices.length} invoice masih unpaid senilai ${formatCurrency(sumInvoices(openInvoices))}.`,
            variant: openInvoices.length ? ("danger" as const) : ("success" as const),
          },
        ]
      : []),
  ];
  const upcomingScheduleItems = upcomingSchedules.map((item) => {
    const student = db.students.find((row) => row.id === item.studentId);
    const instructor = instructors.find((row) => row.id === item.instructorId);
    const course = db.courses.find((row) => row.id === item.courseId);
    const room = db.rooms.find((row) => row.id === item.studioRoomId);

    return {
      id: item.id,
      fromTime: item.fromTime,
      scheduleDate: item.scheduleDate,
      studentName: formatDisplayText(student ? studentName(student) : "Unknown Student"),
      courseName: formatDisplayText(course?.courseName),
      instructorName: formatDisplayText(instructor?.instructorName),
      lessonMode: item.lessonMode,
      locationLabel: formatDisplayText(item.lessonMode === "Studio" ? room?.roomName : item.homeVisitAddress),
      statusLabel: formatDisplayText(item.scheduleStatus),
      statusVariant: statusVariant(item.scheduleStatus),
    } as const;
  });
  const latestJournalItems = latestJournals.map((journal) => {
    const student = db.students.find((row) => row.id === journal.studentId);
    return {
      id: journal.id,
      studentName: formatDisplayText(student ? studentName(student) : "Unknown Student"),
      lessonDate: journal.lessonDate,
      progressRating: formatDisplayText(journal.progressRating),
      progressVariant: statusVariant(journal.progressRating),
      materialCovered: formatDisplayText(journal.materialCovered),
      homework: journal.homework ? formatDisplayText(journal.homework) : "",
    } as const;
  });

  return (
    <AppShell>
      <section className={`grid gap-2 sm:gap-3 ${metrics.length === 4 ? "grid-cols-2 xl:grid-cols-4" : "grid-cols-3"}`}>
        {metrics.map((metric) => (
          <Link href={metric.href} key={metric.label}>
            <Card className="liquid-glass no-glass-highlight shadow-none transition hover:brightness-[1.02]">
              <CardContent className="p-3 sm:p-4">
                <div className="flex min-h-[88px] flex-col justify-between gap-2 sm:min-h-0 sm:flex-row sm:items-start sm:gap-3">
                  <div className={`grid size-8 shrink-0 place-items-center rounded-2xl sm:order-2 sm:size-11 ${metric.tint}`}>
                    <metric.icon className="size-4 sm:size-5" />
                  </div>
                  <div className="min-w-0 sm:order-1">
                    <p className="truncate text-xs text-zinc-500 sm:text-sm">
                      {metric.label}
                    </p>
                    <p className="mt-1 text-2xl font-semibold tracking-normal sm:mt-2 sm:text-3xl">
                      {metric.value}
                    </p>
                    <p className="mt-1 truncate text-[11px] text-zinc-500 sm:text-xs">
                      {metric.delta}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <section className={`grid gap-4 ${isPortal ? "xl:grid-cols-2" : "xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,.65fr)]"}`}>
        <Card className="liquid-glass no-glass-highlight shadow-none">
          <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
            <CardTitle>{isPortal ? "Jadwal Les Anak" : "Jadwal Les Terdekat"}</CardTitle>
            <p className="mt-1 text-sm text-zinc-500">
              {isPortal
                ? "Sesi studio atau home visit yang terhubung dengan akun ini."
                : "Sesi aktif terdekat dari seluruh jadwal akademik."}
            </p>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0 sm:space-y-3 sm:p-5 sm:pt-0">
            {upcomingSchedules.length === 0 ? (
              <p className="text-sm text-zinc-500">Belum ada jadwal aktif.</p>
            ) : null}
            <UpcomingScheduleList
              items={upcomingScheduleItems}
              storageKey={isPortal ? "overview-schedule-read-portal" : "overview-schedule-read-admin"}
            />
          </CardContent>
        </Card>

        {isPortal ? (
          <Card className="liquid-glass no-glass-highlight shadow-none">
            <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
              <CardTitle>Rekap Kehadiran</CardTitle>
              <AttendancePeriodFilter
                allowAllScope={allowAllScope}
                allowInstructorScope={allowInstructorScope}
                allowStudentScope={allowStudentScope}
                from={from}
                instructors={instructorFilterOptions}
                period={period}
                showScopeSelect={showScopeSelect}
                scope={scope}
                students={studentFilterOptions}
                targetId={targetId}
                to={to}
              />
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0 sm:space-y-4 sm:p-5 sm:pt-0">
              <AttendancePieChart
                completionPercent={completionPercent}
                summary={attendanceSummary}
                total={attendanceScoped.length}
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="liquid-glass no-glass-highlight shadow-none">
            <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
              <CardTitle>Prioritas Hari Ini</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0 sm:space-y-3 sm:p-5 sm:pt-0">
              {actionItems.map((item) => (
                <div className="rounded-[20px] border border-white/45 bg-white/42 p-3 sm:p-4" key={item.title}>
                  <div className="flex items-start gap-3 sm:block">
                    <div className="grid size-9 shrink-0 place-items-center rounded-2xl bg-white/45 text-zinc-500 sm:hidden">
                      <AlertTriangle className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="hidden items-center justify-between gap-3 sm:mb-3 sm:flex">
                        <AlertTriangle className="size-5 text-zinc-500" />
                        <Badge variant={item.variant}>Action</Badge>
                      </div>
                      <div className="flex items-start justify-between gap-2 sm:block">
                        <p className="font-medium">{item.title}</p>
                        <Badge className="shrink-0 sm:hidden" variant={item.variant}>
                          Action
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-zinc-500">{item.meta}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      <section className={`grid gap-4 ${isPortal ? "grid-cols-1" : "xl:grid-cols-3"}`}>
        {!isPortal ? (
          <Card className="liquid-glass no-glass-highlight shadow-none">
          <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
            <CardTitle>Rekap Kehadiran</CardTitle>
            <AttendancePeriodFilter
              allowAllScope={allowAllScope}
              allowInstructorScope={allowInstructorScope}
              allowStudentScope={allowStudentScope}
              from={from}
              instructors={instructorFilterOptions}
              period={period}
              showScopeSelect={showScopeSelect}
              scope={scope}
              students={studentFilterOptions}
              targetId={targetId}
              to={to}
            />
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0 sm:space-y-4 sm:p-5 sm:pt-0">
            <AttendancePieChart
              completionPercent={completionPercent}
              summary={attendanceSummary}
              total={attendanceScoped.length}
            />
          </CardContent>
        </Card>
        ) : null}

        <Card className={`liquid-glass no-glass-highlight shadow-none ${isPortal ? "" : "xl:col-span-2"}`}>
          <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
            <CardTitle>{isPortal ? "Progress Terbaru" : "Lesson Journal Terbaru"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 p-4 pt-0 sm:gap-3 sm:p-5 sm:pt-0 md:grid-cols-3">
            {latestJournals.length === 0 ? (
              <p className="text-sm text-zinc-500 md:col-span-3">Belum ada journal terkonfirmasi.</p>
            ) : null}
            <LatestJournalList
              items={latestJournalItems}
              storageKey={isPortal ? "overview-journal-read-portal" : "overview-journal-read-admin"}
            />
          </CardContent>
        </Card>
      </section>

    </AppShell>
  );
}

function AttendancePieChart({
  completionPercent,
  summary,
  total,
}: {
  completionPercent: number;
  summary: ReturnType<typeof summarizeAttendance>;
  total: number;
}) {
  const segments = [
    { label: "Hadir", value: summary.present, color: "#10b981" },
    { label: "Absen", value: summary.absent, color: "#f43f5e" },
    { label: "Reschedule", value: summary.rescheduled, color: "#f97316" },
  ];

  return (
    <div className="rounded-[22px] border border-white/45 bg-white/42 p-4">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-500">Progress kehadiran</p>
          <p className="mt-1 text-3xl font-semibold leading-none">{completionPercent}%</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-zinc-500">Total sesi</p>
          <p className="mt-1 text-xl font-semibold leading-none">{total}</p>
        </div>
      </div>

      <div className="space-y-3">
        {segments.map((segment) => {
          const percent = total > 0 ? (segment.value / total) * 100 : 0;

          return (
            <div key={segment.label}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
                  <span className="truncate text-sm font-medium text-zinc-700">{segment.label}</span>
                </span>
                <span className="text-sm font-semibold text-zinc-900">
                  {segment.value}
                  <span className="ml-1 text-xs font-normal text-zinc-500">
                    {Math.round(percent)}%
                  </span>
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/50 shadow-inner">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    backgroundColor: segment.color,
                    width: `${percent}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function summarizeAttendance(attendance: StudentAttendance[]) {
  return {
    present: countStatus(attendance, "Present"),
    absent:
      countStatus(attendance, "Absent") +
      countStatus(attendance, "Late") +
      countStatus(attendance, "Sick") +
      countStatus(attendance, "Permission"),
    rescheduled: countStatus(attendance, "Rescheduled"),
  };
}

function countStatus(attendance: StudentAttendance[], status: string) {
  return attendance.filter((row) => row.status === status).length;
}

function sumInvoices(invoices: Invoice[]) {
  return invoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
}

function studentName(student: Student) {
  return `${student.firstName} ${student.lastName}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function readQueryValue(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? "";
  return "";
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateAtMidnight(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function resolveAttendanceDate(row: StudentAttendance, schedulesById: Map<string, CourseSchedule>) {
  const dateFromSchedule = schedulesById.get(row.courseScheduleId)?.scheduleDate;
  return String(dateFromSchedule || row.date || "");
}

function isAttendanceInRange({
  row,
  schedulesById,
  period,
  from,
  to,
  today,
}: {
  row: StudentAttendance;
  schedulesById: Map<string, CourseSchedule>;
  period: string;
  from: string;
  to: string;
  today: Date;
}) {
  const attendanceDate = parseDateAtMidnight(resolveAttendanceDate(row, schedulesById));
  if (!attendanceDate) return false;

  if (period === "last_30_days") {
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29);
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return attendanceDate >= start && attendanceDate <= end;
  }

  const start = parseDateAtMidnight(from);
  const end = parseDateAtMidnight(to);
  if (!start || !end) return true;
  return attendanceDate >= start && attendanceDate <= end;
}

function parseScope(value: string): "all" | "student" | "instructor" {
  if (value === "student" || value === "instructor") return value;
  return "all";
}

function normalizeScope(
  scope: "all" | "student" | "instructor",
  options: {
    allowAllScope: boolean;
    allowStudentScope: boolean;
    allowInstructorScope: boolean;
  },
) {
  if (scope === "instructor" && !options.allowInstructorScope) {
    return options.allowAllScope ? "all" : "student";
  }
  if (scope === "all" && !options.allowAllScope) {
    return options.allowStudentScope ? "student" : "all";
  }
  if (scope === "student" && !options.allowStudentScope) {
    return options.allowAllScope ? "all" : "student";
  }
  return scope;
}

function isAttendanceInScope({
  row,
  scope,
  targetId,
  schedulesById,
}: {
  row: StudentAttendance;
  scope: "all" | "student" | "instructor";
  targetId: string;
  schedulesById: Map<string, CourseSchedule>;
}) {
  if (scope === "all") return true;
  if (!targetId) return true;
  if (scope === "student") return row.studentId === targetId;
  const schedule = schedulesById.get(row.courseScheduleId);
  return schedule?.instructorId === targetId;
}
