import {
  AlertTriangle,
  Banknote,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  GraduationCap,
  Home,
  MapPin,
  Users,
} from "lucide-react";

import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { readDatabase } from "@/lib/db";
import type {
  CourseSchedule,
  Invoice,
  LessonJournal,
  LessonPackage,
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
  const paidInvoices = invoices.filter((invoice) => invoice.status === "Paid");
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
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card className="liquid-glass" key={metric.label}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-zinc-500">{metric.label}</p>
                  <p className="mt-2 text-3xl font-semibold tracking-normal">{metric.value}</p>
                  <p className="mt-1 text-xs text-zinc-500">{metric.delta}</p>
                </div>
                <div className={`grid size-11 place-items-center rounded-2xl ${metric.tint}`}>
                  <metric.icon className="size-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,.65fr)]">
        <Card className="liquid-glass">
          <CardHeader>
            <CardTitle>{isPortal ? "Jadwal Les Anak" : "Jadwal Les Terdekat"}</CardTitle>
            <p className="mt-1 text-sm text-zinc-500">
              {isPortal
                ? "Sesi studio atau home visit yang terhubung dengan akun ini."
                : "Sesi aktif terdekat dari seluruh jadwal akademik."}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
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
                  className="grid gap-3 rounded-[20px] border border-white/45 bg-white/42 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.65)] sm:grid-cols-[92px_minmax(0,1fr)_auto]"
                  key={item.id}
                >
                  <div>
                    <p className="font-semibold">{item.fromTime}</p>
                    <p className="text-xs text-zinc-500">{item.scheduleDate}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {formatDisplayText(student ? studentName(student) : "Unknown Student")}
                    </p>
                    <p className="truncate text-sm text-zinc-500">{formatDisplayText(course?.courseName)}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-600">
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3.5" />
                        {formatDisplayText(instructor?.instructorName)}
                      </span>
                      <span className="inline-flex min-w-0 items-center gap-1">
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
                    className="self-start justify-self-start px-3 py-1 sm:self-center sm:justify-self-end"
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
          <CardHeader>
            <CardTitle>{isPortal ? "Yang Perlu Dilihat" : "Prioritas Hari Ini"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {actionItems.map((item) => (
              <div className="rounded-[20px] border border-white/45 bg-white/42 p-4" key={item.title}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <AlertTriangle className="size-5 text-zinc-500" />
                  <Badge variant={item.variant}>{isPortal ? "Info" : "Action"}</Badge>
                </div>
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 text-sm text-zinc-500">{item.meta}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="liquid-glass">
          <CardHeader>
            <CardTitle>Rekap Kehadiran</CardTitle>
            <p className="mt-1 text-sm text-zinc-500">
              Present dan late dihitung sebagai sesi berjalan.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[22px] border border-white/45 bg-white/42 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-zinc-500">Progress kehadiran</p>
                  <p className="mt-1 text-2xl font-semibold">{completionPercent}%</p>
                </div>
                <CheckCircle2 className="size-6 text-emerald-600" />
              </div>
              <Progress className="mt-4" value={completionPercent} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <MetricPill label="Present" value={attendanceSummary.present} />
              <MetricPill label="Late" value={attendanceSummary.late} />
              <MetricPill label="Sick" value={attendanceSummary.sick} />
              <MetricPill label="Permission" value={attendanceSummary.permission} />
              <MetricPill label="Absent" value={attendanceSummary.absent} />
              <MetricPill label="Rescheduled" value={attendanceSummary.rescheduled} />
            </div>
          </CardContent>
        </Card>

        <Card className="liquid-glass xl:col-span-2">
          <CardHeader>
            <CardTitle>{isPortal ? "Progress Terbaru" : "Lesson Journal Terbaru"}</CardTitle>
            <p className="mt-1 text-sm text-zinc-500">
              Hanya journal yang sudah confirmed yang masuk ringkasan.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {latestJournals.length === 0 ? (
              <p className="text-sm text-zinc-500 md:col-span-3">Belum ada journal terkonfirmasi.</p>
            ) : null}

            {latestJournals.map((journal) => {
              const student = db.students.find((row) => row.id === journal.studentId);

              return (
                <div className="rounded-[20px] border border-white/45 bg-white/42 p-4" key={journal.id}>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {formatDisplayText(student ? studentName(student) : "Unknown Student")}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">{journal.lessonDate}</p>
                    </div>
                    <Badge variant={statusVariant(journal.progressRating)}>
                      {formatDisplayText(journal.progressRating)}
                    </Badge>
                  </div>
                  <p className="min-h-16 text-sm text-zinc-600">
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

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <Card className="liquid-glass">
          <CardHeader>
            <CardTitle>{isPortal ? "Ringkasan Belajar" : "Ringkasan Operasional"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm text-zinc-600 sm:grid-cols-2">
              {buildSummaryItems({
                activePackages,
                attendance,
                db,
                isPortal,
                schedules,
                visibleJournals,
              }).map((item) => (
                <div className="rounded-2xl border border-white/45 bg-white/42 p-3" key={item}>
                  {item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="liquid-glass">
          <CardHeader>
            <CardTitle>Billing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[22px] border border-white/45 bg-zinc-950 p-5 text-white shadow-xl">
              <p className="text-sm text-white/65">Invoice unpaid</p>
              <p className="mt-2 text-2xl font-semibold">{openInvoices.length}</p>
              <div className="mt-5 flex items-center justify-between gap-3">
                <span className="text-sm text-white/70">Total belum dibayar</span>
                <span className="text-lg font-semibold">{formatCurrency(sumInvoices(openInvoices))}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[20px] border border-white/45 bg-white/42 p-4">
                <Clock3 className="mb-3 size-5 text-amber-600" />
                <p className="text-2xl font-semibold">{openInvoices.length}</p>
                <p className="text-xs text-zinc-500">invoice unpaid</p>
              </div>
              <div className="rounded-[20px] border border-white/45 bg-white/42 p-4">
                <CheckCircle2 className="mb-3 size-5 text-emerald-600" />
                <p className="text-2xl font-semibold">{paidInvoices.length}</p>
                <p className="text-xs text-zinc-500">invoice paid</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/40 bg-white/35 px-3 py-2">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
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

function buildSummaryItems({
  activePackages,
  attendance,
  db,
  isPortal,
  schedules,
  visibleJournals,
}: {
  activePackages: LessonPackage[];
  attendance: StudentAttendance[];
  db: Awaited<ReturnType<typeof readDatabase>>;
  isPortal: boolean;
  schedules: CourseSchedule[];
  visibleJournals: LessonJournal[];
}) {
  if (isPortal) {
    return [
      `${activePackages.length} paket les aktif`,
      `${schedules.filter((schedule) => schedule.lessonMode === "Studio").length} sesi studio`,
      `${schedules.filter((schedule) => schedule.lessonMode === "Home Visit").length} sesi home visit`,
      `${visibleJournals.length} journal bisa dilihat`,
      `${attendance.filter((row) => row.confirmed).length} attendance sudah final`,
      `${attendance.filter((row) => row.status === "Rescheduled").length} sesi rescheduled`,
    ];
  }

  return [
    `${db.instruments.filter((instrument) => instrument.isActive).length} instrumen aktif`,
    `${db.instructors.filter((instructor) => instructor.portalEnabled).length} instructor portal aktif`,
    `${schedules.filter((schedule) => schedule.lessonMode === "Studio").length} jadwal studio`,
    `${schedules.filter((schedule) => schedule.lessonMode === "Home Visit").length} jadwal home visit`,
    `${visibleJournals.length} journal confirmed`,
    `${db.rooms.filter((room) => room.isActive).length} studio room aktif`,
  ];
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
