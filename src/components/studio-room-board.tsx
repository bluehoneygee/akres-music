"use client";

import { CalendarDays, ChevronLeft, ChevronRight, DoorOpen, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDisplayText } from "@/lib/utils";

type Row = Record<string, unknown> & { id: string };

const weekdayOperatingHours = {
  from: "10:00",
  to: "19:00",
};

const weekendOperatingHours = {
  from: "08:00",
  to: "19:00",
};

export function StudioRoomBoard() {
  const [rooms, setRooms] = useState<Row[]>([]);
  const [schedules, setSchedules] = useState<Row[]>([]);
  const [students, setStudents] = useState<Row[]>([]);
  const [courses, setCourses] = useState<Row[]>([]);
  const [instructors, setInstructors] = useState<Row[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [monthDate, setMonthDate] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);

    try {
      const [roomRows, scheduleRows, studentRows, courseRows, instructorRows] = await Promise.all([
        fetchRows("rooms"),
        fetchRows("schedules"),
        fetchRows("students"),
        fetchRows("courses"),
        fetchRows("instructors"),
      ]);
      const activeRooms = roomRows
        .filter((room) => room.isActive !== false)
        .sort((left, right) => String(left.roomName ?? "").localeCompare(String(right.roomName ?? "")));

      setRooms(activeRooms);
      setSchedules(scheduleRows);
      setStudents(studentRows);
      setCourses(courseRows);
      setInstructors(instructorRows);
      setSelectedRoomId((current) => current || activeRooms[0]?.id || "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load studio rooms");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const selectedRoom = rooms.find((room) => room.id === selectedRoomId);
  const monthCells = useMemo(() => buildMonthCells(monthDate), [monthDate]);
  const selectedCell = selectedDate ? monthCells.find((cell) => formatDate(cell.date) === selectedDate) : null;
  const studentsById = useMemo(() => mapById(students), [students]);
  const coursesById = useMemo(() => mapById(courses), [courses]);
  const instructorsById = useMemo(() => mapById(instructors), [instructors]);
  const schedulesById = useMemo(() => mapById(schedules), [schedules]);
  const rescheduledToByOriginalId = useMemo(() => mapRescheduledToByOriginalId(schedules), [schedules]);
  const roomSchedules = schedules.filter(
    (schedule) =>
      schedule.studioRoomId === selectedRoomId &&
      schedule.lessonMode === "Studio" &&
      String(schedule.scheduleStatus ?? "").toLowerCase() !== "cancelled",
  );
  const schedulesByDate = groupByDate(roomSchedules);
  const occupiedSchedulesByDate = groupByDate(
    roomSchedules.filter((schedule) => !isNonBlockingScheduleStatus(schedule.scheduleStatus)),
  );

  return (
    <div className="space-y-2.5">
      <Card className="liquid-glass">
        <CardHeader className="flex flex-row items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500">Studio operation</p>
            <CardTitle className="mt-0.5 flex items-center gap-2 text-lg sm:text-xl">
              <DoorOpen className="size-5" />
              Studio Rooms
            </CardTitle>
          </div>
          <Button onClick={loadData} size="icon" type="button" variant="glass" aria-label="Refresh">
            <RefreshCw className="size-4" />
          </Button>
        </CardHeader>
      </Card>

      <Card className="liquid-glass">
        <CardHeader className="flex flex-col gap-3 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="truncate text-sm sm:text-base">
              {selectedRoom ? formatDisplayText(selectedRoom.roomName) : "Studio room schedule"}
            </CardTitle>
            <p className="mt-0.5 text-xs text-zinc-500">{monthTitle(monthDate)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <div className="flex gap-1 rounded-full border border-white/40 bg-white/40 p-1 backdrop-blur-xl">
              {rooms.map((room) => (
                <Button
                  className="h-8 px-3 text-xs"
                  key={room.id}
                  onClick={() => setSelectedRoomId(room.id)}
                  size="sm"
                  type="button"
                  variant={room.id === selectedRoomId ? "default" : "ghost"}
                >
                  {formatDisplayText(room.roomName)}
                </Button>
              ))}
            </div>
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
            <Button className="h-8 px-2 text-xs" onClick={() => setMonthDate(startOfMonth(new Date()))} size="sm" type="button" variant="glass">
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
          {loading ? <p className="text-sm text-zinc-500">Loading room availability...</p> : null}
          {!loading && rooms.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-zinc-200/80 bg-white/45 px-3 py-2 text-sm text-zinc-500">
              Belum ada Studio A/B aktif.
            </p>
          ) : null}

          <div className="grid grid-cols-7 gap-1 px-0.5 pb-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div className="text-center text-[9px] font-semibold uppercase tracking-[0.04em] text-zinc-400 sm:text-[10px]" key={day}>
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthCells.map(({ date, inMonth }) => {
              const dateKey = formatDate(date);
              const bookedSlots = schedulesByDate[dateKey] ?? [];
              const activeBookedSlots = bookedSlots.filter((schedule) =>
                !isNonBlockingScheduleStatus(schedule.scheduleStatus),
              );
              const occupiedSlots = occupiedSchedulesByDate[dateKey] ?? [];
              const availableBlocks = availableBlocksForDay(occupiedSlots, date);

              return (
                <button
                  className={`min-h-[44px] rounded-xl border p-1 text-left transition hover:border-zinc-300 hover:bg-white/55 sm:min-h-[58px] sm:p-1.5 ${
                    inMonth ? "border-white/45 bg-white/38" : "border-white/25 bg-white/18 opacity-55"
                  }`}
                  key={dateKey}
                  onClick={() => setSelectedDate(dateKey)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-xs font-semibold leading-none text-zinc-950 sm:text-sm">{date.getUTCDate()}</p>
                    {activeBookedSlots.length > 0 ? (
                      <span className="rounded-full bg-white/70 px-1.5 py-0 text-[9px] font-semibold text-zinc-700">
                        {activeBookedSlots.length}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {bookedSlots.slice(0, 5).map((schedule) => (
                      <span
                        className={`size-1.5 rounded-full sm:size-2 ${
                          String(schedule.scheduleStatus ?? "").toLowerCase() === "rescheduled"
                            ? "bg-amber-500"
                            : "bg-sky-500"
                        }`}
                        key={schedule.id}
                      />
                    ))}
                    {availableBlocks.length > 0 ? (
                      <span className="size-1.5 rounded-full bg-emerald-500 sm:size-2" />
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedCell ? (
        <RoomDayDetailModal
          booked={schedulesByDate[selectedDate] ?? []}
          occupied={occupiedSchedulesByDate[selectedDate] ?? []}
          coursesById={coursesById}
          date={selectedCell.date}
          instructorsById={instructorsById}
          onClose={() => setSelectedDate("")}
          rescheduledToByOriginalId={rescheduledToByOriginalId}
          room={selectedRoom}
          schedulesById={schedulesById}
          studentsById={studentsById}
        />
      ) : null}
    </div>
  );
}

function RoomDayDetailModal({
  booked,
  occupied,
  coursesById,
  date,
  instructorsById,
  onClose,
  rescheduledToByOriginalId,
  room,
  schedulesById,
  studentsById,
}: {
  booked: Row[];
  occupied: Row[];
  coursesById: Map<string, Row>;
  date: Date;
  instructorsById: Map<string, Row>;
  onClose: () => void;
  rescheduledToByOriginalId: Map<string, Row>;
  room?: Row;
  schedulesById: Map<string, Row>;
  studentsById: Map<string, Row>;
}) {
  const availableBlocks = availableBlocksForDay(occupied, date);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/35 p-3 backdrop-blur-sm sm:items-center">
      <div className="max-h-[86vh] w-full max-w-[540px] overflow-y-auto rounded-3xl border border-white/55 bg-white/88 p-4 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">
              {formatDisplayText(room?.roomName)}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-zinc-950">{formatDate(date)}</h2>
          </div>
          <Button onClick={onClose} size="sm" type="button" variant="glass">
            Close
          </Button>
        </div>

        <div className="mt-4 grid gap-4">
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-emerald-500" />
              <h3 className="text-sm font-semibold text-zinc-950">Available blocks</h3>
            </div>
            {availableBlocks.length > 0 ? (
              availableBlocks.map((block) => (
                <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/80 px-3 py-2 text-emerald-950" key={`${block.from}-${block.to}`}>
                  <p className="text-sm font-semibold">{block.from} - {block.to}</p>
                  <p className="text-xs text-emerald-700">Room available</p>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-zinc-200/80 bg-white/45 px-3 py-2 text-sm text-zinc-500">
                No available block in operating hours.
              </p>
            )}
          </section>

          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-sky-500" />
              <h3 className="text-sm font-semibold text-zinc-950">Booked schedules</h3>
            </div>
            {booked.length > 0 ? (
              booked.map((schedule) => {
                const student = studentsById.get(String(schedule.studentId ?? ""));
                const course = coursesById.get(String(schedule.courseId ?? ""));
                const instructor = instructorsById.get(String(schedule.instructorId ?? ""));
                const originalSchedule = schedulesById.get(String(schedule.originalScheduleId ?? ""));
                const rescheduledTo = rescheduledToByOriginalId.get(String(schedule.id ?? ""));
                const isRescheduled = String(schedule.scheduleStatus ?? "").toLowerCase() === "rescheduled";
                const toneClass = isRescheduled
                  ? "border-amber-200/70 bg-amber-50/90 text-amber-950"
                  : "border-sky-200/70 bg-sky-50/90 text-sky-950";
                const subToneClass = isRescheduled ? "text-amber-700" : "text-sky-700";

                return (
                  <div className={`rounded-2xl border px-3 py-2 ${toneClass}`} key={schedule.id}>
                    <p className="text-sm font-semibold">{String(schedule.fromTime)} - {String(schedule.toTime)}</p>
                    {schedule.originalScheduleId ? (
                      <p className={`mt-1 text-[11px] italic ${subToneClass}`}>
                        Rescheduled from {originalSchedule
                          ? `${String(originalSchedule.scheduleDate || "-")}, ${String(originalSchedule.fromTime || "-")} - ${String(originalSchedule.toTime || "-")}`
                          : "original session"}
                      </p>
                    ) : null}
                    {rescheduledTo ? (
                      <p className={`mt-1 text-[11px] italic ${subToneClass}`}>
                        Rescheduled to {`${String(rescheduledTo.scheduleDate || "-")}, ${String(rescheduledTo.fromTime || "-")} - ${String(rescheduledTo.toTime || "-")}`}
                      </p>
                    ) : null}
                    <p className={`mt-0.5 text-xs ${subToneClass}`}>{studentName(student)}</p>
                    <p className={`text-xs ${subToneClass}`}>{formatDisplayText(course?.courseName)}</p>
                    <p className={`text-xs ${subToneClass}`}>{formatDisplayText(instructor?.instructorName)}</p>
                  </div>
                );
              })
            ) : (
              <p className="rounded-2xl border border-dashed border-zinc-200/80 bg-white/45 px-3 py-2 text-sm text-zinc-500">
                No booked schedule.
              </p>
            )}
          </section>
        </div>
      </div>
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

function availableBlocksForDay(booked: Row[], date: Date) {
  const operatingHours = getOperatingHours(date);
  const sorted = [...booked].sort((left, right) =>
    String(left.fromTime ?? "").localeCompare(String(right.fromTime ?? "")),
  );
  const blocks: Array<{ from: string; to: string }> = [];
  let cursor = operatingHours.from;

  sorted.forEach((schedule) => {
    const from = String(schedule.fromTime ?? "");
    const to = String(schedule.toTime ?? "");

    if (from && compareTimes(cursor, from) < 0) {
      blocks.push({ from: cursor, to: from });
    }

    if (to && compareTimes(cursor, to) < 0) {
      cursor = to;
    }
  });

  if (compareTimes(cursor, operatingHours.to) < 0) {
    blocks.push({ from: cursor, to: operatingHours.to });
  }

  return blocks;
}

function getOperatingHours(date: Date) {
  const day = date.getUTCDay();
  return day === 0 || day === 6 ? weekendOperatingHours : weekdayOperatingHours;
}

function compareTimes(left: string, right: string) {
  return timeToMinutes(left) - timeToMinutes(right);
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function mapById(rows: Row[]) {
  return new Map(rows.map((row) => [row.id, row]));
}

function mapRescheduledToByOriginalId(rows: Row[]) {
  const map = new Map<string, Row>();
  rows.forEach((row) => {
    const originalId = String(row.originalScheduleId ?? "");
    if (!originalId) return;
    if (String(row.scheduleStatus ?? "").toLowerCase() === "cancelled") return;
    if (!map.has(originalId)) {
      map.set(originalId, row);
    }
  });
  return map;
}

function groupByDate(rows: Row[]) {
  return rows.reduce<Record<string, Row[]>>((acc, row) => {
    const date = String(row.scheduleDate ?? "");

    if (!acc[date]) acc[date] = [];
    acc[date].push(row);
    acc[date].sort((left, right) =>
      String(left.fromTime ?? "").localeCompare(String(right.fromTime ?? "")),
    );
    return acc;
  }, {});
}

function startOfMonth(value: Date) {
  return new Date(Date.UTC(value.getFullYear(), value.getMonth(), 1));
}

function startOfWeek(value: Date) {
  const date = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;

  date.setUTCDate(date.getUTCDate() + diff);
  return date;
}

function addMonths(value: Date, amount: number) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + amount, 1));
}

function addDays(value: Date, amount: number) {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return date;
}

function buildMonthCells(monthDate: Date) {
  const monthStart = startOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart);
  const month = monthStart.getUTCMonth();

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);

    return {
      date,
      inMonth: date.getUTCMonth() === month,
    };
  });
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function monthTitle(value: Date) {
  return value.toLocaleString("en-US", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  });
}

function isNonBlockingScheduleStatus(status: unknown) {
  const normalized = String(status ?? "").trim().toLowerCase();
  return normalized === "cancelled" || normalized === "rescheduled";
}

function studentName(student?: Row) {
  if (!student) return "Unknown student";
  return formatDisplayText(`${String(student.firstName ?? "")} ${String(student.lastName ?? "")}`);
}
