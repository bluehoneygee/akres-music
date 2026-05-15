"use client";

import { CalendarCheck, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  instructorAttendanceStatusOptions,
  studentAttendanceStatusOptions,
} from "@/lib/options";
import { formatDisplayText } from "@/lib/utils";

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

type CombinedAttendanceGroup = {
  id: string;
  groups: AttendanceGroup[];
  student: Row | null;
  course: Row | null;
};

export function AttendanceBoard() {
  const [packages, setPackages] = useState<Row[]>([]);
  const [students, setStudents] = useState<Row[]>([]);
  const [courses, setCourses] = useState<Row[]>([]);
  const [instructors, setInstructors] = useState<Row[]>([]);
  const [schedules, setSchedules] = useState<Row[]>([]);
  const [attendance, setAttendance] = useState<Row[]>([]);
  const [instructorAttendance, setInstructorAttendance] = useState<Row[]>([]);
  const [activeTab, setActiveTab] = useState<"students" | "instructors">("students");
  const [selectedPackageByGroup, setSelectedPackageByGroup] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const schedulesById = useMemo(() => mapById(schedules), [schedules]);

  async function loadData() {
    setLoading(true);

    try {
      const [
        packageRows,
        studentRows,
        courseRows,
        instructorRows,
        scheduleRows,
        attendanceRows,
        instructorAttendanceRows,
      ] = await Promise.all([
          fetchRows("lesson-packages"),
          fetchRows("students"),
          fetchRows("courses"),
          fetchRows("instructors"),
          fetchRows("schedules"),
          fetchRows("student-attendance"),
          fetchRows("instructor-attendance"),
        ]);

      setPackages(packageRows);
      setStudents(studentRows);
      setCourses(courseRows);
      setInstructors(instructorRows);
      setSchedules(scheduleRows);
      setAttendance(attendanceRows);
      setInstructorAttendance(instructorAttendanceRows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load attendance");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const studentPackageGroups = useMemo(() => {
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

  const instructorPackageGroups = useMemo(() => {
    const studentsById = mapById(students);
    const coursesById = mapById(courses);
    const instructorsById = mapById(instructors);
    const attendanceByScheduleId = new Map(
      instructorAttendance.map((row) => [String(row.courseScheduleId ?? ""), row]),
    );
    const schedulesByPackage = schedules.reduce<Record<string, Row[]>>((acc, schedule) => {
      const packageId =
        String(schedule.lessonPackageId ?? "") ||
        `${String(schedule.studentId ?? "")}-${String(schedule.scheduleMonth ?? "")}`;

      if (!acc[packageId]) acc[packageId] = [];
      acc[packageId].push(schedule);
      return acc;
    }, {});

    const packageGroups = packages.map((lessonPackage) =>
      buildGroup({
        id: lessonPackage.id,
        lessonPackage,
        packageSchedules: schedulesByPackage[lessonPackage.id] ?? [],
        studentsById,
        coursesById,
        instructorsById,
        attendanceByScheduleId,
      }),
    );
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
  }, [courses, instructorAttendance, instructors, packages, schedules, students]);

  const studentGroups = useMemo(
    () => combineAttendanceGroups(studentPackageGroups),
    [studentPackageGroups],
  );
  const instructorGroups = useMemo(
    () => combineAttendanceGroups(instructorPackageGroups),
    [instructorPackageGroups],
  );

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
      if ("status" in payload || "makeupScheduleId" in payload || "makeupRequired" in payload) {
        await loadData();
      }
      toast.success("Attendance updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update attendance");
    } finally {
      setSavingId("");
    }
  }

  async function updateInstructorAttendance(id: string, payload: Record<string, unknown>) {
    setSavingId(id);

    try {
      const response = await fetch(`/api/instructor-attendance/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as { data?: Row; error?: string };

      if (!response.ok || !json.data) {
        throw new Error(json.error ?? "Unable to update instructor attendance");
      }

      setInstructorAttendance((current) => current.map((row) => (row.id === id ? json.data! : row)));
      if ("confirmed" in payload || "status" in payload) {
        await loadData();
      }
      toast.success("Instructor attendance updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update instructor attendance");
    } finally {
      setSavingId("");
    }
  }

  async function createRescheduleSession({
    attendanceRow,
    fromTime,
    rescheduleDate,
    toTime,
  }: {
    attendanceRow: Row;
    fromTime: string;
    rescheduleDate: string;
    toTime: string;
  }) {
    if (!rescheduleDate || !fromTime || !toTime) {
      toast.error("Pilih tanggal dan jam reschedule dulu");
      return;
    }

    setSavingId(attendanceRow.id);

    try {
      await updateAttendance(attendanceRow.id, {
        ...attendanceRow,
        makeupRequired: true,
        pendingRescheduleDate: rescheduleDate,
        pendingRescheduleFromTime: fromTime,
        pendingRescheduleToTime: toTime,
      });
      await loadData();
      toast.success("Draft reschedule saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save draft reschedule");
    } finally {
      setSavingId("");
    }
  }

  async function createInstructorRescheduleSession({
    attendanceRow,
    fromTime,
    rescheduleDate,
    toTime,
  }: {
    attendanceRow: Row;
    fromTime: string;
    rescheduleDate: string;
    toTime: string;
  }) {
    if (!rescheduleDate || !fromTime || !toTime) {
      toast.error("Pilih tanggal dan jam reschedule dulu");
      return;
    }

    setSavingId(attendanceRow.id);

    try {
      await updateInstructorAttendance(attendanceRow.id, {
        ...attendanceRow,
        rescheduleRequired: true,
        pendingRescheduleDate: rescheduleDate,
        pendingRescheduleFromTime: fromTime,
        pendingRescheduleToTime: toTime,
      });
      await loadData();
      toast.success("Draft instructor reschedule saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save draft reschedule");
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
          </div>
          <Button onClick={loadData} size="icon" variant="glass" aria-label="Refresh">
            <RefreshCw className="size-4" />
          </Button>
        </CardHeader>
      </Card>

      <div className="flex w-fit rounded-full border border-white/40 bg-white/40 p-1 backdrop-blur-xl">
        <Button
          onClick={() => setActiveTab("students")}
          size="sm"
          type="button"
          variant={activeTab === "students" ? "default" : "ghost"}
        >
          Students
        </Button>
        <Button
          onClick={() => setActiveTab("instructors")}
          size="sm"
          type="button"
          variant={activeTab === "instructors" ? "default" : "ghost"}
        >
          Instructors
        </Button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <Card className="liquid-glass">
            <CardContent className="p-5 text-sm text-zinc-500">Loading attendance...</CardContent>
          </Card>
        ) : null}

        {!loading && (activeTab === "students" ? studentGroups : instructorGroups).length === 0 ? (
          <Card className="liquid-glass">
            <CardContent className="p-5 text-sm text-zinc-500">
              Belum ada attendance. Buat Lesson Package dulu supaya schedules dan attendance otomatis muncul.
            </CardContent>
          </Card>
        ) : null}

        {activeTab === "students" ? studentGroups.map((combinedGroup) => {
          const group = selectedAttendanceGroup(
            combinedGroup,
            selectedPackageByGroup[combinedGroup.id],
          );

          return (
          <Card className="liquid-glass" key={combinedGroup.id}>
            <CardContent className="grid gap-4 p-4 xl:grid-cols-[280px_minmax(0,1fr)]">
              <div className="space-y-3">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-950">
                    {studentName(combinedGroup.student)}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    {stringField(combinedGroup.course, "courseName")}
                  </p>
                </div>
                {combinedGroup.groups.length > 1 ? (
                  <select
                    className="h-10 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl"
                    onChange={(event) =>
                      setSelectedPackageByGroup((current) => ({
                        ...current,
                        [combinedGroup.id]: event.target.value,
                      }))
                    }
                    value={group.id}
                  >
                    {combinedGroup.groups.map((packageGroup) => (
                      <option key={packageGroup.id} value={packageGroup.id}>
                        {packageLabel(packageGroup)}
                      </option>
                    ))}
                  </select>
                ) : null}
                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500">
                  <Info label="Instructor" value={stringField(group.instructor, "instructorName")} />
                  <Info label="Period" value={stringField(group.package, "billingPeriod")} />
                  <Info label="Start" value={stringField(group.package, "lessonStartDate")} />
                  <Info
                    label="Progress"
                    value={studentProgressLabel(group.sessions)}
                  />
                </div>
              </div>

              <SessionRail>
                {group.sessions.map(({ schedule, attendance: attendanceRow }, index) => (
                  <SessionCard
                    attendance={attendanceRow}
                    disabled={savingId === attendanceRow?.id}
                    key={String(schedule.id)}
                    onCreateRescheduleSession={createRescheduleSession}
                    onUpdate={updateAttendance}
                    schedule={schedule}
                    schedulesById={schedulesById}
                    sessionNumber={index + 1}
                  />
                ))}
              </SessionRail>
            </CardContent>
          </Card>
          );
        }) : instructorGroups.map((combinedGroup) => {
          const group = selectedAttendanceGroup(
            combinedGroup,
            selectedPackageByGroup[combinedGroup.id],
          );

          return (
          <Card className="liquid-glass" key={combinedGroup.id}>
            <CardContent className="grid gap-4 p-4 xl:grid-cols-[280px_minmax(0,1fr)]">
              <div className="space-y-3">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-950">
                    {stringField(group.instructor, "instructorName")}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    {stringField(combinedGroup.course, "courseName")}
                  </p>
                </div>
                {combinedGroup.groups.length > 1 ? (
                  <select
                    className="h-10 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl"
                    onChange={(event) =>
                      setSelectedPackageByGroup((current) => ({
                        ...current,
                        [combinedGroup.id]: event.target.value,
                      }))
                    }
                    value={group.id}
                  >
                    {combinedGroup.groups.map((packageGroup) => (
                      <option key={packageGroup.id} value={packageGroup.id}>
                        {packageLabel(packageGroup)}
                      </option>
                    ))}
                  </select>
                ) : null}
                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500">
                  <Info label="Student" value={studentName(combinedGroup.student)} />
                  <Info label="Period" value={stringField(group.package, "billingPeriod")} />
                  <Info label="Start" value={stringField(group.package, "lessonStartDate")} />
                  <Info
                    label="Progress"
                    value={instructorProgressLabel(group.sessions)}
                  />
                </div>
              </div>

              <SessionRail>
                {group.sessions.map(({ schedule, attendance: attendanceRow }, index) => (
                  <InstructorSessionCard
                    attendance={attendanceRow}
                    disabled={savingId === attendanceRow?.id}
                    instructors={instructors}
                    key={String(schedule.id)}
                    onCreateRescheduleSession={createInstructorRescheduleSession}
                    onUpdate={updateInstructorAttendance}
                    schedule={schedule}
                    schedulesById={schedulesById}
                    sessionNumber={index + 1}
                  />
                ))}
              </SessionRail>
            </CardContent>
          </Card>
          );
        })}
      </div>
    </div>
  );
}

function SessionRail({ children }: { children: ReactNode }) {
  const railRef = useRef<HTMLDivElement>(null);

  function scrollByCard(direction: "left" | "right") {
    railRef.current?.scrollBy({
      behavior: "smooth",
      left: direction === "left" ? -320 : 320,
    });
  }

  return (
    <div className="min-w-0 space-y-2">
      <div className="flex justify-end gap-2">
        <Button
          aria-label="Previous sessions"
          onClick={() => scrollByCard("left")}
          size="icon"
          type="button"
          variant="glass"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          aria-label="Next sessions"
          onClick={() => scrollByCard("right")}
          size="icon"
          type="button"
          variant="glass"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div
        className="no-scrollbar flex snap-x gap-3 overflow-x-auto scroll-smooth pb-1"
        ref={railRef}
      >
        {children}
      </div>
    </div>
  );
}

function SessionCard({
  attendance,
  disabled,
  onUpdate,
  onCreateRescheduleSession,
  schedule,
  schedulesById,
  sessionNumber,
}: {
  attendance: Row | null;
  disabled: boolean;
  onCreateRescheduleSession: (payload: {
    attendanceRow: Row;
    fromTime: string;
    rescheduleDate: string;
    toTime: string;
  }) => Promise<void>;
  onUpdate: (id: string, payload: Record<string, unknown>) => Promise<void>;
  schedule: Row;
  schedulesById: Map<string, Row>;
  sessionNumber: number;
}) {
  const status = String(attendance?.status ?? "Pending");
  const isDraftReschedule = Boolean(schedule.isDraftReschedule);
  const needsReason = status !== "Present" && status !== "Pending";
  const confirmed = Boolean(attendance?.confirmed);
  const requiresReschedule = ["Absent", "Sick", "Permission", "Rescheduled"].includes(status);
  const pendingReschedule = pendingRescheduleLabel(attendance);
  const canConfirm = Boolean(attendance) && !confirmed && status !== "Pending" && (
    !requiresReschedule || Boolean(attendance?.makeupScheduleId || pendingReschedule)
  );
  const controlDisabled = disabled || confirmed;
  const linkedReschedule = schedulesById.get(String(attendance?.makeupScheduleId ?? ""));
  const originalSchedule = schedulesById.get(String(schedule.originalScheduleId ?? ""));
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleFromTime, setRescheduleFromTime] = useState(String(schedule.fromTime ?? ""));
  const [rescheduleToTime, setRescheduleToTime] = useState(String(schedule.toTime ?? ""));

  return (
    <div className="min-h-[220px] w-[280px] shrink-0 snap-start rounded-2xl border border-white/45 bg-white/42 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase text-zinc-500">Session {sessionNumber}</p>
          <p className="mt-1 font-semibold text-zinc-950">{String(schedule.scheduleDate ?? "-")}</p>
          <p className="text-xs text-zinc-500">
            {String(schedule.fromTime ?? "-")} - {String(schedule.toTime ?? "-")}
          </p>
        </div>
        <Badge variant={statusVariant(status)}>{formatDisplayText(status)}</Badge>
      </div>

      {isDraftReschedule ? (
        <div className="mt-3 space-y-2">
          {schedule.originalScheduleId ? (
            <RescheduleBadge
              label="From"
              value={originalSchedule ? scheduleDateTime(originalSchedule) : "Original session"}
            />
          ) : null}
          <p className="text-xs italic text-zinc-500">
            Draft reschedule. It will appear in Schedules after attendance is confirmed.
          </p>
        </div>
      ) : attendance ? (
        <div className="mt-3 space-y-2">
          <select
            className="h-10 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl"
            disabled={controlDisabled}
            onChange={(event) => {
              const nextStatus = event.target.value;
              const clearsReschedule = nextStatus === "Present" || nextStatus === "Pending";
              void onUpdate(attendance.id, {
                ...attendance,
                status: nextStatus,
                absenceReason: clearsReschedule ? "" : attendance.absenceReason,
                makeupRequired: clearsReschedule ? false : attendance.makeupRequired,
                makeupScheduleId: clearsReschedule ? "" : attendance.makeupScheduleId,
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

          {confirmed ? <ConfirmedBadge attendance={attendance} /> : null}

          {schedule.originalScheduleId ? (
            <RescheduleBadge
              label="From"
              value={originalSchedule ? scheduleDateTime(originalSchedule) : "Original session"}
            />
          ) : null}

          {needsReason ? (
            <>
              <input
                className="h-10 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl"
                disabled={controlDisabled}
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
                  disabled={controlDisabled}
                  onChange={(event) =>
                    void onUpdate(attendance.id, {
                      ...attendance,
                      makeupRequired: event.target.checked,
                    })
                  }
                  type="checkbox"
                />
                Reschedule required
              </label>
              {attendance.makeupScheduleId ? (
                <RescheduleBadge
                  label="To"
                  value={
                    linkedReschedule
                      ? scheduleDateTime(linkedReschedule)
                      : "Replacement session created"
                  }
                />
              ) : pendingReschedule ? (
                <RescheduleBadge label="To" value={`${pendingReschedule} (draft)`} />
              ) : (
                <div className="grid gap-2">
                  <input
                    className="h-10 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl"
                    disabled={controlDisabled}
                    onChange={(event) => setRescheduleDate(event.target.value)}
                    type="date"
                    value={rescheduleDate}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="h-10 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl"
                      disabled={controlDisabled}
                      onChange={(event) => setRescheduleFromTime(event.target.value)}
                      type="time"
                      value={rescheduleFromTime}
                    />
                    <input
                      className="h-10 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl"
                      disabled={controlDisabled}
                      onChange={(event) => setRescheduleToTime(event.target.value)}
                      type="time"
                      value={rescheduleToTime}
                    />
                  </div>
                  <Button
                    disabled={controlDisabled}
                    onClick={() =>
                      void onCreateRescheduleSession({
                        attendanceRow: attendance,
                        fromTime: rescheduleFromTime,
                        rescheduleDate,
                        toTime: rescheduleToTime,
                      })
                    }
                    size="sm"
                    type="button"
                    variant="glass"
                  >
                    Add reschedule session
                  </Button>
                </div>
              )}
            </>
          ) : null}
          {canConfirm ? (
            <Button
              className="w-full"
              disabled={disabled}
              onClick={() => void onUpdate(attendance.id, { ...attendance, confirmed: true })}
              size="sm"
              type="button"
              variant="default"
            >
              Confirm Attendance
            </Button>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-xs text-zinc-500">Attendance record belum tersedia.</p>
      )}
    </div>
  );
}

function RescheduleBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex w-fit max-w-full flex-col items-start gap-2 rounded-2xl border border-amber-200/70 bg-amber-100/70 px-3 py-2 text-xs text-amber-950 shadow-sm">
      <span className="shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
        Rescheduled {label}
      </span>
      <span className="min-w-0 break-words font-medium">{value}</span>
    </div>
  );
}

function ConfirmedBadge({ attendance }: { attendance: Row }) {
  return (
    <p className="text-xs italic text-zinc-500">
      Confirmed by {formatDisplayText(attendance.confirmedByName) || "Unknown User"}
      {formatDateTime(attendance.confirmedAt) ? ` at ${formatDateTime(attendance.confirmedAt)}` : ""}
    </p>
  );
}

function InstructorSessionCard({
  attendance,
  disabled,
  instructors,
  onCreateRescheduleSession,
  onUpdate,
  schedule,
  schedulesById,
  sessionNumber,
}: {
  attendance: Row | null;
  disabled: boolean;
  instructors: Row[];
  onCreateRescheduleSession: (payload: {
    attendanceRow: Row;
    fromTime: string;
    rescheduleDate: string;
    toTime: string;
  }) => Promise<void>;
  onUpdate: (id: string, payload: Record<string, unknown>) => Promise<void>;
  schedule: Row;
  schedulesById: Map<string, Row>;
  sessionNumber: number;
}) {
  const status = String(attendance?.status ?? "Pending");
  const needsSubstitute = status === "Substitute";
  const confirmed = Boolean(attendance?.confirmed);
  const requiresReschedule = ["Absent", "Cancelled"].includes(status);
  const pendingReschedule = pendingRescheduleLabel(attendance);
  const linkedReschedule = schedulesById.get(String(attendance?.rescheduleScheduleId ?? ""));
  const canConfirm = Boolean(attendance) && !confirmed && status !== "Pending" && (
    !requiresReschedule || Boolean(attendance?.rescheduleScheduleId || pendingReschedule)
  );
  const controlDisabled = disabled || confirmed;
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleFromTime, setRescheduleFromTime] = useState(String(schedule.fromTime ?? ""));
  const [rescheduleToTime, setRescheduleToTime] = useState(String(schedule.toTime ?? ""));

  return (
    <div className="min-h-[220px] w-[280px] shrink-0 snap-start rounded-2xl border border-white/45 bg-white/42 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase text-zinc-500">Session {sessionNumber}</p>
          <p className="mt-1 font-semibold text-zinc-950">{String(schedule.scheduleDate ?? "-")}</p>
          <p className="text-xs text-zinc-500">
            {String(schedule.fromTime ?? "-")} - {String(schedule.toTime ?? "-")}
          </p>
        </div>
        <Badge variant={instructorStatusVariant(status)}>{formatDisplayText(status)}</Badge>
      </div>

      {attendance ? (
        <div className="mt-3 space-y-2">
          <select
            className="h-10 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl"
            disabled={controlDisabled}
            onChange={(event) => {
              const nextStatus = event.target.value;
              const clearsReschedule = nextStatus === "Present" || nextStatus === "Pending";
              const needsReschedule = ["Absent", "Cancelled"].includes(nextStatus);
              void onUpdate(attendance.id, {
                ...attendance,
                status: nextStatus,
                substituteInstructorId:
                  nextStatus === "Substitute" ? attendance.substituteInstructorId : "",
                rescheduleRequired: clearsReschedule ? false : needsReschedule || attendance.rescheduleRequired,
                rescheduleScheduleId: clearsReschedule ? "" : attendance.rescheduleScheduleId,
              });
            }}
            value={status}
          >
            {instructorAttendanceStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {confirmed ? <ConfirmedBadge attendance={attendance} /> : null}

          {attendance.rescheduleScheduleId ? (
            <RescheduleBadge
              label="To"
              value={
                linkedReschedule
                  ? scheduleDateTime(linkedReschedule)
                  : "Replacement session created"
              }
            />
          ) : pendingReschedule ? (
            <RescheduleBadge label="To" value={`${pendingReschedule} (draft)`} />
          ) : attendance.rescheduleRequired ? (
            <div className="grid gap-2">
              <input
                className="h-10 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl"
                disabled={controlDisabled}
                onChange={(event) => setRescheduleDate(event.target.value)}
                type="date"
                value={rescheduleDate}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="h-10 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl"
                  disabled={controlDisabled}
                  onChange={(event) => setRescheduleFromTime(event.target.value)}
                  type="time"
                  value={rescheduleFromTime}
                />
                <input
                  className="h-10 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl"
                  disabled={controlDisabled}
                  onChange={(event) => setRescheduleToTime(event.target.value)}
                  type="time"
                  value={rescheduleToTime}
                />
              </div>
              <Button
                disabled={controlDisabled}
                onClick={() =>
                  void onCreateRescheduleSession({
                    attendanceRow: attendance,
                    fromTime: rescheduleFromTime,
                    rescheduleDate,
                    toTime: rescheduleToTime,
                  })
                }
                size="sm"
                type="button"
                variant="glass"
              >
                Add reschedule session
              </Button>
            </div>
          ) : requiresReschedule ? (
            <p className="text-xs italic text-zinc-500">
              Set reschedule required to add a replacement session.
            </p>
          ) : null}

          {needsSubstitute ? (
            <select
              className="h-10 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl"
              disabled={controlDisabled}
              onChange={(event) =>
                void onUpdate(attendance.id, {
                  ...attendance,
                  substituteInstructorId: event.target.value,
                  status: "Substitute",
                })
              }
              value={String(attendance.substituteInstructorId ?? "")}
            >
              <option value="">Select substitute</option>
              {instructors
                .filter((instructor) => instructor.id !== attendance.instructorId)
                .map((instructor) => (
                  <option key={instructor.id} value={instructor.id}>
                    {formatDisplayText(instructor.instructorName)}
                  </option>
                ))}
            </select>
          ) : null}

          <input
            className="h-10 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl"
            disabled={controlDisabled}
            onBlur={(event) =>
              void onUpdate(attendance.id, {
                ...attendance,
                notes: event.target.value,
              })
            }
            placeholder="Notes"
            defaultValue={String(attendance.notes ?? "")}
          />
          {canConfirm ? (
            <Button
              className="w-full"
              disabled={disabled}
              onClick={() => void onUpdate(attendance.id, { ...attendance, confirmed: true })}
              size="sm"
              type="button"
              variant="default"
            >
              Confirm Attendance
            </Button>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-xs text-zinc-500">Instructor attendance belum tersedia.</p>
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

function mapById(rows: Row[]) {
  return new Map(rows.map((row) => [row.id, row]));
}

function combineAttendanceGroups(groups: AttendanceGroup[]) {
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

function selectedAttendanceGroup(group: CombinedAttendanceGroup, selectedId?: string) {
  return group.groups.find((packageGroup) => packageGroup.id === selectedId) ?? group.groups[0];
}

function packageSortKey(group: AttendanceGroup) {
  return String(group.package?.billingPeriod ?? group.package?.lessonStartDate ?? group.id);
}

function packageLabel(group: AttendanceGroup) {
  const period = stringField(group.package, "billingPeriod");
  const start = stringField(group.package, "lessonStartDate");
  return [period, start ? `Start ${start}` : ""].filter(Boolean).join(" | ") || formatDisplayText(group.id);
}

function stringField(row: Row | null, key: string) {
  return formatDisplayText(row?.[key]);
}

function studentName(student: Row | null) {
  if (!student) return "Unknown student";
  return formatDisplayText(`${String(student.firstName ?? "")} ${String(student.lastName ?? "")}`);
}

function scheduleDateTime(schedule: Row) {
  const date = String(schedule.scheduleDate ?? "-");
  const fromTime = String(schedule.fromTime ?? "-");
  const toTime = String(schedule.toTime ?? "-");
  return `${date}, ${fromTime} - ${toTime}`;
}

function pendingRescheduleLabel(attendance: Row | null) {
  if (!attendance?.pendingRescheduleDate) return "";
  const date = String(attendance.pendingRescheduleDate);
  const fromTime = String(attendance.pendingRescheduleFromTime || "-");
  const toTime = String(attendance.pendingRescheduleToTime || "-");
  return `${date}, ${fromTime} - ${toTime}`;
}

function formatDateTime(value: unknown) {
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

function studentProgressLabel(sessions: SessionRow[]) {
  const total = originalSessionCount(sessions);
  const done = Math.min(
    total,
    sessions.filter(({ attendance }) => attendance?.status === "Present").length,
  );

  return `${done}/${total} done`;
}

function instructorProgressLabel(sessions: SessionRow[]) {
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

function statusVariant(status: string) {
  if (status === "Present") return "success";
  if (status === "Pending") return "outline";
  if (status === "Late" || status === "Permission") return "warning";
  return "danger";
}

function instructorStatusVariant(status: string) {
  if (status === "Present") return "success";
  if (status === "Pending") return "outline";
  if (status === "Substitute" || status === "Rescheduled") return "warning";
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
