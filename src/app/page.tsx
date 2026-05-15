import {
  AlertTriangle,
  Banknote,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  Home,
  MapPin,
  Users,
} from "lucide-react";

import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
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

function statusVariant(status: string) {
  if (["Present", "Completed", "Paid", "Active", "Good", "Excellent"].includes(status)) return "success";
  if (["Late", "Rescheduled", "Unpaid", "Improving"].includes(status)) return "warning";
  if (["Absent", "Sick", "Permission", "Cancelled", "Needs Work"].includes(status)) return "danger";
  return "secondary";
}

export default async function HomePage() {
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
  const journals = session
    ? await filterTypedRecordsForSession("journals", db.journals, session)
    : db.journals;
  const attendance = session
    ? await filterTypedRecordsForSession("student-attendance", db["student-attendance"], session)
    : db["student-attendance"];
  const invoices = session
    ? await filterTypedRecordsForSession("invoices", db.invoices, session)
    : db.invoices;

  const confirmedJournals = journals.filter((journal) => journal.confirmed);
  const visibleJournals = isPortal
    ? confirmedJournals.filter((journal) => journal.parentVisible)
    : confirmedJournals;
  const activePackages = lessonPackages.filter((lessonPackage) => lessonPackage.status === "Active");
  const openInvoices = invoices.filter((invoice) => invoice.status !== "Paid");
  const attendanceSummary = summarizeAttendance(attendance);
  const completionPercent = attendance.length
    ? Math.round(((attendanceSummary.present + attendanceSummary.late) / attendance.length) * 100)
    : 0;
  const upcomingSchedules = schedules
    .filter((schedule) => schedule.scheduleStatus !== "Cancelled")
    .sort((left, right) =>
      `${left.scheduleDate} ${left.fromTime}`.localeCompare(`${right.scheduleDate} ${right.fromTime}`),
    )
    .slice(0, 4);
  const latestJournals = visibleJournals
    .slice()
    .sort((left, right) => String(right.lessonDate).localeCompare(String(left.lessonDate)))
    .slice(0, 3);

  const metrics = [
    {
      label: isPortal ? "Murid terhubung" : "Murid aktif",
      value: String(students.length),
      delta: isPortal ? "sesuai akun portal" : `${activePackages.length} paket aktif`,
      icon: GraduationCap,
      tint: "bg-sky-100 text-sky-700",
    },
    {
      label: "Jadwal aktif",
      value: String(upcomingSchedules.length),
      delta: `${schedules.length} total sesi`,
      icon: CalendarDays,
      tint: "bg-emerald-100 text-emerald-700",
    },
    {
      label: "Jurnal final",
      value: String(visibleJournals.length),
      delta: isPortal ? "visible untuk portal" : "sudah confirmed",
      icon: BookOpenCheck,
      tint: "bg-violet-100 text-violet-700",
    },
    {
      label: "Tagihan unpaid",
      value: String(openInvoices.length),
      delta: formatCurrency(sumInvoices(openInvoices)),
      icon: Banknote,
      tint: "bg-amber-100 text-amber-700",
    },
  ];

  const actionItems = isPortal
    ? [
        {
          title: "Cek jadwal berikutnya",
          meta: upcomingSchedules[0]
            ? `${upcomingSchedules[0].scheduleDate}, ${upcomingSchedules[0].fromTime} - ${upcomingSchedules[0].toTime}`
            : "Belum ada jadwal aktif.",
          variant: "secondary" as const,
        },
        {
          title: "Lihat progress terbaru",
          meta: latestJournals[0]?.materialCovered
            ? formatDisplayText(latestJournals[0].materialCovered)
            : "Belum ada journal terkonfirmasi.",
          variant: "warning" as const,
        },
        {
          title: "Status pembayaran",
          meta: openInvoices.length
            ? `${openInvoices.length} invoice belum dibayar senilai ${formatCurrency(sumInvoices(openInvoices))}.`
            : "Semua invoice yang terlihat sudah paid.",
          variant: openInvoices.length ? ("danger" as const) : ("success" as const),
        },
      ]
    : [
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
        {
          title: "Follow up billing",
          meta: `${openInvoices.length} invoice masih unpaid senilai ${formatCurrency(sumInvoices(openInvoices))}.`,
          variant: openInvoices.length ? ("danger" as const) : ("success" as const),
        },
      ];

  return (
    <AppShell>
      <section className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card className="liquid-glass" key={metric.label}>
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
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,.65fr)]">
        <Card className="liquid-glass">
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

            {upcomingSchedules.map((item) => {
              const student = db.students.find((row) => row.id === item.studentId);
              const instructor = db.instructors.find((row) => row.id === item.instructorId);
              const course = db.courses.find((row) => row.id === item.courseId);
              const room = db.rooms.find((row) => row.id === item.studioRoomId);

              return (
                <div
                  className="grid gap-2 rounded-[20px] border border-white/45 bg-white/42 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.65)] sm:grid-cols-[92px_minmax(0,1fr)_auto] sm:gap-3"
                  key={item.id}
                >
                  <div className="flex items-start justify-between gap-3 sm:block">
                    <div>
                      <p className="font-semibold">{item.fromTime}</p>
                      <p className="text-xs text-zinc-500">{item.scheduleDate}</p>
                    </div>
                    <Badge
                      className="px-2.5 py-0.5 sm:hidden"
                      variant={statusVariant(item.scheduleStatus)}
                    >
                      {formatDisplayText(item.scheduleStatus)}
                    </Badge>
                  </div>
                  <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(112px,.72fr)] gap-3 sm:block">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {formatDisplayText(student ? studentName(student) : "Unknown Student")}
                      </p>
                      <p className="truncate text-sm text-zinc-500">{formatDisplayText(course?.courseName)}</p>
                    </div>
                    <div className="min-w-0 space-y-1 text-xs text-zinc-600 sm:mt-2 sm:flex sm:flex-wrap sm:gap-2 sm:space-y-0">
                      <span className="flex max-w-full items-center gap-1">
                        <Users className="size-3.5 shrink-0" />
                        <span className="truncate">{formatDisplayText(instructor?.instructorName)}</span>
                      </span>
                      <span className="flex max-w-full min-w-0 items-center gap-1">
                        {item.lessonMode === "Studio" ? (
                          <MapPin className="size-3.5 shrink-0" />
                        ) : (
                          <Home className="size-3.5 shrink-0" />
                        )}
                        <span className="truncate">
                          {formatDisplayText(item.lessonMode === "Studio" ? room?.roomName : item.homeVisitAddress)}
                        </span>
                      </span>
                    </div>
                  </div>
                  <Badge
                    className="hidden self-start justify-self-start px-3 py-1 sm:inline-flex sm:self-center sm:justify-self-end"
                    variant={statusVariant(item.scheduleStatus)}
                  >
                    {formatDisplayText(item.scheduleStatus)}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="liquid-glass">
          <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
            <CardTitle>{isPortal ? "Yang Perlu Dilihat" : "Prioritas Hari Ini"}</CardTitle>
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
                      <Badge variant={item.variant}>{isPortal ? "Info" : "Action"}</Badge>
                    </div>
                    <div className="flex items-start justify-between gap-2 sm:block">
                      <p className="font-medium">{item.title}</p>
                      <Badge className="shrink-0 sm:hidden" variant={item.variant}>
                        {isPortal ? "Info" : "Action"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">{item.meta}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="liquid-glass">
          <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
            <CardTitle>Rekap Kehadiran</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0 sm:space-y-4 sm:p-5 sm:pt-0">
            <AttendancePieChart
              completionPercent={completionPercent}
              summary={attendanceSummary}
              total={attendance.length}
            />
          </CardContent>
        </Card>

        <Card className="liquid-glass xl:col-span-2">
          <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
            <CardTitle>{isPortal ? "Progress Terbaru" : "Lesson Journal Terbaru"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 p-4 pt-0 sm:gap-3 sm:p-5 sm:pt-0 md:grid-cols-3">
            {latestJournals.length === 0 ? (
              <p className="text-sm text-zinc-500 md:col-span-3">Belum ada journal terkonfirmasi.</p>
            ) : null}

            {latestJournals.map((journal) => {
              const student = db.students.find((row) => row.id === journal.studentId);

              return (
                <div className="rounded-[20px] border border-white/45 bg-white/42 p-3 sm:p-4" key={journal.id}>
                  <div className="mb-3 flex items-start justify-between gap-3 sm:mb-4">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {formatDisplayText(student ? studentName(student) : "Unknown Student")}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">{journal.lessonDate}</p>
                    </div>
                    <Badge className="shrink-0" variant={statusVariant(journal.progressRating)}>
                      {formatDisplayText(journal.progressRating)}
                    </Badge>
                  </div>
                  <p className="text-sm text-zinc-600 sm:min-h-16">
                    {formatDisplayText(journal.materialCovered) || "Materi belum diisi"}
                  </p>
                  {journal.homework ? (
                    <p className="mt-3 text-xs text-zinc-500">
                      Homework: {formatDisplayText(journal.homework)}
                    </p>
                  ) : null}
                </div>
              );
            })}
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
    { label: "Terlambat", value: summary.late, color: "#0ea5e9" },
    { label: "Sakit", value: summary.sick, color: "#f59e0b" },
    { label: "Izin", value: summary.permission, color: "#8b5cf6" },
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
    late: countStatus(attendance, "Late"),
    sick: countStatus(attendance, "Sick"),
    permission: countStatus(attendance, "Permission"),
    absent: countStatus(attendance, "Absent"),
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
