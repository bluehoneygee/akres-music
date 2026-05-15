"use client";

import { CalendarDays, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

export function ScheduleBoard() {
  const [packages, setPackages] = useState<Row[]>([]);
  const [students, setStudents] = useState<Row[]>([]);
  const [courses, setCourses] = useState<Row[]>([]);
  const [instructors, setInstructors] = useState<Row[]>([]);
  const [rooms, setRooms] = useState<Row[]>([]);
  const [schedules, setSchedules] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

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

  const groups = useMemo(() => {
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
            <p className="mt-2 text-sm text-zinc-500">
              Jadwal digroup per paket les. Setiap paket tampil satu baris, detail sesi ada di kanan.
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

        {groups.map((group) => (
          <Card className="liquid-glass" key={group.id}>
            <CardContent className="grid gap-4 p-4 xl:grid-cols-[300px_minmax(0,1fr)]">
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
                  <Info label="Room" value={group.room ? stringField(group.room, "roomName") : lessonLocation(group)} />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
                {group.schedules.map((schedule, index) => (
                  <ScheduleSessionCard
                    key={schedule.id}
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

function ScheduleSessionCard({
  schedule,
  sessionNumber,
}: {
  schedule: Row;
  sessionNumber: number;
}) {
  const status = String(schedule.scheduleStatus ?? "Scheduled");

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
        <Badge variant={scheduleStatusVariant(status)}>{formatDisplayText(status)}</Badge>
      </div>

      {schedule.originalScheduleId ? (
        <div className="mt-3 rounded-2xl border border-white/40 bg-white/36 px-3 py-2 text-xs text-zinc-500">
          Makeup/reschedule dari {String(schedule.originalScheduleId)}
        </div>
      ) : null}
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

function stringField(row: Row | null, key: string) {
  return formatDisplayText(row?.[key]);
}

function studentName(student: Row | null) {
  if (!student) return "Unknown student";
  return formatDisplayText(`${String(student.firstName ?? "")} ${String(student.lastName ?? "")}`);
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/40 bg-white/36 px-3 py-2">
      <p className="uppercase tracking-[0.08em] text-zinc-400">{label}</p>
      <p className="mt-1 font-medium text-zinc-800">{value || "-"}</p>
    </div>
  );
}
