"use client";

import { CalendarCheck, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { studentAttendanceStatusOptions } from "@/lib/options";

type Row = Record<string, unknown> & { id: string };

type SessionRow = {
  schedule: Row;
  attendance: Row | null;
};

type AttendanceGroup = {
  id: string;
  package: Row | null;
  student: Row | null;
  course: Row | null;
  instructor: Row | null;
  sessions: SessionRow[];
};

export function AttendanceBoard() {
  const [packages, setPackages] = useState<Row[]>([]);
  const [students, setStudents] = useState<Row[]>([]);
  const [courses, setCourses] = useState<Row[]>([]);
  const [instructors, setInstructors] = useState<Row[]>([]);
  const [schedules, setSchedules] = useState<Row[]>([]);
  const [attendance, setAttendance] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");

  async function loadData() {
    setLoading(true);

    try {
      const [packageRows, studentRows, courseRows, instructorRows, scheduleRows, attendanceRows] =
        await Promise.all([
          fetchRows("lesson-packages"),
          fetchRows("students"),
          fetchRows("courses"),
          fetchRows("instructors"),
          fetchRows("schedules"),
          fetchRows("student-attendance"),
        ]);

      setPackages(packageRows);
      setStudents(studentRows);
      setCourses(courseRows);
      setInstructors(instructorRows);
      setSchedules(scheduleRows);
      setAttendance(attendanceRows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load attendance");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const groups = useMemo(() => {
    const studentsById = mapById(students);
    const coursesById = mapById(courses);
    const instructorsById = mapById(instructors);
    const attendanceByScheduleId = new Map(
      attendance.map((row) => [String(row.courseScheduleId ?? ""), row]),
    );
    const schedulesByPackage = schedules.reduce<Record<string, Row[]>>((acc, schedule) => {
      const packageId =
        String(schedule.lessonPackageId ?? "") ||
        `${String(schedule.studentId ?? "")}-${String(schedule.scheduleMonth ?? "")}`;

      if (!acc[packageId]) acc[packageId] = [];
      acc[packageId].push(schedule);
      return acc;
    }, {});

    const packageGroups = packages.map((lessonPackage) => {
      const packageSchedules = schedulesByPackage[lessonPackage.id] ?? [];

      return buildGroup({
        id: lessonPackage.id,
        lessonPackage,
        packageSchedules,
        studentsById,
        coursesById,
        instructorsById,
        attendanceByScheduleId,
      });
    });

    const packageIds = new Set(packages.map((lessonPackage) => lessonPackage.id));
    const orphanGroups = Object.entries(schedulesByPackage)
      .filter(([packageId]) => !packageIds.has(packageId))
      .map(([packageId, packageSchedules]) =>
        buildGroup({
          id: packageId,
          lessonPackage: null,
          packageSchedules,
          studentsById,
          coursesById,
          instructorsById,
          attendanceByScheduleId,
        }),
      );

    return [...packageGroups, ...orphanGroups].filter((group) => group.sessions.length > 0);
  }, [attendance, courses, instructors, packages, schedules, students]);

  async function updateAttendance(id: string, payload: Record<string, unknown>) {
    setSavingId(id);

    try {
      const response = await fetch(`/api/student-attendance/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as { data?: Row; error?: string };

      if (!response.ok || !json.data) {
        throw new Error(json.error ?? "Unable to update attendance");
      }

      setAttendance((current) => current.map((row) => (row.id === id ? json.data! : row)));
      toast.success("Attendance updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update attendance");
    } finally {
      setSavingId("");
    }
  }

  async function createMakeupSchedule({
    attendanceRow,
    fromTime,
    makeupDate,
    schedule,
    toTime,
  }: {
    attendanceRow: Row;
    fromTime: string;
    makeupDate: string;
    schedule: Row;
    toTime: string;
  }) {
    if (!makeupDate || !fromTime || !toTime) {
      toast.error("Pilih tanggal dan jam makeup dulu");
      return;
    }

    setSavingId(attendanceRow.id);

    try {
      const response = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: `makeup-${schedule.id}`,
          lessonPackageId: schedule.lessonPackageId,
          courseId: schedule.courseId,
          studentId: schedule.studentId,
          instructorId: schedule.instructorId,
          instrumentId: schedule.instrumentId,
          scheduleMonth: schedule.scheduleMonth,
          lessonStartDate: "",
          lessonDays: [],
          lessonCount: 1,
          scheduleDate: makeupDate,
          fromTime,
          toTime,
          lessonMode: schedule.lessonMode,
          studioRoomId: schedule.studioRoomId,
          homeVisitAddress: schedule.homeVisitAddress,
          travelNotes: schedule.travelNotes,
          scheduleStatus: "Scheduled",
          originalScheduleId: schedule.id,
          rescheduleReason: `Makeup for ${String(schedule.scheduleDate ?? "")}`,
        }),
      });
      const json = (await response.json()) as { data?: Row; error?: string };

      if (!response.ok || !json.data) {
        throw new Error(json.error ?? "Unable to create makeup schedule");
      }

      await updateAttendance(attendanceRow.id, {
        ...attendanceRow,
        makeupRequired: true,
        makeupScheduleId: json.data.id,
      });
      await loadData();
      toast.success("Makeup schedule created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create makeup schedule");
    } finally {
      setSavingId("");
    }
  }

  return (
    <div className="space-y-4">
      <Card className="liquid-glass">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-zinc-500">Academic workflow</p>
            <CardTitle className="mt-1 flex items-center gap-2 text-2xl">
              <CalendarCheck className="size-6" />
              Attendance
            </CardTitle>
            <p className="mt-2 text-sm text-zinc-500">
              Absensi digroup per paket les. Setiap murid tampil satu baris, detail sesi ada di kanan.
            </p>
          </div>
          <Button onClick={loadData} size="icon" variant="glass" aria-label="Refresh">
            <RefreshCw className="size-4" />
          </Button>
        </CardHeader>
      </Card>

      <div className="space-y-3">
        {loading ? (
          <Card className="liquid-glass">
            <CardContent className="p-5 text-sm text-zinc-500">Loading attendance...</CardContent>
          </Card>
        ) : null}

        {!loading && groups.length === 0 ? (
          <Card className="liquid-glass">
            <CardContent className="p-5 text-sm text-zinc-500">
              Belum ada attendance. Buat Lesson Package dulu supaya schedules dan attendance otomatis muncul.
            </CardContent>
          </Card>
        ) : null}

        {groups.map((group) => (
          <Card className="liquid-glass" key={group.id}>
            <CardContent className="grid gap-4 p-4 xl:grid-cols-[280px_minmax(0,1fr)]">
              <div className="space-y-3">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-950">
                    {studentName(group.student)}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">{stringField(group.course, "courseName")}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500">
                  <Info label="Instructor" value={stringField(group.instructor, "instructorName")} />
                  <Info label="Period" value={stringField(group.package, "billingPeriod")} />
                  <Info label="Start" value={stringField(group.package, "lessonStartDate")} />
                  <Info
                    label="Progress"
                    value={`${completedCount(group.sessions)}/${group.sessions.length} done`}
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
                {group.sessions.map(({ schedule, attendance: attendanceRow }, index) => (
                  <SessionCard
                    attendance={attendanceRow}
                    disabled={savingId === attendanceRow?.id}
                    key={String(schedule.id)}
                    onCreateMakeupSchedule={createMakeupSchedule}
                    onUpdate={updateAttendance}
                    schedule={schedule}
                    sessionNumber={index + 1}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SessionCard({
  attendance,
  disabled,
  onUpdate,
  onCreateMakeupSchedule,
  schedule,
  sessionNumber,
}: {
  attendance: Row | null;
  disabled: boolean;
  onCreateMakeupSchedule: (payload: {
    attendanceRow: Row;
    fromTime: string;
    makeupDate: string;
    schedule: Row;
    toTime: string;
  }) => Promise<void>;
  onUpdate: (id: string, payload: Record<string, unknown>) => Promise<void>;
  schedule: Row;
  sessionNumber: number;
}) {
  const status = String(attendance?.status ?? "Pending");
  const needsReason = status !== "Present" && status !== "Pending";
  const [makeupDate, setMakeupDate] = useState("");
  const [makeupFromTime, setMakeupFromTime] = useState(String(schedule.fromTime ?? ""));
  const [makeupToTime, setMakeupToTime] = useState(String(schedule.toTime ?? ""));

  return (
    <div className="rounded-2xl border border-white/45 bg-white/42 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase text-zinc-500">Session {sessionNumber}</p>
          <p className="mt-1 font-semibold text-zinc-950">{String(schedule.scheduleDate ?? "-")}</p>
          <p className="text-xs text-zinc-500">
            {String(schedule.fromTime ?? "-")} - {String(schedule.toTime ?? "-")}
          </p>
        </div>
        <Badge variant={statusVariant(status)}>{status}</Badge>
      </div>

      {attendance ? (
        <div className="mt-3 space-y-2">
          <select
            className="h-10 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl"
            disabled={disabled}
            onChange={(event) => {
              const nextStatus = event.target.value;
              void onUpdate(attendance.id, {
                ...attendance,
                status: nextStatus,
                absenceReason:
                  nextStatus === "Present" || nextStatus === "Pending"
                    ? ""
                    : attendance.absenceReason,
                makeupRequired:
                  nextStatus === "Present" || nextStatus === "Pending"
                    ? false
                    : attendance.makeupRequired,
              });
            }}
            value={status}
          >
            {studentAttendanceStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {needsReason ? (
            <>
              <input
                className="h-10 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl"
                disabled={disabled}
                onBlur={(event) =>
                  void onUpdate(attendance.id, {
                    ...attendance,
                    absenceReason: event.target.value,
                  })
                }
                placeholder="Absence reason"
                defaultValue={String(attendance.absenceReason ?? "")}
              />
              <label className="flex items-center gap-2 text-xs text-zinc-600">
                <input
                  checked={Boolean(attendance.makeupRequired)}
                  className="size-4 accent-zinc-950"
                  disabled={disabled}
                  onChange={(event) =>
                    void onUpdate(attendance.id, {
                      ...attendance,
                      makeupRequired: event.target.checked,
                    })
                  }
                  type="checkbox"
                />
                Makeup required
              </label>
              {attendance.makeupScheduleId ? (
                <div className="rounded-2xl border border-white/40 bg-white/36 px-3 py-2 text-xs text-zinc-600">
                  Makeup linked: {String(attendance.makeupScheduleId)}
                </div>
              ) : (
                <div className="grid gap-2">
                  <input
                    className="h-10 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl"
                    disabled={disabled}
                    onChange={(event) => setMakeupDate(event.target.value)}
                    type="date"
                    value={makeupDate}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="h-10 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl"
                      disabled={disabled}
                      onChange={(event) => setMakeupFromTime(event.target.value)}
                      type="time"
                      value={makeupFromTime}
                    />
                    <input
                      className="h-10 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl"
                      disabled={disabled}
                      onChange={(event) => setMakeupToTime(event.target.value)}
                      type="time"
                      value={makeupToTime}
                    />
                  </div>
                  <Button
                    disabled={disabled}
                    onClick={() =>
                      void onCreateMakeupSchedule({
                        attendanceRow: attendance,
                        fromTime: makeupFromTime,
                        makeupDate,
                        schedule,
                        toTime: makeupToTime,
                      })
                    }
                    size="sm"
                    type="button"
                    variant="glass"
                  >
                    Add makeup session
                  </Button>
                </div>
              )}
            </>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-xs text-zinc-500">Attendance record belum tersedia.</p>
      )}
    </div>
  );
}

async function fetchRows(resource: string) {
  const response = await fetch(`/api/${resource}`, { cache: "no-store" });
  const json = (await response.json()) as { data?: Row[]; error?: string };

  if (!response.ok) {
    throw new Error(json.error ?? `Unable to load ${resource}`);
  }

  return Array.isArray(json.data) ? json.data : [];
}

function buildGroup({
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

  return {
    id,
    package: lessonPackage,
    student: studentsById.get(studentId) ?? null,
    course: coursesById.get(courseId) ?? null,
    instructor: instructorsById.get(instructorId) ?? null,
    sessions: [...packageSchedules]
      .sort((left, right) => String(left.scheduleDate ?? "").localeCompare(String(right.scheduleDate ?? "")))
      .map((schedule) => ({
        schedule,
        attendance: attendanceByScheduleId.get(schedule.id) ?? null,
      })),
  };
}

function mapById(rows: Row[]) {
  return new Map(rows.map((row) => [row.id, row]));
}

function stringField(row: Row | null, key: string) {
  return String(row?.[key] ?? "-");
}

function studentName(student: Row | null) {
  if (!student) return "Unknown student";
  return `${String(student.firstName ?? "")} ${String(student.lastName ?? "")}`.trim();
}

function completedCount(sessions: SessionRow[]) {
  return sessions.filter(({ attendance }) => attendance?.status === "Present").length;
}

function statusVariant(status: string) {
  if (status === "Present") return "success";
  if (status === "Pending") return "outline";
  if (status === "Late" || status === "Permission") return "warning";
  return "danger";
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/40 bg-white/36 px-3 py-2">
      <p className="uppercase tracking-[0.08em] text-zinc-400">{label}</p>
      <p className="mt-1 font-medium text-zinc-800">{value || "-"}</p>
    </div>
  );
}
