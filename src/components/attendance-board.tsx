"use client";

import { AlertTriangle, CalendarCheck, CalendarDays, ChevronLeft, ChevronRight, RefreshCw, Search, UserRound, X } from "lucide-react";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  InstructorAttendanceModal,
  InstructorSessionCard,
  PackageSelector,
  SessionCard,
  SessionRail,
  StudentAttendanceModal,
} from "@/components/attendance-board-components";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  buildGroup,
  buildRescheduleDateOptions,
  buildRescheduleSlotOptions,
  combineAttendanceGroups,
  findRescheduleSlotValueForSchedule,
  formatDateTime,
  Info,
  indonesianDayName,
  instructorProgressLabel,
  instructorStatusVariant,
  isStudioRoomBooked,
  mapById,
  packageLabel,
  packageRescheduleQuota,
  packageRescheduleUsage,
  pendingRescheduleLabel,
  prepareAttendanceGroups,
  rescheduleTargetForSchedule,
  scheduleDateTime,
  selectedAttendanceGroup,
  statusDotClass,
  statusVariant,
  stringField,
  studentName,
  studentProgressLabel,
} from "@/components/attendance-board-utils";
import type { StudioRoomOption } from "@/components/attendance-board-utils";
import { formatDisplayText } from "@/lib/utils";

export type Row = Record<string, unknown> & { id: string };

export type SessionRow = {
  schedule: Row;
  attendance: Row | null;
};

export type SelectedSession = SessionRow & {
  sessionNumber: number;
};

export type AttendanceGroup = {
  id: string;
  package: Row | null;
  student: Row | null;
  course: Row | null;
  instructor: Row | null;
  sessions: SessionRow[];
};

export type CombinedAttendanceGroup = {
  id: string;
  groups: AttendanceGroup[];
  student: Row | null;
  course: Row | null;
};

const indonesianDayOptions = [
  { label: "Minggu", value: "0" },
  { label: "Senin", value: "1" },
  { label: "Selasa", value: "2" },
  { label: "Rabu", value: "3" },
  { label: "Kamis", value: "4" },
  { label: "Jumat", value: "5" },
  { label: "Sabtu", value: "6" },
];

function currentMonthValue() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

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
  const [searchTerm, setSearchTerm] = useState("");
  const [monthFilter, setMonthFilter] = useState(() => currentMonthValue());
  const [dayFilter, setDayFilter] = useState("");
  const [sortMode, setSortMode] = useState<"nearest" | "default">("nearest");
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
      const response = await fetch(`/api/attendance-board?month=${encodeURIComponent(monthFilter)}`, {
        cache: "no-store",
      });
      const json = (await response.json()) as {
        data?: {
          attendance?: Row[];
          courses?: Row[];
          instructorAttendance?: Row[];
          instructorAvailability?: Row[];
          instructors?: Row[];
          lessonPackages?: Row[];
          role?: string;
          schedules?: Row[];
          students?: Row[];
          studioRooms?: Row[];
        };
        error?: string;
      };

      if (!response.ok) {
        throw new Error(json.error ?? "Unable to load attendance");
      }

      setPackages(json.data?.lessonPackages ?? []);
      setStudents(json.data?.students ?? []);
      setCourses(json.data?.courses ?? []);
      setInstructors(json.data?.instructors ?? []);
      setInstructorAvailability(json.data?.instructorAvailability ?? []);
      setStudioRooms(json.data?.studioRooms ?? []);
      setSchedules(json.data?.schedules ?? []);
      setAttendance(json.data?.attendance ?? []);
      setInstructorAttendance(json.data?.instructorAttendance ?? []);
      setSessionRole(json.data?.role ?? "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load attendance");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [monthFilter]);

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
  const activeGroups = useMemo(
    () =>
      prepareAttendanceGroups(
        activeTab === "students" ? studentGroups : instructorGroups,
        searchTerm,
        dayFilter,
        sortMode,
      ),
    [activeTab, dayFilter, instructorGroups, searchTerm, sortMode, studentGroups],
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

      <Card className="liquid-glass">
        <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:p-4">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <input
              className="h-10 w-full rounded-2xl border border-white/50 bg-white/58 pl-9 pr-9 text-sm text-zinc-900 outline-none backdrop-blur-xl transition placeholder:text-zinc-400 focus:border-sky-300 focus:bg-white/75 focus:ring-2 focus:ring-sky-200"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by student name"
              type="search"
              value={searchTerm}
            />
            {searchTerm ? (
              <button
                aria-label="Clear attendance search"
                className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-zinc-500 transition hover:bg-white/70 hover:text-zinc-900"
                onClick={() => setSearchTerm("")}
                type="button"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>

          <input
            className="h-10 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl transition focus:border-sky-300 focus:bg-white/75 focus:ring-2 focus:ring-sky-200 md:w-[150px]"
            onChange={(event) => setMonthFilter(event.target.value)}
            type="month"
            value={monthFilter}
          />
          
          {/* Desktop: native select */}
          <select
            className="hidden h-10 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl transition focus:border-sky-300 focus:bg-white/75 focus:ring-2 focus:ring-sky-200 md:block md:w-[170px]"
            onChange={(event) => setDayFilter(event.target.value)}
            value={dayFilter}
          >
            <option value="">Semua hari</option>
            {indonesianDayOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          {/* Mobile: custom Select */}
          <Select 
            value={dayFilter || "ALL"} 
            onValueChange={(val) => setDayFilter(val === "ALL" ? "" : val)}
          >
            <SelectTrigger className="h-10 w-full rounded-2xl border-white/50 bg-white/58 text-sm text-zinc-900 focus:border-sky-300 focus:ring-sky-200 md:hidden">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="py-1.5">Semua hari</SelectItem>
              {indonesianDayOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} className="py-1.5">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Desktop: native select */}
          <select
            className="hidden h-10 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl transition focus:border-sky-300 focus:bg-white/75 focus:ring-2 focus:ring-sky-200 md:block md:w-[210px]"
            onChange={(event) => setSortMode(event.target.value as "nearest" | "default")}
            value={sortMode}
          >
            <option value="nearest">Schedule terdekat</option>
            <option value="default">Default order</option>
          </select>
          
          {/* Mobile: custom Select */}
          <Select value={sortMode} onValueChange={(val) => setSortMode(val as "nearest" | "default")}>
            <SelectTrigger className="h-10 w-full rounded-2xl border-white/50 bg-white/58 text-sm text-zinc-900 focus:border-sky-300 focus:ring-sky-200 md:hidden">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nearest" className="py-1.5">Schedule terdekat</SelectItem>
              <SelectItem value="default" className="py-1.5">Default order</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {loading ? (
          <Card className="liquid-glass">
            <CardContent className="space-y-3 p-5">
              <div className="h-5 w-40 animate-pulse rounded-lg bg-white/45" />
              <div className="h-24 w-full animate-pulse rounded-2xl bg-white/40" />
            </CardContent>
          </Card>
        ) : null}

        {!loading && activeGroups.length === 0 ? (
          <Card className="liquid-glass">
            <CardContent className="p-5 text-sm text-zinc-500">
              {searchTerm.trim() || dayFilter || monthFilter
                ? "Tidak ada attendance yang cocok dengan filter."
                : "Belum ada attendance. Buat Lesson Package dulu supaya schedules dan attendance otomatis muncul."}
            </CardContent>
          </Card>
        ) : null}

        {activeTab === "students" ? activeGroups.map((combinedGroup) => {
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
        }) : activeGroups.map((combinedGroup) => {
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
            attendanceRows={attendance}
            disabled={readOnlyPortal || savingId === selectedStudentAttendance?.id}
            instructorAvailability={instructorAvailability}
            instructorAttendanceRows={instructorAttendance}
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
            attendanceRows={attendance}
            disabled={readOnlyPortal || savingId === selectedInstructorAttendance?.id}
            instructorAttendanceRows={instructorAttendance}
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
