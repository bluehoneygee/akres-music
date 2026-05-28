"use client";

import { AlertTriangle, CalendarCheck, CalendarDays, ChevronLeft, ChevronRight, RefreshCw, UserRound } from "lucide-react";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getClientSession } from "@/lib/client-session";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type SelectedSession = SessionRow & {
  sessionNumber: number;
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
  const [instructorAvailability, setInstructorAvailability] = useState<Row[]>([]);
  const [studioRooms, setStudioRooms] = useState<Row[]>([]);
  const [activeTab, setActiveTab] = useState<"students" | "instructors">("students");
  const [sessionRole, setSessionRole] = useState<string>("");
  const [selectedPackageByGroup, setSelectedPackageByGroup] = useState<Record<string, string>>({});
  const [selectedStudentSession, setSelectedStudentSession] = useState<SelectedSession | null>(null);
  const [selectedInstructorSession, setSelectedInstructorSession] = useState<SelectedSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const schedulesById = useMemo(() => mapById(schedules), [schedules]);
  const readOnlyPortal = sessionRole === "Parent Portal User" || sessionRole === "Student Portal User";

  async function loadData() {
    setLoading(true);

    try {
      const [
        packageRows,
        studentRows,
        courseRows,
        instructorRows,
        instructorAvailabilityRows,
        studioRoomRows,
        scheduleRows,
        attendanceRows,
        instructorAttendanceRows,
      ] = await Promise.all([
          fetchRows("lesson-packages"),
          fetchRows("students"),
          fetchRows("courses"),
          fetchRows("instructors"),
          fetchRows("instructor-availability"),
          fetchRows("rooms"),
          fetchRows("schedules"),
          fetchRows("student-attendance"),
          fetchRows("instructor-attendance"),
        ]);

      setPackages(packageRows);
      setStudents(studentRows);
      setCourses(courseRows);
      setInstructors(instructorRows);
      setInstructorAvailability(instructorAvailabilityRows);
      setStudioRooms(studioRoomRows);
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

  useEffect(() => {
    let mounted = true;

    async function loadSessionRole() {
      try {
        const session = (await getClientSession()) as { user?: { role?: string } };
        if (mounted) {
          setSessionRole(session.user?.role ?? "");
        }
      } catch {
        if (mounted) {
          setSessionRole("");
        }
      }
    }

    void loadSessionRole();

    return () => {
      mounted = false;
    };
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
  const selectedStudentAttendance = selectedStudentSession
    ? attendance.find((row) => row.courseScheduleId === selectedStudentSession.schedule.id) ??
      selectedStudentSession.attendance
    : null;
  const selectedInstructorAttendance = selectedInstructorSession
    ? instructorAttendance.find((row) => row.courseScheduleId === selectedInstructorSession.schedule.id) ??
      selectedInstructorSession.attendance
    : null;

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

  async function createInstructorRescheduleSession({
    attendanceRow,
    fromTime,
    rescheduleDate,
    studioRoomId,
    toTime,
  }: {
    attendanceRow: Row;
    fromTime: string;
    rescheduleDate: string;
    studioRoomId: string;
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
        pendingRescheduleStudioRoomId: studioRoomId,
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
            <CardContent className="space-y-3 p-5">
              <div className="h-5 w-40 animate-pulse rounded-lg bg-white/45" />
              <div className="h-24 w-full animate-pulse rounded-2xl bg-white/40" />
            </CardContent>
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
            <CardContent className="grid gap-3 p-3 sm:gap-4 sm:p-4 xl:grid-cols-[240px_minmax(0,1fr)]">
              <div className="space-y-3">
                <div>
                  <h2 className="truncate text-base font-semibold text-zinc-950 sm:text-lg">
                    {studentName(combinedGroup.student)}
                  </h2>
                  <p className="mt-1 truncate text-sm text-zinc-500">
                    {stringField(combinedGroup.course, "courseName")}
                  </p>
                </div>
                {combinedGroup.groups.length > 1 ? (
                  <PackageSelector
                    groups={combinedGroup.groups}
                    onChange={(value) =>
                      setSelectedPackageByGroup((current) => ({
                        ...current,
                        [combinedGroup.id]: value,
                      }))
                    }
                    value={group.id}
                  />
                ) : null}
                <div className="no-scrollbar flex flex-nowrap gap-x-3 overflow-x-auto whitespace-nowrap text-xs text-zinc-600 sm:flex-wrap sm:gap-x-4 sm:gap-y-2 sm:overflow-visible sm:whitespace-normal">
                  <Info icon={<UserRound className="size-3.5" />} label="Instructor" showMobileLabel value={stringField(group.instructor, "instructorName")} />
                  <Info icon={<CalendarDays className="size-3.5" />} label="Period" value={stringField(group.package, "billingPeriod")} />
                  <Info
                    icon={<CalendarCheck className="size-3.5" />}
                    label="Progress"
                    value={studentProgressLabel(group.sessions)}
                  />
                </div>
              </div>

              <SessionRail sessionCount={group.sessions.length}>
                {group.sessions.map(({ schedule, attendance: attendanceRow }, index) => (
                  <SessionCard
                    attendance={attendanceRow}
                    key={String(schedule.id)}
                    originalSchedule={schedulesById.get(String(schedule.originalScheduleId ?? "")) ?? null}
                    onOpen={() =>
                      setSelectedStudentSession({
                        attendance: attendanceRow,
                        schedule,
                        sessionNumber: index + 1,
                      })
                    }
                    schedule={schedule}
                    schedules={schedules}
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
            <CardContent className="grid gap-3 p-3 sm:gap-4 sm:p-4 xl:grid-cols-[240px_minmax(0,1fr)]">
              <div className="space-y-3">
                <div>
                  <h2 className="truncate text-base font-semibold text-zinc-950 sm:text-lg">
                    {stringField(group.instructor, "instructorName")}
                  </h2>
                  <p className="mt-1 truncate text-sm text-zinc-500">
                    {stringField(combinedGroup.course, "courseName")}
                  </p>
                </div>
                {combinedGroup.groups.length > 1 ? (
                  <PackageSelector
                    groups={combinedGroup.groups}
                    onChange={(value) =>
                      setSelectedPackageByGroup((current) => ({
                        ...current,
                        [combinedGroup.id]: value,
                      }))
                    }
                    value={group.id}
                  />
                ) : null}
                <div className="no-scrollbar flex flex-nowrap gap-x-3 overflow-x-auto whitespace-nowrap text-xs text-zinc-600 sm:flex-wrap sm:gap-x-4 sm:gap-y-2 sm:overflow-visible sm:whitespace-normal">
                  <Info icon={<UserRound className="size-3.5" />} label="Student" showMobileLabel value={studentName(combinedGroup.student)} />
                  <Info icon={<CalendarDays className="size-3.5" />} label="Period" value={stringField(group.package, "billingPeriod")} />
                  <Info
                    icon={<CalendarCheck className="size-3.5" />}
                    label="Progress"
                    value={instructorProgressLabel(group.sessions)}
                  />
                </div>
              </div>

              <SessionRail sessionCount={group.sessions.length}>
                {group.sessions.map(({ schedule, attendance: attendanceRow }, index) => (
                  <InstructorSessionCard
                    attendance={attendanceRow}
                    key={String(schedule.id)}
                    originalSchedule={schedulesById.get(String(schedule.originalScheduleId ?? "")) ?? null}
                    onOpen={() =>
                      setSelectedInstructorSession({
                        attendance: attendanceRow,
                        schedule,
                        sessionNumber: index + 1,
                      })
                    }
                    schedule={schedule}
                    schedules={schedules}
                    sessionNumber={index + 1}
                  />
                ))}
              </SessionRail>
            </CardContent>
          </Card>
          );
        })}
      </div>
        {selectedStudentSession ? (
          <StudentAttendanceModal
            attendance={selectedStudentAttendance}
            disabled={readOnlyPortal || savingId === selectedStudentAttendance?.id}
            instructorAvailability={instructorAvailability}
            onClose={() => setSelectedStudentSession(null)}
            onUpdate={updateAttendance}
          schedule={selectedStudentSession.schedule}
          schedules={schedules}
          studioRooms={studioRooms}
          schedulesById={schedulesById}
          sessionNumber={selectedStudentSession.sessionNumber}
        />
      ) : null}
        {selectedInstructorSession ? (
          <InstructorAttendanceModal
            attendance={selectedInstructorAttendance}
            disabled={readOnlyPortal || savingId === selectedInstructorAttendance?.id}
            instructorAvailability={instructorAvailability}
            onClose={() => setSelectedInstructorSession(null)}
          onCreateRescheduleSession={createInstructorRescheduleSession}
          onUpdate={updateInstructorAttendance}
          schedule={selectedInstructorSession.schedule}
          schedules={schedules}
          studioRooms={studioRooms}
          schedulesById={schedulesById}
          sessionNumber={selectedInstructorSession.sessionNumber}
        />
      ) : null}
    </div>
  );
}

function SessionRail({ children, sessionCount }: { children: ReactNode; sessionCount: number }) {
  const railRef = useRef<HTMLDivElement>(null);
  const showControls = sessionCount > 4;

  function scrollByCard(direction: "left" | "right") {
    railRef.current?.scrollBy({
      behavior: "smooth",
      left: direction === "left" ? -320 : 320,
    });
  }

  return (
    <div className="min-w-0 space-y-2">
      <div className={`flex items-center justify-between gap-2 sm:justify-end ${showControls ? "" : "sm:hidden"}`}>
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500 sm:hidden">
          Sessions
        </p>
        <div className={`${showControls ? "flex" : "hidden"} gap-2`}>
          <Button
            aria-label="Previous sessions"
            className="size-8 sm:size-10"
            onClick={() => scrollByCard("left")}
            size="icon"
            type="button"
            variant="glass"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            aria-label="Next sessions"
            className="size-8 sm:size-10"
            onClick={() => scrollByCard("right")}
            size="icon"
            type="button"
            variant="glass"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
      <div
        className="no-scrollbar flex snap-x gap-1.5 overflow-x-auto scroll-smooth pb-1 sm:gap-3 xl:gap-2"
        ref={railRef}
      >
        {children}
      </div>
    </div>
  );
}

function SessionCard({
  attendance,
  originalSchedule,
  onOpen,
  schedule,
  schedules,
  sessionNumber,
}: {
  attendance: Row | null;
  originalSchedule: Row | null;
  onOpen: () => void;
  schedule: Row;
  schedules: Row[];
  sessionNumber: number;
}) {
  const status = String(attendance?.status ?? "Pending");
  const isDraftReschedule = Boolean(schedule.isDraftReschedule);
  const confirmed = Boolean(attendance?.confirmed);
  const rescheduledTo = findRescheduledToSchedule(schedules, String(schedule.id ?? ""));

  return (
    <button
      className="w-[112px] shrink-0 snap-start rounded-2xl border border-white/45 bg-white/42 p-1.5 text-left transition hover:border-sky-200 hover:bg-white/62 sm:w-[190px] sm:p-3 xl:w-[150px] xl:p-2.5"
      onClick={onOpen}
      type="button"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[8px] font-medium uppercase text-zinc-500 sm:text-xs">Session {sessionNumber}</p>
          <p className="mt-0.5 truncate text-[11px] font-semibold text-zinc-950 sm:mt-1 sm:text-base">{String(schedule.scheduleDate ?? "-")}</p>
          <p className="text-[8px] text-zinc-500 sm:text-xs">
            {String(schedule.fromTime ?? "-")} - {String(schedule.toTime ?? "-")}
          </p>
        </div>
        <span className={`mt-1 size-2 shrink-0 rounded-full sm:size-2.5 ${statusDotClass(status)}`} />
      </div>
      {isDraftReschedule ? (
        <div className="mt-2.5 flex items-center justify-between gap-2 sm:mt-3">
          <Badge className="max-w-[84px] truncate px-1 py-0 text-[8px] sm:max-w-[110px] sm:px-2.5 sm:py-0.5 sm:text-xs" variant="warning">
            Draft
          </Badge>
          <FinalityIndicator draft />
        </div>
      ) : (
        <div className="mt-2.5 flex items-start justify-between gap-2 sm:mt-3">
          <div className="min-w-0 space-y-0.5 sm:space-y-1">
            <Badge className="max-w-[84px] truncate px-1 py-0 text-[8px] sm:max-w-[110px] sm:px-2.5 sm:py-0.5 sm:text-xs" variant={statusVariant(status)}>
              {formatDisplayText(status)}
            </Badge>
            {schedule.originalScheduleId ? (
              <p className="text-[7px] italic text-zinc-500 sm:text-[9px]">
                Rescheduled from {originalSchedule ? scheduleDateTime(originalSchedule) : "original session"}
              </p>
            ) : null}
            {rescheduledTo ? (
              <p className="text-[7px] italic text-zinc-500 sm:text-[9px]">
                Rescheduled to {scheduleDateTime(rescheduledTo)}
              </p>
            ) : null}
            {confirmed && attendance ? <ConfirmedBadge compact attendance={attendance} /> : null}
            {shouldShowFinalityWarning(status, confirmed) ? (
              <FinalityIndicator confirmed={false} />
            ) : null}
          </div>
        </div>
      )}
    </button>
  );
}

function StudentAttendanceModal({
  attendance,
  disabled,
  instructorAvailability,
  onClose,
  onUpdate,
  schedule,
  schedules,
  studioRooms,
  schedulesById,
  sessionNumber,
}: {
  attendance: Row | null;
  disabled: boolean;
  instructorAvailability: Row[];
  onClose: () => void;
  onUpdate: (id: string, payload: Record<string, unknown>) => Promise<void>;
  schedule: Row;
  schedules: Row[];
  studioRooms: Row[];
  schedulesById: Map<string, Row>;
  sessionNumber: number;
}) {
  const status = String(attendance?.status ?? "Pending");
  const isDraftReschedule = Boolean(schedule.isDraftReschedule);
  const needsReason = status === "Rescheduled";
  const confirmed = Boolean(attendance?.confirmed);
  const requiresReschedule = status === "Rescheduled";
  const pendingReschedule = pendingRescheduleLabel(attendance);
  const canConfirm = Boolean(attendance) && !confirmed && status !== "Pending" && (
    !requiresReschedule || Boolean(attendance?.makeupScheduleId || pendingReschedule)
  );
  const controlDisabled = disabled || confirmed;
  const linkedReschedule = schedulesById.get(String(attendance?.makeupScheduleId ?? ""));
  const originalSchedule = schedulesById.get(String(schedule.originalScheduleId ?? ""));
  const rescheduledTo = findRescheduledToSchedule(schedules, String(schedule.id ?? ""));
  const [replacementOpen, setReplacementOpen] = useState(false);
  const [replacementStatus, setReplacementStatus] = useState(status);
  const [rescheduleFromTime, setRescheduleFromTime] = useState(String(schedule.fromTime ?? ""));
  const [rescheduleToTime, setRescheduleToTime] = useState(String(schedule.toTime ?? ""));

  return (
    <>
      <AttendanceModalShell
        onClose={onClose}
        schedule={schedule}
        sessionNumber={sessionNumber}
        status={status}
        attendance={attendance}
        confirmed={confirmed}
        draft={isDraftReschedule}
        variantFn={statusVariant}
      >
        {isDraftReschedule ? (
          <div className="space-y-2">
            {schedule.originalScheduleId ? (
              <RescheduleBadge
                label="From"
                value={originalSchedule ? scheduleDateTime(originalSchedule) : "Original session"}
              />
            ) : null}
            {rescheduledTo ? (
              <RescheduleBadge label="To" value={scheduleDateTime(rescheduledTo)} />
            ) : null}
            <p className="text-xs italic text-zinc-500 dark:text-zinc-300">
              Draft reschedule. It will appear in Schedules after attendance is confirmed.
            </p>
          </div>
        ) : attendance ? (
          <div className="space-y-3">
            <select
              className="h-10 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl focus:ring-2 focus:ring-sky-200 dark:border-zinc-600 dark:bg-zinc-800/75 dark:text-zinc-100 dark:focus:ring-zinc-500"
              disabled={controlDisabled}
              onChange={(event) => {
                const nextStatus = event.target.value;
                const clearsReschedule = nextStatus === "Present" || nextStatus === "Pending";
                const opensReplacement = nextStatus === "Rescheduled";

                if (opensReplacement && !attendance.makeupScheduleId && !pendingReschedule) {
                  setReplacementStatus(nextStatus);
                  setReplacementOpen(true);
                  return;
                }

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

            {schedule.originalScheduleId ? (
              <RescheduleBadge
                label="From"
                value={originalSchedule ? scheduleDateTime(originalSchedule) : "Original session"}
              />
            ) : null}
          {rescheduledTo && String(linkedReschedule?.id ?? "") !== String(rescheduledTo.id ?? "") ? (
            <RescheduleBadge label="To" value={scheduleDateTime(rescheduledTo)} />
          ) : null}
          {rescheduledTo || attendance.makeupScheduleId ? (
            <p className="text-xs font-medium text-amber-700">
              Jatah reschedule habis.
            </p>
          ) : null}

            {needsReason ? (
              <>
                <input
                  className="h-10 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl focus:ring-2 focus:ring-sky-200 dark:border-zinc-600 dark:bg-zinc-800/75 dark:text-zinc-100 dark:focus:ring-zinc-500"
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
                  <Button
                    disabled={controlDisabled}
                    onClick={() => {
                      setReplacementStatus(status);
                      setReplacementOpen(true);
                    }}
                    size="sm"
                    type="button"
                    variant="glass"
                  >
                    Set replacement schedule
                  </Button>
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
          <p className="text-xs text-zinc-500">Attendance record belum tersedia.</p>
        )}
      </AttendanceModalShell>
      {attendance && replacementOpen ? (
        <ReplacementScheduleModal
          attendance={attendance}
          instructorAvailability={instructorAvailability}
          defaultFromTime={rescheduleFromTime}
          defaultReason={String(attendance.absenceReason ?? "")}
          defaultStatus={replacementStatus}
          defaultToTime={rescheduleToTime}
          onClose={() => setReplacementOpen(false)}
          schedule={schedule}
          schedules={schedules}
          studioRooms={studioRooms}
          onSave={async ({ fromTime, reason, rescheduleDate: nextDate, status: nextStatus, toTime, studioRoomId }) => {
            await onUpdate(attendance.id, {
              ...attendance,
              status: nextStatus,
              absenceReason: reason,
              makeupRequired: true,
              pendingRescheduleDate: nextDate,
              pendingRescheduleFromTime: fromTime,
              pendingRescheduleToTime: toTime,
              pendingRescheduleStudioRoomId: studioRoomId,
            });
            setRescheduleFromTime(fromTime);
            setRescheduleToTime(toTime);
            setReplacementOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

function AttendanceModalShell({
  attendance,
  children,
  confirmed,
  draft,
  onClose,
  schedule,
  sessionNumber,
  status,
  variantFn,
}: {
  attendance: Row | null;
  children: ReactNode;
  confirmed: boolean;
  draft: boolean;
  onClose: () => void;
  schedule: Row;
  sessionNumber: number;
  status: string;
  variantFn: (status: string) => "success" | "outline" | "warning" | "danger";
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/35 p-3 backdrop-blur-sm">
      <div className="max-h-[calc(100dvh-24px)] w-full max-w-[460px] overflow-y-auto rounded-3xl border border-white/55 bg-white/92 p-4 text-zinc-900 shadow-2xl backdrop-blur-2xl dark:border-zinc-700/80 dark:bg-zinc-900/92 dark:text-zinc-100">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">
              Session {sessionNumber}
            </p>
            <h2 className="mt-1 truncate text-lg font-semibold text-zinc-950">
              {String(schedule.scheduleDate ?? "-")}
            </h2>
            <p className="text-sm text-zinc-500">
              {String(schedule.fromTime ?? "-")} - {String(schedule.toTime ?? "-")}
            </p>
          </div>
          <div className="flex w-full shrink-0 items-start justify-between gap-2 sm:w-auto sm:justify-end">
            <div className="flex min-w-0 flex-col items-start gap-1 sm:items-end">
              <Badge variant={variantFn(status)}>{formatDisplayText(status)}</Badge>
              {shouldShowFinalityWarning(status, confirmed) || draft ? (
                <FinalityIndicator draft={draft} confirmed={confirmed} />
              ) : null}
            </div>
            <Button onClick={onClose} size="sm" type="button" variant="glass">
              Close
            </Button>
          </div>
        </div>
        <div className="mt-4">{children}</div>
      </div>
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

function ReplacementScheduleModal({
  instructorAvailability,
  defaultFromTime,
  defaultReason,
  defaultStatus,
  defaultToTime,
  onClose,
  onSave,
  schedule,
  schedules,
  studioRooms,
}: {
  attendance: Row;
  instructorAvailability: Row[];
  defaultFromTime: string;
  defaultReason: string;
  defaultStatus: string;
  defaultToTime: string;
  onClose: () => void;
  onSave: (payload: {
    fromTime: string;
    reason: string;
    rescheduleDate: string;
    status: string;
    studioRoomId: string;
    toTime: string;
  }) => Promise<void>;
  schedule: Row;
  schedules: Row[];
  studioRooms: Row[];
}) {
  const [status, setStatus] = useState(defaultStatus);
  const [reason, setReason] = useState(defaultReason);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [fromTime, setFromTime] = useState(defaultFromTime);
  const [toTime, setToTime] = useState(defaultToTime);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [studioRoomId, setStudioRoomId] = useState(String(schedule.studioRoomId ?? ""));
  const replacementStatusOptions = studentAttendanceStatusOptions.filter(
    (option) => option.value === "Rescheduled",
  );
  const slotOptions = useMemo(
    () => buildRescheduleSlotOptions({ availabilityRows: instructorAvailability, schedule }),
    [instructorAvailability, schedule],
  );
  useEffect(() => {
    if (selectedSlot || slotOptions.length === 0) return;
    const nextSlot =
      findRescheduleSlotValueForSchedule(slotOptions, schedule) ?? slotOptions[0]?.value ?? "";
    if (!nextSlot) return;
    setSelectedSlot(nextSlot);
    const selected = slotOptions.find((slot) => slot.value === nextSlot);
    if (!selected) return;
    setFromTime(selected.fromTime);
    setToTime(selected.toTime);
  }, [schedule, selectedSlot, slotOptions]);
  const selectedSlotData = slotOptions.find((slot) => slot.value === selectedSlot);
  const dateOptions = useMemo(
    () => buildRescheduleDateOptions({ schedule, schedules, selectedSlot: selectedSlotData }),
    [schedule, schedules, selectedSlotData],
  );
  const selectedDateData = dateOptions.find((option) => option.value === rescheduleDate);
  const isStudioMode = String(schedule.lessonMode ?? "").toLowerCase() === "studio";
  const needsStudioOverride = isStudioMode && Boolean(selectedDateData?.conflicts.studio);
  const availableStudioRooms = useMemo(
    (): StudioRoomOption[] =>
      studioRooms
        .filter((room) => String(room.active ?? true) !== "false")
        .map((room) => {
          const id = String(room.id ?? "");
          const booked = isStudioRoomBooked({
            schedules,
            roomId: id,
            date: rescheduleDate,
            fromTime,
            toTime,
            skipScheduleId: String(schedule.id ?? ""),
            skipOriginalScheduleId: String(schedule.originalScheduleId ?? ""),
          });
          return {
            id,
            label: booked ? `${formatDisplayText(room.roomName)} (Booked)` : formatDisplayText(room.roomName),
            disabled: booked,
          };
        }),
    [fromTime, rescheduleDate, schedule.id, schedule.originalScheduleId, schedules, studioRooms, toTime],
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/35 p-3 backdrop-blur-sm">
      <div className="max-h-[calc(100dvh-24px)] w-full max-w-[420px] overflow-y-auto rounded-3xl border border-white/55 bg-white/92 p-4 text-zinc-900 shadow-2xl backdrop-blur-2xl dark:border-zinc-700/80 dark:bg-zinc-900/92 dark:text-zinc-100">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">
              Replacement schedule
            </p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-950 dark:text-zinc-100">Set Jadwal Pengganti</h2>
          </div>
          <div className="flex justify-end">
            <Button onClick={onClose} size="sm" type="button" variant="glass">
              Close
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Status</span>
            <select
              className="h-10 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl focus:ring-2 focus:ring-sky-200 dark:border-zinc-600 dark:bg-zinc-800/75 dark:text-zinc-100 dark:focus:ring-zinc-500"
              onChange={(event) => setStatus(event.target.value)}
              value={status}
            >
              {replacementStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Reason</span>
            <input
              className="h-10 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl focus:ring-2 focus:ring-sky-200 dark:border-zinc-600 dark:bg-zinc-800/75 dark:text-zinc-100 dark:focus:ring-zinc-500"
              onChange={(event) => setReason(event.target.value)}
              placeholder="Absence reason"
              value={reason}
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">
              Replacement slot
            </span>
            <div className="grid max-h-40 gap-2 overflow-y-auto rounded-2xl border border-white/50 bg-white/42 p-2 backdrop-blur-xl dark:border-zinc-700/80 dark:bg-zinc-800/55">
              {slotOptions.map((slot) => {
                const checked = selectedSlot === slot.value;
                return (
                  <button
                    aria-pressed={checked}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition ${
                      checked
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-white/50 bg-white/52 text-zinc-900 hover:bg-white/75 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-100 dark:hover:bg-zinc-700/80"
                    }`}
                    key={slot.value}
                    onClick={(event) => {
                      event.preventDefault();
                      setSelectedSlot(slot.value);
                      setRescheduleDate("");
                      setFromTime(slot.fromTime);
                      setToTime(slot.toTime);
                    }}
                    type="button"
                  >
                    <span
                      className={`grid size-4 shrink-0 place-items-center rounded border text-[10px] ${
                        checked
                          ? "border-white bg-white text-zinc-950"
                          : "border-zinc-300 bg-white/70 text-transparent dark:border-zinc-500 dark:bg-zinc-700/80"
                      }`}
                    >
                      ✓
                    </span>
                    <span className="min-w-0 flex-1 truncate">{slot.label}</span>
                  </button>
                );
              })}
            </div>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">
              Available date
            </span>
            <div className="grid max-h-44 gap-2 overflow-y-auto rounded-2xl border border-white/50 bg-white/42 p-2 backdrop-blur-xl dark:border-zinc-700/80 dark:bg-zinc-800/55">
              {dateOptions.length === 0 ? (
                <p className="px-2 py-1 text-xs text-zinc-500 dark:text-zinc-300">No available date.</p>
              ) : (
                dateOptions.map((option) => {
                  const checked = rescheduleDate === option.value;
                  return (
                    <button
                      aria-pressed={checked}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition ${
                        checked
                          ? "border-zinc-950 bg-zinc-950 text-white"
                          : "border-white/50 bg-white/52 text-zinc-900 hover:bg-white/75 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-100 dark:hover:bg-zinc-700/80"
                      } ${option.disabled ? "cursor-not-allowed opacity-45" : ""}`}
                      disabled={!selectedSlot || option.disabled}
                      key={option.value}
                      onClick={(event) => {
                        event.preventDefault();
                        setRescheduleDate(option.value);
                        if (!option.conflicts.studio && String(schedule.lessonMode ?? "").toLowerCase() === "studio") {
                          setStudioRoomId(String(schedule.studioRoomId ?? ""));
                        }
                      }}
                      type="button"
                    >
                      <span
                        className={`grid size-4 shrink-0 place-items-center rounded border text-[10px] ${
                          checked
                            ? "border-white bg-white text-zinc-950"
                            : "border-zinc-300 bg-white/70 text-transparent dark:border-zinc-500 dark:bg-zinc-700/80"
                        }`}
                      >
                        ✓
                      </span>
                      <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    </button>
                  );
                })
              )}
            </div>
          </label>
          {isStudioMode && rescheduleDate ? (
            <label className="space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">
                Studio room
              </span>
              <select
                className="h-10 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl focus:ring-2 focus:ring-sky-200 dark:border-zinc-600 dark:bg-zinc-800/75 dark:text-zinc-100 dark:focus:ring-zinc-500"
                onChange={(event) => setStudioRoomId(event.target.value)}
                value={studioRoomId}
              >
                <option value="">Select studio room</option>
                {availableStudioRooms.map((room) => (
                  <option disabled={room.disabled} key={room.id} value={room.id}>
                    {room.label}
                  </option>
                ))}
              </select>
              {needsStudioOverride ? (
                <p className="text-[11px] text-amber-700">Room asal sudah terpakai di jam ini. Pilih room lain.</p>
              ) : null}
            </label>
          ) : null}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose} type="button" variant="glass">
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (needsStudioOverride && !studioRoomId) {
                toast.error("Pilih studio room pengganti dulu");
                return;
              }
              void onSave({
                fromTime,
                reason,
                rescheduleDate,
                status,
                studioRoomId: String(schedule.lessonMode ?? "").toLowerCase() === "studio"
                  ? (studioRoomId || String(schedule.studioRoomId ?? ""))
                  : "",
                toTime,
              });
            }}
            type="button"
          >
            Save Replacement
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConfirmedBadge({
  align = "left",
  attendance,
  compact = false,
}: {
  align?: "left" | "right";
  attendance: Row;
  compact?: boolean;
}) {
  return (
    <p className={`${compact ? "line-clamp-2 max-w-[96px] whitespace-normal text-[7px] leading-[1.1] sm:max-w-[120px] sm:text-[9px]" : "max-w-[220px] text-xs"} italic text-zinc-500 ${align === "right" ? "text-right" : ""}`}>
      Confirmed by {formatDisplayText(attendance.confirmedByName) || "Unknown User"}
      {!compact && formatDateTime(attendance.confirmedAt) ? ` at ${formatDateTime(attendance.confirmedAt)}` : ""}
    </p>
  );
}

function FinalityIndicator({
  confirmed = false,
  draft = false,
}: {
  confirmed?: boolean;
  draft?: boolean;
}) {
  if (draft) {
    return (
      <span className="inline-flex w-fit items-center rounded-full border border-amber-200 bg-amber-100 px-1 py-0 text-[8px] font-semibold text-amber-800 sm:px-2 sm:py-0.5 sm:text-[10px]">
        Draft
      </span>
    );
  }

  if (!confirmed) {
    return (
      <span className="inline-flex w-fit max-w-[96px] items-center gap-0.5 truncate whitespace-nowrap text-[7px] italic leading-tight text-amber-700 sm:max-w-[120px] sm:gap-1 sm:text-[9px]">
        <AlertTriangle className="size-2 shrink-0 sm:size-3" />
        Belum confirm
      </span>
    );
  }

  return (
    <span className="inline-flex w-fit items-center rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
      Final
    </span>
  );
}

function shouldShowFinalityWarning(status: string, confirmed: boolean) {
  return !confirmed && status !== "Pending";
}

function InstructorSessionCard({
  attendance,
  originalSchedule,
  onOpen,
  schedule,
  schedules,
  sessionNumber,
}: {
  attendance: Row | null;
  originalSchedule: Row | null;
  onOpen: () => void;
  schedule: Row;
  schedules: Row[];
  sessionNumber: number;
}) {
  const status = String(attendance?.status ?? "Pending");
  const confirmed = Boolean(attendance?.confirmed);
  const rescheduledTo = findRescheduledToSchedule(schedules, String(schedule.id ?? ""));

  return (
    <button
      className="w-[112px] shrink-0 snap-start rounded-2xl border border-white/45 bg-white/42 p-1.5 text-left transition hover:border-sky-200 hover:bg-white/62 sm:w-[190px] sm:p-3 xl:w-[150px] xl:p-2.5"
      onClick={onOpen}
      type="button"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[8px] font-medium uppercase text-zinc-500 sm:text-xs">Session {sessionNumber}</p>
          <p className="mt-0.5 truncate text-[11px] font-semibold text-zinc-950 sm:mt-1 sm:text-base">{String(schedule.scheduleDate ?? "-")}</p>
          <p className="text-[8px] text-zinc-500 sm:text-xs">
            {String(schedule.fromTime ?? "-")} - {String(schedule.toTime ?? "-")}
          </p>
        </div>
        <span className={`mt-1 size-2 shrink-0 rounded-full sm:size-2.5 ${statusDotClass(status)}`} />
      </div>
      <div className="mt-2.5 flex items-start justify-between gap-2 sm:mt-3">
        <div className="min-w-0 space-y-0.5 sm:space-y-1">
          <Badge className="max-w-[84px] truncate px-1 py-0 text-[8px] sm:max-w-[110px] sm:px-2.5 sm:py-0.5 sm:text-xs" variant={instructorStatusVariant(status)}>
            {formatDisplayText(status)}
          </Badge>
          {schedule.originalScheduleId ? (
            <p className="text-[7px] italic text-zinc-500 sm:text-[9px]">
              Rescheduled from {originalSchedule ? scheduleDateTime(originalSchedule) : "original session"}
            </p>
          ) : null}
          {rescheduledTo ? (
            <p className="text-[7px] italic text-zinc-500 sm:text-[9px]">
              Rescheduled to {scheduleDateTime(rescheduledTo)}
            </p>
          ) : null}
          {confirmed && attendance ? <ConfirmedBadge compact attendance={attendance} /> : null}
          {shouldShowFinalityWarning(status, confirmed) ? (
            <FinalityIndicator confirmed={false} />
          ) : null}
        </div>
      </div>
    </button>
  );
}

function PackageSelector({
  groups,
  onChange,
  value,
}: {
  groups: AttendanceGroup[];
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger
        className="h-8 px-2 text-[10px] leading-none [&_[data-slot=select-value]]:text-[10px] [&_[data-slot=select-value]]:leading-none"
        style={{ fontSize: 10, lineHeight: 1 }}
      >
        <SelectValue className="truncate text-[10px] leading-none" placeholder="Select package" />
      </SelectTrigger>
      <SelectContent>
        {groups.map((packageGroup) => (
          <SelectItem className="text-[10px]" key={packageGroup.id} value={packageGroup.id}>
            {packageLabel(packageGroup)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function InstructorAttendanceModal({
  attendance,
  disabled,
  instructorAvailability,
  onClose,
  onCreateRescheduleSession,
  onUpdate,
  schedule,
  schedules,
  studioRooms,
  schedulesById,
  sessionNumber,
}: {
  attendance: Row | null;
  disabled: boolean;
  instructorAvailability: Row[];
  onClose: () => void;
  onCreateRescheduleSession: (payload: {
    attendanceRow: Row;
    fromTime: string;
    rescheduleDate: string;
    studioRoomId: string;
    toTime: string;
  }) => Promise<void>;
  onUpdate: (id: string, payload: Record<string, unknown>) => Promise<void>;
  schedule: Row;
  schedules: Row[];
  studioRooms: Row[];
  schedulesById: Map<string, Row>;
  sessionNumber: number;
}) {
  const status = String(attendance?.status ?? "Pending");
  const confirmed = Boolean(attendance?.confirmed);
  const requiresReschedule = status === "Rescheduled";
  const pendingReschedule = pendingRescheduleLabel(attendance);
  const linkedReschedule = schedulesById.get(String(attendance?.rescheduleScheduleId ?? ""));
  const originalSchedule = schedulesById.get(String(schedule.originalScheduleId ?? ""));
  const rescheduledTo = findRescheduledToSchedule(schedules, String(schedule.id ?? ""));
  const effectiveRescheduledTo = linkedReschedule ?? rescheduledTo;
  const canConfirm = Boolean(attendance) && !confirmed && status !== "Pending" && (
    !requiresReschedule || Boolean(attendance?.rescheduleScheduleId || pendingReschedule)
  );
  const controlDisabled = disabled || confirmed;
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleFromTime, setRescheduleFromTime] = useState(String(schedule.fromTime ?? ""));
  const [rescheduleToTime, setRescheduleToTime] = useState(String(schedule.toTime ?? ""));
  const [selectedSlot, setSelectedSlot] = useState("");
  const [studioRoomId, setStudioRoomId] = useState(String(schedule.studioRoomId ?? ""));
  const slotOptions = useMemo(
    () => buildRescheduleSlotOptions({ availabilityRows: instructorAvailability, schedule }),
    [instructorAvailability, schedule],
  );
  useEffect(() => {
    if (selectedSlot || slotOptions.length === 0) return;
    const nextSlot =
      findRescheduleSlotValueForSchedule(slotOptions, schedule) ?? slotOptions[0]?.value ?? "";
    if (!nextSlot) return;
    setSelectedSlot(nextSlot);
    const selected = slotOptions.find((slot) => slot.value === nextSlot);
    if (!selected) return;
    setRescheduleFromTime(selected.fromTime);
    setRescheduleToTime(selected.toTime);
  }, [schedule, selectedSlot, slotOptions]);
  const selectedSlotData = slotOptions.find((slot) => slot.value === selectedSlot);
  const dateOptions = useMemo(
    () => buildRescheduleDateOptions({ schedule, schedules, selectedSlot: selectedSlotData }),
    [schedule, schedules, selectedSlotData],
  );
  const selectedDateData = dateOptions.find((option) => option.value === rescheduleDate);
  const isStudioMode = String(schedule.lessonMode ?? "").toLowerCase() === "studio";
  const needsStudioOverride = isStudioMode && Boolean(selectedDateData?.conflicts.studio);
  const availableStudioRooms = useMemo(
    (): StudioRoomOption[] =>
      studioRooms
        .filter((room) => String(room.active ?? true) !== "false")
        .map((room) => {
          const id = String(room.id ?? "");
          const booked = isStudioRoomBooked({
            schedules,
            roomId: id,
            date: rescheduleDate,
            fromTime: rescheduleFromTime,
            toTime: rescheduleToTime,
            skipScheduleId: String(schedule.id ?? ""),
            skipOriginalScheduleId: String(schedule.originalScheduleId ?? ""),
          });
          return {
            id,
            label: booked ? `${formatDisplayText(room.roomName)} (Booked)` : formatDisplayText(room.roomName),
            disabled: booked,
          };
        }),
    [
      rescheduleDate,
      rescheduleFromTime,
      rescheduleToTime,
      schedule.id,
      schedule.originalScheduleId,
      schedules,
      studioRooms,
    ],
  );

  return (
    <AttendanceModalShell
      onClose={onClose}
      schedule={schedule}
      sessionNumber={sessionNumber}
      status={status}
      attendance={attendance}
      confirmed={Boolean(attendance?.confirmed)}
      draft={false}
      variantFn={instructorStatusVariant}
    >
      {attendance ? (
        <div className="space-y-3">
          <select
            className="h-10 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl focus:ring-2 focus:ring-sky-200 dark:border-zinc-600 dark:bg-zinc-800/75 dark:text-zinc-100 dark:focus:ring-zinc-500"
            disabled={controlDisabled}
            onChange={(event) => {
              const nextStatus = event.target.value;
              const clearsReschedule = nextStatus === "Present" || nextStatus === "Pending";
              const needsReschedule = nextStatus === "Rescheduled";
              void onUpdate(attendance.id, {
                ...attendance,
                status: nextStatus,
                substituteInstructorId: "",
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

          {schedule.originalScheduleId ? (
            <RescheduleBadge
              label="From"
              value={originalSchedule ? scheduleDateTime(originalSchedule) : "Original session"}
            />
          ) : null}
          {effectiveRescheduledTo ? (
            <RescheduleBadge label="To" value={scheduleDateTime(effectiveRescheduledTo)} />
          ) : pendingReschedule ? (
            <RescheduleBadge label="To" value={`${pendingReschedule} (draft)`} />
          ) : attendance.rescheduleScheduleId ? (
            <RescheduleBadge label="To" value="Replacement session created" />
          ) : null}
          {effectiveRescheduledTo || attendance.rescheduleScheduleId ? (
            <p className="text-xs font-medium text-amber-700">
              Jatah reschedule habis.
            </p>
          ) : null}
          {attendance.rescheduleRequired && !effectiveRescheduledTo && !pendingReschedule ? (
            <div className="grid gap-2">
              <div className="grid max-h-40 gap-2 overflow-y-auto rounded-2xl border border-white/50 bg-white/42 p-2 backdrop-blur-xl dark:border-zinc-700/80 dark:bg-zinc-800/55">
                {slotOptions.map((slot) => {
                  const checked = selectedSlot === slot.value;
                  return (
                    <button
                      aria-pressed={checked}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition ${
                        checked
                          ? "border-zinc-950 bg-zinc-950 text-white"
                          : "border-white/50 bg-white/52 text-zinc-900 hover:bg-white/75 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-100 dark:hover:bg-zinc-700/80"
                      } ${controlDisabled ? "cursor-not-allowed opacity-45" : ""}`}
                      disabled={controlDisabled}
                      key={slot.value}
                      onClick={(event) => {
                        event.preventDefault();
                        setSelectedSlot(slot.value);
                        setRescheduleDate("");
                        setRescheduleFromTime(slot.fromTime);
                        setRescheduleToTime(slot.toTime);
                      }}
                      type="button"
                    >
                      <span
                        className={`grid size-4 shrink-0 place-items-center rounded border text-[10px] ${
                          checked
                            ? "border-white bg-white text-zinc-950"
                            : "border-zinc-300 bg-white/70 text-transparent dark:border-zinc-500 dark:bg-zinc-700/80"
                        }`}
                      >
                        ✓
                      </span>
                      <span className="min-w-0 flex-1 truncate">{slot.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="grid max-h-44 gap-2 overflow-y-auto rounded-2xl border border-white/50 bg-white/42 p-2 backdrop-blur-xl dark:border-zinc-700/80 dark:bg-zinc-800/55">
                {dateOptions.length === 0 ? (
                  <p className="px-2 py-1 text-xs text-zinc-500 dark:text-zinc-300">No available date.</p>
                ) : (
                  dateOptions.map((option) => {
                    const checked = rescheduleDate === option.value;
                    return (
                      <button
                        aria-pressed={checked}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition ${
                          checked
                            ? "border-zinc-950 bg-zinc-950 text-white"
                            : "border-white/50 bg-white/52 text-zinc-900 hover:bg-white/75 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-100 dark:hover:bg-zinc-700/80"
                        } ${(!selectedSlot || controlDisabled || option.disabled) ? "cursor-not-allowed opacity-45" : ""}`}
                        disabled={!selectedSlot || controlDisabled || option.disabled}
                        key={option.value}
                        onClick={(event) => {
                          event.preventDefault();
                          setRescheduleDate(option.value);
                          if (!option.conflicts.studio && String(schedule.lessonMode ?? "").toLowerCase() === "studio") {
                            setStudioRoomId(String(schedule.studioRoomId ?? ""));
                          }
                        }}
                        type="button"
                      >
                        <span
                          className={`grid size-4 shrink-0 place-items-center rounded border text-[10px] ${
                            checked
                              ? "border-white bg-white text-zinc-950"
                              : "border-zinc-300 bg-white/70 text-transparent dark:border-zinc-500 dark:bg-zinc-700/80"
                          }`}
                        >
                          ✓
                        </span>
                        <span className="min-w-0 flex-1 truncate">{option.label}</span>
                      </button>
                    );
                  })
                )}
              </div>
              {isStudioMode && rescheduleDate ? (
                <select
                  className="h-10 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl focus:ring-2 focus:ring-sky-200 dark:border-zinc-600 dark:bg-zinc-800/75 dark:text-zinc-100 dark:focus:ring-zinc-500"
                  disabled={controlDisabled}
                  onChange={(event) => setStudioRoomId(event.target.value)}
                  value={studioRoomId}
                >
                  <option value="">Select studio room</option>
                  {availableStudioRooms.map((room) => (
                    <option disabled={room.disabled} key={room.id} value={room.id}>
                      {room.label}
                    </option>
                  ))}
                </select>
              ) : null}
              <Button
                disabled={controlDisabled}
                onClick={() => {
                  if (needsStudioOverride && !studioRoomId) {
                    toast.error("Pilih studio room pengganti dulu");
                    return;
                  }
                  void onCreateRescheduleSession({
                    attendanceRow: attendance,
                    fromTime: rescheduleFromTime,
                    rescheduleDate,
                    studioRoomId: String(schedule.lessonMode ?? "").toLowerCase() === "studio"
                      ? (studioRoomId || String(schedule.studioRoomId ?? ""))
                      : "",
                    toTime: rescheduleToTime,
                  });
                }}
                size="sm"
                type="button"
                variant="glass"
              >
                Add reschedule session
              </Button>
            </div>
          ) : requiresReschedule ? (
            <p className="text-xs italic text-zinc-500 dark:text-zinc-300">
              Set reschedule required to add a replacement session.
            </p>
          ) : null}

          

          <input
            className="h-10 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl focus:ring-2 focus:ring-sky-200 dark:border-zinc-600 dark:bg-zinc-800/75 dark:text-zinc-100 dark:focus:ring-zinc-500"
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
        <p className="text-xs text-zinc-500">Instructor attendance belum tersedia.</p>
      )}
    </AttendanceModalShell>
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
  if (status === "Rescheduled") return "warning";
  return "danger";
}

function instructorStatusVariant(status: string) {
  if (status === "Present") return "success";
  if (status === "Pending") return "outline";
  if (status === "Rescheduled") return "warning";
  return "danger";
}

function statusDotClass(status: string) {
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

type StudioRoomOption = {
  id: string;
  label: string;
  disabled: boolean;
};

function buildRescheduleSlotOptions({
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

function buildRescheduleDateOptions({
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
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const maxRescheduleDate = getMaxRescheduleDate(schedule);
  const endDate = maxRescheduleDate && maxRescheduleDate < startDate ? startDate : (maxRescheduleDate ?? startDate);
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

function findRescheduleSlotValueForSchedule(
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

function isStudioRoomBooked({
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

function Info({
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
