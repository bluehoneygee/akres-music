"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, RefreshCw, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDisplayText } from "@/lib/utils";

type Row = Record<string, unknown> & { id: string };

export function StudentCalendarBoard() {
  const [schedules, setSchedules] = useState<Row[]>([]);
  const [students, setStudents] = useState<Row[]>([]);
  const [courses, setCourses] = useState<Row[]>([]);
  const [instructors, setInstructors] = useState<Row[]>([]);
  const [rooms, setRooms] = useState<Row[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [monthDate, setMonthDate] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const [scheduleRows, studentRows, courseRows, instructorRows, roomRows] = await Promise.all([
        fetchRows("schedules"),
        fetchRows("students"),
        fetchRows("courses"),
        fetchRows("instructors"),
        fetchRows("rooms"),
      ]);
      setSchedules(scheduleRows);
      setStudents(studentRows);
      setCourses(courseRows);
      setInstructors(instructorRows);
      setRooms(roomRows);
      setSelectedStudentId((current) => current || studentRows[0]?.id || "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load student calendar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const studentsById = useMemo(() => mapById(students), [students]);
  const coursesById = useMemo(() => mapById(courses), [courses]);
  const instructorsById = useMemo(() => mapById(instructors), [instructors]);
  const roomsById = useMemo(() => mapById(rooms), [rooms]);
  const monthCells = useMemo(() => buildMonthCells(monthDate), [monthDate]);
  const selectedCell = selectedDate ? monthCells.find((cell) => formatDate(cell.date) === selectedDate) : null;
  const schedulesByDate = useMemo(() => {
    const filtered = schedules.filter((row) => {
      if (!inCurrentGridMonth(row, monthDate)) return false;
      if (!selectedStudentId) return true;
      return String(row.studentId || "") === selectedStudentId;
    });
    return groupByDate(filtered);
  }, [schedules, monthDate, selectedStudentId]);

  return (
    <div className="space-y-2.5">
      <Card className="liquid-glass">
        <CardHeader className="flex flex-row items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500">Portal calendar</p>
            <CardTitle className="mt-0.5 flex items-center gap-2 text-lg sm:text-xl">
              <CalendarDays className="size-5" />
              Student Calendar
            </CardTitle>
          </div>
          <Button aria-label="Refresh" onClick={loadData} size="icon" variant="glass">
            <RefreshCw className="size-4" />
          </Button>
        </CardHeader>
      </Card>

      <Card className="liquid-glass">
        <CardHeader className="flex flex-row items-center justify-between gap-2 px-3 py-2.5">
          <div>
            <CardTitle className="truncate text-sm sm:text-base">
              {selectedStudentId
                ? formatDisplayText(studentDisplayName(studentsById.get(selectedStudentId)) || "Jadwal Bulanan Student")
                : "Jadwal Bulanan Student"}
            </CardTitle>
            <p className="mt-0.5 text-xs text-zinc-500">{monthTitle(monthDate)}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <select
              aria-label="Select student"
              className="h-8 max-w-[160px] rounded-xl border border-white/50 bg-white/58 px-2.5 text-xs text-zinc-900 outline-none backdrop-blur-xl sm:max-w-[220px] sm:text-sm"
              onChange={(event) => setSelectedStudentId(event.target.value)}
              value={selectedStudentId}
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {formatDisplayText(studentDisplayName(student) || "-")}
                </option>
              ))}
            </select>
            <Button
              aria-label="Previous month"
              className="size-8"
              onClick={() => setMonthDate(addMonths(monthDate, -1))}
              size="icon"
              type="button"
              variant="glass"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              className="h-8 px-2 text-xs"
              onClick={() => setMonthDate(startOfMonth(new Date()))}
              size="sm"
              type="button"
              variant="glass"
            >
              {monthTitle(monthDate)}
            </Button>
            <Button
              aria-label="Next month"
              className="size-8"
              onClick={() => setMonthDate(addMonths(monthDate, 1))}
              size="icon"
              type="button"
              variant="glass"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 px-2 pb-2 sm:px-3 sm:pb-3">
          {loading ? <p className="text-sm text-zinc-500">Loading calendar...</p> : null}

          <div className="pb-1">
            <div className="w-full">
              <div className="grid grid-cols-7 gap-1 px-0.5 pb-1">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                  <div
                    className="text-center text-[9px] font-semibold uppercase tracking-[0.04em] text-zinc-400 sm:text-[10px]"
                    key={day}
                  >
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthCells.map(({ date, inMonth }) => {
                  const dateKey = formatDate(date);
                  const daySchedules = schedulesByDate[dateKey] ?? [];

                  return (
                    <button
                      className={`min-h-[38px] rounded-xl border p-1 text-left transition hover:border-zinc-300 hover:bg-white/55 sm:min-h-[52px] sm:p-1.5 ${
                        inMonth ? "border-white/45 bg-white/38" : "border-white/25 bg-white/18 opacity-55"
                      }`}
                      key={dateKey}
                      onClick={() => setSelectedDate(dateKey)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold leading-none text-zinc-950 sm:text-sm">
                          {date.getUTCDate()}
                        </p>
                        {daySchedules.length > 0 ? (
                          <span className="rounded-full bg-white/70 px-1.5 py-0 text-[9px] font-semibold text-zinc-700">
                            {daySchedules.length}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {daySchedules.slice(0, 5).map((schedule) => (
                          <span
                            className={`size-1.5 rounded-full sm:size-2 ${
                              String(schedule.lessonMode || "") === "Studio" ? "bg-sky-500" : "bg-violet-500"
                            }`}
                            key={schedule.id}
                            title={`${String(schedule.fromTime || "")} - ${String(schedule.toTime || "")}`}
                          />
                        ))}
                        {daySchedules.length > 5 ? (
                          <span className="text-[8px] font-semibold text-zinc-500">+{daySchedules.length - 5}</span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedCell ? (
        <DayDetailModal
          coursesById={coursesById}
          date={selectedCell.date}
          instructorsById={instructorsById}
          onClose={() => setSelectedDate("")}
          roomsById={roomsById}
          schedules={schedulesByDate[selectedDate] ?? []}
          studentsById={studentsById}
        />
      ) : null}
    </div>
  );
}

function DayDetailModal({
  coursesById,
  date,
  instructorsById,
  onClose,
  roomsById,
  schedules,
  studentsById,
}: {
  coursesById: Map<string, Row>;
  date: Date;
  instructorsById: Map<string, Row>;
  onClose: () => void;
  roomsById: Map<string, Row>;
  schedules: Row[];
  studentsById: Map<string, Row>;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/35 p-3 backdrop-blur-sm sm:items-center">
      <div className="max-h-[86vh] w-full max-w-[560px] overflow-y-auto rounded-3xl border border-white/55 bg-white/88 p-4 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">Student Calendar</p>
            <h2 className="mt-1 text-xl font-semibold text-zinc-950">{formatDateLabel(date)}</h2>
          </div>
          <Button onClick={onClose} size="sm" type="button" variant="glass">
            Close
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          {schedules.length > 0 ? (
            schedules.map((schedule) => {
              const student = studentsById.get(String(schedule.studentId || ""));
              const course = coursesById.get(String(schedule.courseId || ""));
              const instructor = instructorsById.get(String(schedule.instructorId || ""));
              const room = roomsById.get(String(schedule.studioRoomId || ""));
              const mode = String(schedule.lessonMode || "");
              return (
                <div className="rounded-2xl border border-white/60 bg-white/55 p-3" key={schedule.id}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-zinc-900">
                      {String(schedule.fromTime || "-")} - {String(schedule.toTime || "-")}
                    </p>
                    <Badge className="h-5 rounded-md px-1.5 text-[10px]" variant="secondary">
                      {formatDisplayText(String(schedule.scheduleStatus || "Scheduled"))}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-col gap-1 text-xs text-zinc-700">
                    <p className="inline-flex items-center gap-1">
                      <UserRound className="size-3.5" />
                      {formatDisplayText(studentDisplayName(student) || "-")}
                    </p>
                    <p>{formatDisplayText(String(course?.courseName || "-"))}</p>
                    <p>{formatDisplayText(String(instructor?.instructorName || "-"))}</p>
                    <p className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      {mode === "Studio"
                        ? formatDisplayText(String(room?.roomName || "-"))
                        : formatDisplayText(String(schedule.homeVisitAddress || "Home Visit"))}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="rounded-2xl border border-dashed border-zinc-200/80 bg-white/45 px-3 py-2 text-sm text-zinc-500">
              Tidak ada jadwal pada tanggal ini.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

async function fetchRows(resource: string) {
  const response = await fetch(`/api/${resource}`, { cache: "no-store" });
  const json = (await response.json()) as { data?: Row[]; error?: string };
  if (!response.ok) throw new Error(json.error ?? `Unable to load ${resource}`);
  return Array.isArray(json.data) ? json.data : [];
}

function mapById(rows: Row[]) {
  return new Map(rows.map((row) => [row.id, row]));
}

function startOfMonth(value: Date) {
  return new Date(Date.UTC(value.getFullYear(), value.getMonth(), 1));
}

function monthTitle(value: Date) {
  return value.toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });
}

function addMonths(value: Date, amount: number) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + amount, 1));
}

function buildMonthCells(month: Date) {
  const firstDay = startOfWeek(startOfMonth(month));
  return Array.from({ length: 42 }).map((_, index) => {
    const date = new Date(firstDay);
    date.setUTCDate(firstDay.getUTCDate() + index);
    return {
      date,
      inMonth: date.getUTCMonth() === month.getUTCMonth(),
    };
  });
}

function startOfWeek(value: Date) {
  const date = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date;
}

function formatDate(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function groupByDate(rows: Row[]) {
  return rows.reduce<Record<string, Row[]>>((acc, row) => {
    const date = String(row.scheduleDate ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return acc;
    if (!acc[date]) acc[date] = [];
    acc[date].push(row);
    acc[date].sort((left, right) => String(left.fromTime ?? "").localeCompare(String(right.fromTime ?? "")));
    return acc;
  }, {});
}

function inCurrentGridMonth(row: Row, monthDate: Date) {
  const value = String(row.scheduleDate || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    date.getUTCMonth() === monthDate.getUTCMonth() &&
    date.getUTCFullYear() === monthDate.getUTCFullYear()
  );
}

function studentDisplayName(student: Row | undefined) {
  if (!student) return "";
  const studentName = String(student.studentName || "").trim();
  if (studentName) return studentName;
  const firstName = String(student.firstName || "").trim();
  const lastName = String(student.lastName || "").trim();
  const fullName = `${firstName} ${lastName}`.trim();
  if (fullName) return fullName;
  const name = String(student.name || "").trim();
  return name;
}
