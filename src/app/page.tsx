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
  WalletCards,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { readDatabase } from "@/lib/db";
import { formatDisplayText } from "@/lib/utils";
import { filterTypedRecordsForSession } from "@/lib/visibility";

export const dynamic = "force-dynamic";

function statusVariant(status: string) {
  if (["Present", "Completed", "Paid", "Active"].includes(status)) return "success";
  if (["Late", "Rescheduled", "Unpaid"].includes(status)) return "warning";
  if (["Absent", "Overdue"].includes(status)) return "danger";
  return "secondary";
}

export default async function HomePage() {
  const session = await auth();
  const db = await readDatabase();
  const scopedSchedules = session
    ? await filterTypedRecordsForSession("schedules", db.schedules, session)
    : db.schedules;
  const scopedJournals = session
    ? await filterTypedRecordsForSession("journals", db.journals, session)
    : db.journals;
  const scopedAttendance = session
    ? await filterTypedRecordsForSession("student-attendance", db["student-attendance"], session)
    : db["student-attendance"];
  const scopedStudents = session
    ? await filterTypedRecordsForSession("students", db.students, session)
    : db.students;
  const scopedInvoices = session
    ? await filterTypedRecordsForSession("invoices", db.invoices, session)
    : db.invoices;
  const schedules = scopedSchedules.slice(0, 3);
  const journals = scopedJournals.slice(0, 3);
  const attendance = scopedAttendance.slice(0, 4);

  const metrics = [
    {
      label: "Murid aktif",
      value: String(scopedStudents.length),
      delta: "portal enabled",
      icon: GraduationCap,
      tint: "bg-sky-100 text-sky-700",
    },
    {
      label: "Sesi terjadwal",
      value: String(scopedSchedules.length),
      delta: "private lessons",
      icon: CalendarDays,
      tint: "bg-emerald-100 text-emerald-700",
    },
    {
      label: "Jurnal visible",
      value: String(scopedJournals.length),
      delta: "untuk portal",
      icon: BookOpenCheck,
      tint: "bg-violet-100 text-violet-700",
    },
    {
      label: "Tagihan terbuka",
      value: String(scopedInvoices.filter((invoice) => invoice.status !== "Paid").length),
      delta: "invoice unpaid/overdue",
      icon: WalletCards,
      tint: "bg-amber-100 text-amber-700",
    },
  ];

  const alerts = [
    {
      title: "Review absensi minggu ini",
      meta: `${scopedAttendance.filter((row) => ["Absent", "Sick", "Permission"].includes(row.status)).length} catatan absen perlu dicek untuk makeup lesson.`,
      variant: "secondary" as const,
    },
    {
      title: "Publish jurnal ke portal",
      meta: `${scopedJournals.filter((journal) => !journal.parentVisible).length} jurnal belum tampil untuk orang tua.`,
      variant: "warning" as const,
    },
    {
      title: "Follow up tagihan",
      meta: `${scopedInvoices.filter((invoice) => invoice.status !== "Paid").length} invoice masih menunggu pembayaran.`,
      variant: "danger" as const,
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
            <CardTitle>Jadwal Les Terdekat</CardTitle>
            <p className="mt-1 text-sm text-zinc-500">
              Studio dan home visit sesuai jadwal akademik aktif.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {schedules.map((item) => {
              const student = db.students.find((row) => row.id === item.studentId);
              const instructor = db.instructors.find((row) => row.id === item.instructorId);
              const course = db.courses.find((row) => row.id === item.courseId);
              const room = db.rooms.find((row) => row.id === item.studioRoomId);

              return (
                <div
                  className="grid gap-3 rounded-[20px] border border-white/45 bg-white/42 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.65)] sm:grid-cols-[86px_minmax(0,1fr)_auto]"
                  key={item.id}
                >
                  <div>
                    <p className="font-semibold">{item.fromTime}</p>
                    <p className="text-xs text-zinc-500">{item.scheduleDate}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {formatDisplayText(`${student?.firstName ?? ""} ${student?.lastName ?? ""}`)}
                    </p>
                    <p className="truncate text-sm text-zinc-500">{formatDisplayText(course?.courseName)}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-600">
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3.5" />
                        {formatDisplayText(instructor?.instructorName)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        {item.lessonMode === "Studio" ? (
                          <MapPin className="size-3.5" />
                        ) : (
                          <Home className="size-3.5" />
                        )}
                        {formatDisplayText(item.lessonMode === "Studio" ? room?.roomName : item.homeVisitAddress)}
                      </span>
                    </div>
                  </div>
                  <Badge variant={statusVariant(item.scheduleStatus)}>
                    {formatDisplayText(item.scheduleStatus)}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="liquid-glass">
          <CardHeader>
          <CardTitle>Priority Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert) => (
              <div className="rounded-[20px] border border-white/45 bg-white/42 p-4" key={alert.title}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <AlertTriangle className="size-5 text-zinc-500" />
                  <Badge variant={alert.variant}>Checklist</Badge>
                </div>
                <p className="font-medium">{alert.title}</p>
                <p className="mt-1 text-sm text-zinc-500">{alert.meta}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="liquid-glass">
          <CardHeader>
            <CardTitle>Absensi Murid</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {attendance.map((item) => {
              const student = db.students.find((row) => row.id === item.studentId);
              const instrument = db.instruments.find((row) => row.id === item.instrumentId);

              return (
                <div className="flex items-center justify-between gap-3" key={item.id}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {formatDisplayText(`${student?.firstName ?? ""} ${student?.lastName ?? ""}`)}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatDisplayText(instrument?.instrumentName)}
                      {item.makeupRequired ? " - makeup required" : ""}
                    </p>
                  </div>
                  <Badge variant={statusVariant(item.status)}>{formatDisplayText(item.status)}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="liquid-glass xl:col-span-2">
          <CardHeader>
            <CardTitle>Lesson Journal & Progress</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {journals.map((journal) => {
              const student = db.students.find((row) => row.id === journal.studentId);

              return (
                <div className="rounded-[20px] border border-white/45 bg-white/42 p-4" key={journal.id}>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="font-medium">
                      {formatDisplayText(`${student?.firstName ?? ""} ${student?.lastName ?? ""}`)}
                    </p>
                    <Badge variant={statusVariant(journal.progressRating)}>
                      {formatDisplayText(journal.progressRating)}
                    </Badge>
                  </div>
                  <p className="min-h-16 text-sm text-zinc-600">
                    {formatDisplayText(journal.materialCovered)}
                  </p>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span>Parent visible</span>
                      <span>{journal.parentVisible ? "Yes" : "No"}</span>
                    </div>
                    <Progress value={journal.parentVisible ? 80 : 35} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <Card className="liquid-glass">
          <CardHeader>
            <CardTitle>Operational Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm text-zinc-600 sm:grid-cols-2">
              {[
                `${db.instruments.filter((instrument) => instrument.isActive).length} instrumen aktif`,
                `${db.instructors.filter((instructor) => instructor.portalEnabled).length} guru portal aktif`,
                `${scopedSchedules.filter((schedule) => schedule.lessonMode === "Studio").length} jadwal studio`,
                `${scopedSchedules.filter((schedule) => schedule.lessonMode === "Home Visit").length} jadwal home visit`,
                `${scopedJournals.filter((journal) => journal.parentVisible).length} jurnal tampil di portal`,
                `${db.rooms.filter((room) => room.isActive).length} studio room aktif`,
              ].map((item) => (
                <div className="rounded-2xl border border-white/45 bg-white/42 p-3" key={item}>
                  {formatDisplayText(item)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="liquid-glass">
          <CardHeader>
            <CardTitle>Billing Manual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[22px] border border-white/45 bg-zinc-950 p-5 text-white shadow-xl">
              <p className="text-sm text-white/65">Open invoices</p>
              <p className="mt-2 text-2xl font-semibold">
                {scopedInvoices.filter((invoice) => invoice.status !== "Paid").length}
              </p>
              <div className="mt-5 flex items-center justify-between gap-3">
                <span className="text-sm text-white/70">Unpaid total</span>
                <span className="text-lg font-semibold">
                  Rp
                  {scopedInvoices
                    .filter((invoice) => invoice.status !== "Paid")
                    .reduce((sum, invoice) => sum + invoice.amount, 0)
                    .toLocaleString("id-ID")}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[20px] border border-white/45 bg-white/42 p-4">
                <Clock3 className="mb-3 size-5 text-amber-600" />
                <p className="text-2xl font-semibold">7</p>
                <p className="text-xs text-zinc-500">hari sebelum due</p>
              </div>
              <div className="rounded-[20px] border border-white/45 bg-white/42 p-4">
                <CheckCircle2 className="mb-3 size-5 text-emerald-600" />
                <p className="text-2xl font-semibold">
                  {scopedInvoices.filter((invoice) => invoice.status === "Paid").length}
                </p>
                <p className="text-xs text-zinc-500">invoice lunas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
