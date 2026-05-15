import {
  Banknote,
  BookOpenCheck,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Users,
} from "lucide-react";

import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readDatabase } from "@/lib/db";
import type { CourseSchedule, Invoice, LessonJournal, Student, StudentAttendance } from "@/lib/models";
import { sessionRole } from "@/lib/session";
import { formatDisplayText } from "@/lib/utils";
import { filterTypedRecordsForSession } from "@/lib/visibility";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await auth();
  const role = session ? sessionRole(session) : "";
  const isPortal = role === "Parent Portal User" || role === "Student Portal User";
  const db = await readDatabase();
  const students = session
    ? await filterTypedRecordsForSession("students", db.students, session)
    : db.students;
  const schedules = session
    ? await filterTypedRecordsForSession("schedules", db.schedules, session)
    : db.schedules;
  const attendance = session
    ? await filterTypedRecordsForSession("student-attendance", db["student-attendance"], session)
    : db["student-attendance"];
  const journals = session
    ? await filterTypedRecordsForSession("journals", db.journals, session)
    : db.journals;
  const invoices = session
    ? await filterTypedRecordsForSession("invoices", db.invoices, session)
    : db.invoices;

  const confirmedJournals = journals.filter((journal) => journal.confirmed);
  const visibleJournals = isPortal
    ? confirmedJournals.filter((journal) => journal.parentVisible)
    : confirmedJournals;
  const paidInvoices = invoices.filter((invoice) => invoice.status === "Paid");
  const unpaidInvoices = invoices.filter((invoice) => invoice.status !== "Paid");
  const attendanceSummary = summarizeAttendance(attendance);
  const upcomingSchedules = schedules
    .filter((schedule) => schedule.scheduleStatus !== "Cancelled")
    .sort((left, right) => String(left.scheduleDate).localeCompare(String(right.scheduleDate)))
    .slice(0, 6);

  const reportCards = [
    {
      label: isPortal ? "Murid terhubung" : "Murid dalam laporan",
      value: String(students.length),
      description: isPortal ? "data anak yang bisa dilihat akun ini" : "student yang masuk cakupan laporan",
      icon: GraduationCap,
    },
    {
      label: "Kehadiran hadir",
      value: String(attendanceSummary.present),
      description: `${attendanceSummary.absentLike} absen/izin/sakit`,
      icon: BookOpenCheck,
    },
    {
      label: "Jurnal terkonfirmasi",
      value: String(visibleJournals.length),
      description: isPortal ? "journal visible untuk parent/student" : "journal yang sudah final",
      icon: ClipboardList,
    },
    {
      label: "Tagihan belum dibayar",
      value: formatCurrency(sumInvoices(unpaidInvoices)),
      description: `${paidInvoices.length} invoice sudah paid`,
      icon: Banknote,
    },
  ];

  return (
    <AppShell>
      <div className="space-y-4">
        <Card className="liquid-glass">
          <CardHeader>
            <CardTitle>Reports</CardTitle>
            <p className="mt-1 text-sm text-zinc-500">
              {isPortal
                ? "Ringkasan belajar, jadwal, jurnal, kehadiran, dan tagihan untuk student yang terhubung dengan akun ini."
                : "Ringkasan akademik, operasional, dan billing berdasarkan data aktif di dashboard."}
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {reportCards.map((item) => (
              <div className="rounded-[20px] border border-white/45 bg-white/42 p-4" key={item.label}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-zinc-500">{item.label}</p>
                    <p className="mt-2 text-2xl font-semibold">{item.value}</p>
                    <p className="mt-1 text-xs text-zinc-500">{item.description}</p>
                  </div>
                  <div className="grid size-10 place-items-center rounded-2xl bg-white/55 text-zinc-700">
                    <item.icon className="size-5" />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card className="liquid-glass">
            <CardHeader>
              <CardTitle>{isPortal ? "Ringkasan Anak" : "Ringkasan Student"}</CardTitle>
              <p className="mt-1 text-sm text-zinc-500">
                Kehadiran, progress journal, dan status billing per student.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {students.length === 0 ? (
                <p className="text-sm text-zinc-500">Belum ada student yang terhubung ke akun ini.</p>
              ) : null}

              {students.map((student) => {
                const studentAttendance = attendance.filter((row) => row.studentId === student.id);
                const studentJournals = visibleJournals.filter((journal) => journal.studentId === student.id);
                const studentInvoices = invoices.filter((invoice) => invoice.studentId === student.id);
                const unpaidTotal = sumInvoices(studentInvoices.filter((invoice) => invoice.status !== "Paid"));
                const latestJournal = studentJournals
                  .slice()
                  .sort((left, right) => String(right.lessonDate).localeCompare(String(left.lessonDate)))[0];

                return (
                  <div
                    className="rounded-[20px] border border-white/45 bg-white/42 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.65)]"
                    key={student.id}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-semibold">{studentName(student)}</p>
                        <p className="mt-1 text-sm text-zinc-500">
                          Level {formatDisplayText(student.skillLevel)} · {studentJournals.length} jurnal
                        </p>
                      </div>
                      <Badge variant={unpaidTotal > 0 ? "warning" : "success"}>
                        {unpaidTotal > 0 ? `Unpaid ${formatCurrency(unpaidTotal)}` : "Billing clear"}
                      </Badge>
                    </div>

                    <div className="mt-4 grid gap-2 text-sm sm:grid-cols-4">
                      <MetricPill label="Present" value={countStatus(studentAttendance, "Present")} />
                      <MetricPill label="Sick" value={countStatus(studentAttendance, "Sick")} />
                      <MetricPill label="Permission" value={countStatus(studentAttendance, "Permission")} />
                      <MetricPill label="Absent" value={countStatus(studentAttendance, "Absent")} />
                    </div>

                    {latestJournal ? (
                      <div className="mt-4 rounded-2xl border border-white/45 bg-white/35 p-3">
                        <p className="text-xs font-medium uppercase text-zinc-500">Journal terakhir</p>
                        <p className="mt-1 font-medium">
                          {formatDisplayText(latestJournal.materialCovered) || "Belum ada materi"}
                        </p>
                        <p className="mt-1 text-sm text-zinc-500">
                          {latestJournal.lessonDate} · Progress {formatDisplayText(latestJournal.progressRating)}
                        </p>
                        {latestJournal.homework ? (
                          <p className="mt-2 text-sm text-zinc-600">
                            Homework: {formatDisplayText(latestJournal.homework)}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="liquid-glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="size-5" />
                  Jadwal Terdekat
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingSchedules.length === 0 ? (
                  <p className="text-sm text-zinc-500">Belum ada jadwal aktif.</p>
                ) : null}
                {upcomingSchedules.map((schedule) => (
                  <ScheduleLine
                    key={schedule.id}
                    schedule={schedule}
                    student={db.students.find((student) => student.id === schedule.studentId)}
                  />
                ))}
              </CardContent>
            </Card>

            <Card className="liquid-glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="size-5" />
                  Rekap Kehadiran
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                <MetricPill label="Pending" value={attendanceSummary.pending} />
                <MetricPill label="Present" value={attendanceSummary.present} />
                <MetricPill label="Late" value={attendanceSummary.late} />
                <MetricPill label="Rescheduled" value={attendanceSummary.rescheduled} />
                <MetricPill label="Sick" value={attendanceSummary.sick} />
                <MetricPill label="Permission" value={attendanceSummary.permission} />
                <MetricPill label="Absent" value={attendanceSummary.absent} />
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function ScheduleLine({
  schedule,
  student,
}: {
  schedule: CourseSchedule;
  student?: Student;
}) {
  return (
    <div className="rounded-2xl border border-white/45 bg-white/38 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{student ? studentName(student) : "Unknown Student"}</p>
          <p className="mt-1 text-sm text-zinc-500">
            {schedule.scheduleDate} · {schedule.fromTime} - {schedule.toTime}
          </p>
        </div>
        <Badge variant={schedule.scheduleStatus === "Scheduled" ? "secondary" : "warning"}>
          {formatDisplayText(schedule.scheduleStatus)}
        </Badge>
      </div>
    </div>
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
    pending: countStatus(attendance, "Pending"),
    present: countStatus(attendance, "Present"),
    late: countStatus(attendance, "Late"),
    rescheduled: countStatus(attendance, "Rescheduled"),
    sick: countStatus(attendance, "Sick"),
    permission: countStatus(attendance, "Permission"),
    absent: countStatus(attendance, "Absent"),
    absentLike: attendance.filter((row) => ["Absent", "Sick", "Permission"].includes(row.status)).length,
  };
}

function countStatus(attendance: StudentAttendance[], status: string) {
  return attendance.filter((row) => row.status === status).length;
}

function sumInvoices(invoices: Invoice[]) {
  return invoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
}

function studentName(student: Student) {
  return formatDisplayText(`${student.firstName} ${student.lastName}`);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
