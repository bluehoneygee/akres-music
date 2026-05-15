"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, RefreshCw, UserRound } from "lucide-react";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDisplayText } from "@/lib/utils";

type Row = Record<string, unknown> & { id: string };

type ScheduleGroup = {
  id: string;
  package: Row | null;
  student: Row | null;
  course: Row | null;
  instructor: Row | null;
  room: Row | null;
  schedules: Row[];
};

type CombinedScheduleGroup = {
  id: string;
  groups: ScheduleGroup[];
  student: Row | null;
  course: Row | null;
};

export function ScheduleBoard() {
  const [packages, setPackages] = useState<Row[]>([]);
  const [students, setStudents] = useState<Row[]>([]);
  const [courses, setCourses] = useState<Row[]>([]);
  const [instructors, setInstructors] = useState<Row[]>([]);
  const [rooms, setRooms] = useState<Row[]>([]);
  const [schedules, setSchedules] = useState<Row[]>([]);
  const [selectedPackageByGroup, setSelectedPackageByGroup] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const schedulesById = useMemo(() => mapById(schedules), [schedules]);

  async function loadData() {
    setLoading(true);

    try {
      const [packageRows, studentRows, courseRows, instructorRows, roomRows, scheduleRows] =
        await Promise.all([
          fetchRows("lesson-packages"),
          fetchRows("students"),
          fetchRows("courses"),
          fetchRows("instructors"),
          fetchRows("rooms"),
          fetchRows("schedules"),
        ]);

      setPackages(packageRows);
      setStudents(studentRows);
      setCourses(courseRows);
      setInstructors(instructorRows);
      setRooms(roomRows);
      setSchedules(scheduleRows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load schedules");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const packageGroups = useMemo(() => {
    const studentsById = mapById(students);
    const coursesById = mapById(courses);
    const instructorsById = mapById(instructors);
    const roomsById = mapById(rooms);
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
        roomsById,
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
          roomsById,
        }),
      );

    return [...packageGroups, ...orphanGroups].filter((group) => group.schedules.length > 0);
  }, [courses, instructors, packages, rooms, schedules, students]);

  const groups = useMemo(() => combineScheduleGroups(packageGroups), [packageGroups]);

  return (
    <div className="space-y-4">
      <Card className="liquid-glass">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-zinc-500">Academic workflow</p>
            <CardTitle className="mt-1 flex items-center gap-2 text-2xl">
              <CalendarDays className="size-6" />
              Course Schedules
            </CardTitle>
          </div>
          <Button onClick={loadData} size="icon" variant="glass" aria-label="Refresh">
            <RefreshCw className="size-4" />
          </Button>
        </CardHeader>
      </Card>

      <div className="space-y-3">
        {loading ? (
          <Card className="liquid-glass">
            <CardContent className="p-5 text-sm text-zinc-500">Loading schedules...</CardContent>
          </Card>
        ) : null}

        {!loading && groups.length === 0 ? (
          <Card className="liquid-glass">
            <CardContent className="p-5 text-sm text-zinc-500">
              Belum ada schedule. Buat Lesson Package dulu supaya 4 sesi otomatis muncul.
            </CardContent>
          </Card>
        ) : null}

        {groups.map((combinedGroup) => {
          const group = selectedScheduleGroup(
            combinedGroup,
            selectedPackageByGroup[combinedGroup.id],
          );

          return (
          <Card className="liquid-glass" key={combinedGroup.id}>
            <CardContent className="grid gap-3 p-3 sm:p-4 xl:grid-cols-[300px_minmax(0,1fr)] xl:gap-4">
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
                <div className="no-scrollbar flex gap-3 overflow-x-auto whitespace-nowrap text-xs text-zinc-600 sm:grid sm:grid-cols-2 sm:gap-1.5 sm:overflow-visible sm:whitespace-normal">
                  <Info icon={<UserRound className="size-3.5" />} label="Instructor" value={stringField(group.instructor, "instructorName")} />
                  <Info icon={<CalendarDays className="size-3.5" />} label="Period" value={stringField(group.package, "billingPeriod")} />
                  <Info mobileHidden icon={<Clock3 className="size-3.5" />} label="Start" value={stringField(group.package, "lessonStartDate")} />
                  <Info icon={<MapPin className="size-3.5" />} label="Room" value={group.room ? stringField(group.room, "roomName") : lessonLocation(group)} />
                </div>
              </div>

              <SessionRail>
                {group.schedules.map((schedule, index) => (
                  <ScheduleSessionCard
                    key={schedule.id}
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
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase text-zinc-500">Sessions</p>
        <div className="flex gap-2">
        <Button
          aria-label="Previous sessions"
          onClick={() => scrollByCard("left")}
          className="size-8 sm:size-10"
          size="icon"
          type="button"
          variant="glass"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          aria-label="Next sessions"
          onClick={() => scrollByCard("right")}
          className="size-8 sm:size-10"
          size="icon"
          type="button"
          variant="glass"
        >
          <ChevronRight className="size-4" />
        </Button>
        </div>
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

function ScheduleSessionCard({
  schedule,
  schedulesById,
  sessionNumber,
}: {
  schedule: Row;
  schedulesById: Map<string, Row>;
  sessionNumber: number;
}) {
  const status = String(schedule.scheduleStatus ?? "Scheduled");
  const originalSchedule = schedulesById.get(String(schedule.originalScheduleId ?? ""));

  return (
    <div className="min-h-[124px] w-[235px] shrink-0 snap-start rounded-2xl border border-white/45 bg-white/42 p-3 sm:min-h-[138px] sm:w-[280px]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase text-zinc-500">Session {sessionNumber}</p>
          <p className="mt-1 truncate font-semibold text-zinc-950">{String(schedule.scheduleDate ?? "-")}</p>
          <p className="text-xs text-zinc-500">
            {String(schedule.fromTime ?? "-")} - {String(schedule.toTime ?? "-")}
          </p>
        </div>
        <Badge className="shrink-0 px-2 py-0.5" variant={scheduleStatusVariant(status)}>
          {formatDisplayText(status)}
        </Badge>
      </div>

      {schedule.originalScheduleId ? (
        <RescheduleBadge
          value={originalSchedule ? scheduleDateTime(originalSchedule) : "Original session"}
        />
      ) : null}
    </div>
  );
}

function RescheduleBadge({ value }: { value: string }) {
  return (
    <div className="mt-3 flex w-fit max-w-full flex-col items-start gap-2 rounded-2xl border border-amber-200/70 bg-amber-100/70 px-3 py-2 text-xs text-amber-950 shadow-sm">
      <span className="shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
        Rescheduled From
      </span>
      <span className="min-w-0 break-words font-medium">{value}</span>
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
  roomsById,
}: {
  id: string;
  lessonPackage: Row | null;
  packageSchedules: Row[];
  studentsById: Map<string, Row>;
  coursesById: Map<string, Row>;
  instructorsById: Map<string, Row>;
  roomsById: Map<string, Row>;
}): ScheduleGroup {
  const schedules = [...packageSchedules].sort((left, right) =>
    String(left.scheduleDate ?? "").localeCompare(String(right.scheduleDate ?? "")),
  );
  const firstSchedule = schedules[0];
  const studentId = String(lessonPackage?.studentId ?? firstSchedule?.studentId ?? "");
  const courseId = String(lessonPackage?.courseId ?? firstSchedule?.courseId ?? "");
  const instructorId = String(lessonPackage?.instructorId ?? firstSchedule?.instructorId ?? "");
  const roomId = String(lessonPackage?.studioRoomId ?? firstSchedule?.studioRoomId ?? "");

  return {
    id,
    package: lessonPackage,
    student: studentsById.get(studentId) ?? null,
    course: coursesById.get(courseId) ?? null,
    instructor: instructorsById.get(instructorId) ?? null,
    room: roomsById.get(roomId) ?? null,
    schedules,
  };
}

function mapById(rows: Row[]) {
  return new Map(rows.map((row) => [row.id, row]));
}

function combineScheduleGroups(groups: ScheduleGroup[]) {
  const combined = new Map<string, CombinedScheduleGroup>();

  groups.forEach((group) => {
    const studentId = String(group.package?.studentId ?? group.schedules[0]?.studentId ?? group.student?.id ?? "");
    const courseId = String(group.package?.courseId ?? group.schedules[0]?.courseId ?? group.course?.id ?? "");
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

function selectedScheduleGroup(group: CombinedScheduleGroup, selectedId?: string) {
  return group.groups.find((packageGroup) => packageGroup.id === selectedId) ?? group.groups[0];
}

function packageSortKey(group: ScheduleGroup) {
  return String(group.package?.billingPeriod ?? group.package?.lessonStartDate ?? group.id);
}

function packageLabel(group: ScheduleGroup) {
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

function lessonLocation(group: ScheduleGroup) {
  const homeVisitAddress = String(group.package?.homeVisitAddress ?? group.schedules[0]?.homeVisitAddress ?? "");
  if (homeVisitAddress) return "Home Visit";
  return "-";
}

function scheduleStatusVariant(status: string) {
  if (status === "Completed") return "success";
  if (status === "Scheduled") return "outline";
  if (status === "Rescheduled") return "warning";
  return "danger";
}

function Info({
  className = "",
  icon,
  label,
  mobileHidden = false,
  value,
}: {
  className?: string;
  icon: ReactNode;
  label: string;
  mobileHidden?: boolean;
  value: string;
}) {
  return (
    <span className={`${mobileHidden ? "hidden sm:block" : "inline-flex"} min-w-0 shrink-0 items-center gap-1.5 sm:block sm:rounded-2xl sm:border sm:border-white/40 sm:bg-white/36 sm:px-3 sm:py-2 ${className}`}>
      <span className="shrink-0 text-zinc-500 sm:hidden">{icon}</span>
      <span className="hidden truncate text-[10px] uppercase tracking-[0.08em] text-zinc-400 sm:block sm:text-xs">
        {label}
      </span>
      <span className="truncate sm:mt-1 sm:block sm:text-sm sm:font-medium sm:text-zinc-800">{value || "-"}</span>
    </span>
  );
}
