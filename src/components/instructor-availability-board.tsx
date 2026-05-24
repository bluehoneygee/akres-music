"use client";

import { CalendarClock, ChevronLeft, ChevronRight, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hourlyLessonSlotOptions, lessonDayOptions } from "@/lib/options";
import { formatDisplayText } from "@/lib/utils";

type Row = Record<string, unknown> & { id: string };

const dayLabel = new Map(lessonDayOptions.map((option) => [option.value, option.label]));

export function InstructorAvailabilityBoard() {
  const [instructors, setInstructors] = useState<Row[]>([]);
  const [availability, setAvailability] = useState<Row[]>([]);
  const [schedules, setSchedules] = useState<Row[]>([]);
  const [students, setStudents] = useState<Row[]>([]);
  const [courses, setCourses] = useState<Row[]>([]);
  const [selectedInstructorId, setSelectedInstructorId] = useState("");
  const [draft, setDraft] = useState({
    dayOfWeek: "1",
    fromTime: "09:00",
  });
  const [selectedSlotValues, setSelectedSlotValues] = useState<string[]>(["09:00"]);
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [cursorDate, setCursorDate] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState("");
  const [availabilityFormOpen, setAvailabilityFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);

    try {
      const [instructorRows, availabilityRows, scheduleRows, studentRows, courseRows] =
        await Promise.all([
          fetchRows("instructors"),
          fetchRows("instructor-availability"),
          fetchRows("schedules"),
          fetchRows("students"),
          fetchRows("courses"),
        ]);

      setInstructors(instructorRows);
      setAvailability(availabilityRows);
      setSchedules(scheduleRows);
      setStudents(studentRows);
      setCourses(courseRows);
      setSelectedInstructorId((current) => current || instructorRows[0]?.id || "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load availability");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const studentsById = useMemo(() => mapById(students), [students]);
  const coursesById = useMemo(() => mapById(courses), [courses]);
  const selectedInstructor = instructors.find((instructor) => instructor.id === selectedInstructorId);
  const calendarCells = useMemo(
    () => (viewMode === "month" ? buildMonthCells(cursorDate) : buildWeekCells(cursorDate)),
    [cursorDate, viewMode],
  );
  const selectedCell = selectedDate ? calendarCells.find((cell) => formatDate(cell.date) === selectedDate) : null;
  const availabilityByDay = groupByDay(
    availability.filter((row) => row.instructorId === selectedInstructorId && row.active !== false),
    "dayOfWeek",
  );
  const existingSlotValuesForDraftDay = useMemo(() => {
    const rows = availabilityByDay[draft.dayOfWeek] ?? [];
    return new Set(rows.map((row) => String(row.fromTime || "")));
  }, [availabilityByDay, draft.dayOfWeek]);

  useEffect(() => {
    setSelectedSlotValues((current) => {
      const next = current.filter((value) => !existingSlotValuesForDraftDay.has(value));
      if (next.length === current.length && next.every((value, index) => value === current[index])) {
        return current;
      }
      return next;
    });
  }, [existingSlotValuesForDraftDay]);
  const schedulesByDate = groupByDate(
    schedules.filter((row) => row.instructorId === selectedInstructorId),
  );

  async function createAvailability() {
    if (!selectedInstructorId || !draft.dayOfWeek || selectedSlotValues.length === 0) {
      toast.error("Lengkapi instructor, hari, dan jam availability");
      return;
    }

    setSaving(true);

    try {
      const responses = await Promise.all(
        selectedSlotValues.map(async (fromTime) => {
          const response = await fetch("/api/instructor-availability", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              instructorId: selectedInstructorId,
              dayOfWeek: draft.dayOfWeek,
              fromTime,
              toTime: nextHour(fromTime),
              lessonMode: "Both",
              active: true,
            }),
          });
          const json = (await response.json()) as { error?: string };
          if (!response.ok) {
            throw new Error(json.error ?? `Unable to create availability for ${fromTime}`);
          }
          return response;
        }),
      );

      if (responses.length > 0) {
        toast.success(`${responses.length} availability slot saved`);
      }
      setAvailabilityFormOpen(false);
      setSelectedSlotValues([draft.fromTime]);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create availability");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAvailability(id: string) {
    setSaving(true);

    try {
      const response = await fetch(`/api/instructor-availability/${id}`, { method: "DELETE" });
      const json = (await response.json()) as { error?: string };

      if (!response.ok) throw new Error(json.error ?? "Unable to delete availability");

      toast.success("Availability deleted");
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete availability");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2.5">
      <Card className="liquid-glass">
        <CardHeader className="flex flex-row items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500">Academic workflow</p>
            <CardTitle className="mt-0.5 flex items-center gap-2 text-lg sm:text-xl">
              <CalendarClock className="size-5" />
              Instructor Calendar
            </CardTitle>
          </div>
          <Button onClick={loadData} size="icon" variant="glass" aria-label="Refresh">
            <RefreshCw className="size-4" />
          </Button>
        </CardHeader>
      </Card>

      <Card className="liquid-glass">
        <CardHeader className="flex flex-row items-center justify-between gap-2 px-3 py-2.5">
          <div>
            <CardTitle className="truncate text-sm sm:text-base">
              {selectedInstructor ? formatDisplayText(selectedInstructor.instructorName) : "Instructor Schedule"}
            </CardTitle>
            <p className="mt-0.5 text-xs text-zinc-500">
              {viewMode === "month" ? monthTitle(cursorDate) : weekTitle(cursorDate)}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="sticky top-2 z-20 inline-flex rounded-full border border-white/60 bg-white/78 p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,.7),0_8px_18px_rgba(15,23,42,.08)] backdrop-blur-md">
              <button
                className={`h-7 rounded-full px-2.5 text-xs transition ${
                  viewMode === "month"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-zinc-600"
                }`}
                onClick={() => setViewMode("month")}
                type="button"
              >
                Month
              </button>
              <button
                className={`h-7 rounded-full px-2.5 text-xs transition ${
                  viewMode === "week"
                    ? "bg-sky-500 text-white shadow-sm"
                    : "text-zinc-600"
                }`}
                onClick={() => setViewMode("week")}
                type="button"
              >
                Week
              </button>
            </div>
            <select
              aria-label="Select instructor"
              className="h-8 max-w-[160px] rounded-xl border border-white/50 bg-white/58 px-2.5 text-xs text-zinc-900 outline-none backdrop-blur-xl sm:max-w-[220px] sm:text-sm"
              onChange={(event) => setSelectedInstructorId(event.target.value)}
              value={selectedInstructorId}
            >
              {instructors.map((instructor) => (
                <option key={instructor.id} value={instructor.id}>
                  {formatDisplayText(instructor.instructorName)}
                </option>
              ))}
            </select>
            <Button
              className="h-8 px-2 text-xs"
              onClick={() => setAvailabilityFormOpen(true)}
              size="sm"
              type="button"
              variant="default"
            >
              <Plus className="size-3.5" />
              Add
            </Button>
            <Button
              aria-label="Previous month"
              onClick={() => setCursorDate(viewMode === "month" ? addMonths(cursorDate, -1) : addDays(cursorDate, -7))}
              size="icon"
              className="size-8"
              type="button"
              variant="glass"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              onClick={() => setCursorDate(startOfMonth(new Date()))}
              size="sm"
              type="button"
              variant="glass"
              className="h-8 px-2 text-xs"
            >
              {viewMode === "month" ? monthTitle(cursorDate) : weekTitle(cursorDate)}
            </Button>
            <Button
              aria-label="Next month"
              onClick={() => setCursorDate(viewMode === "month" ? addMonths(cursorDate, 1) : addDays(cursorDate, 7))}
              size="icon"
              className="size-8"
              type="button"
              variant="glass"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 px-2 pb-2 sm:px-3 sm:pb-3">
          {loading ? <p className="text-sm text-zinc-500">Loading instructor calendar...</p> : null}
          {!loading && !selectedInstructorId ? (
            <p className="text-sm text-zinc-500">Belum ada instructor.</p>
          ) : null}

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
                {calendarCells.map(({ date, day, inMonth }) => {
                  const dateKey = formatDate(date);
                  const bookedSlots = schedulesByDate[dateKey] ?? [];
                  const availableSlots = availableSlotsForDate(availabilityByDay[day] ?? [], bookedSlots);
                  const totalItems = availableSlots.length + bookedSlots.length;

                  return (
                    <button
                      className={`min-h-[38px] rounded-xl border p-1 text-left transition hover:border-zinc-300 hover:bg-white/55 sm:min-h-[52px] sm:p-1.5 ${
                        inMonth
                          ? "border-white/45 bg-white/38"
                          : "border-white/25 bg-white/18 opacity-55"
                      }`}
                      key={dateKey}
                      onClick={() => setSelectedDate(dateKey)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold leading-none text-zinc-950 sm:text-sm">
                            {date.getUTCDate()}
                          </p>
                          <p className="mt-0.5 hidden text-[9px] font-medium uppercase tracking-[0.04em] text-zinc-400 sm:block">
                            {dayLabel.get(day)?.slice(0, 3)}
                          </p>
                        </div>
                        {totalItems > 0 ? (
                          <span className="rounded-full bg-white/70 px-1.5 py-0 text-[9px] font-semibold text-zinc-700">
                            {totalItems}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {availableSlots.slice(0, 4).map((slot) => (
                          <span
                            className="size-1.5 rounded-full bg-emerald-500 sm:size-2"
                            key={slot.id}
                            title={`${String(slot.fromTime)} - ${String(slot.toTime)}`}
                          />
                        ))}
                        {bookedSlots.slice(0, 4).map((schedule) => {
                          const mode = scheduleLessonMode(schedule);
                          return (
                            <span
                              className={`size-1.5 rounded-full sm:size-2 ${
                                mode === "Studio" ? "bg-sky-500" : "bg-violet-500"
                              }`}
                              key={schedule.id}
                              title={`${String(schedule.fromTime)} - ${String(schedule.toTime)} • ${mode}`}
                            />
                          );
                        })}
                        {totalItems > 8 ? (
                          <span className="text-[8px] font-semibold text-zinc-500">+{totalItems - 8}</span>
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
          availability={availableSlotsForDate(
            availabilityByDay[selectedCell.day] ?? [],
            schedulesByDate[selectedDate] ?? [],
          )}
          booked={schedulesByDate[selectedDate] ?? []}
          coursesById={coursesById}
          date={selectedCell.date}
          onClose={() => setSelectedDate("")}
          onDeleteAvailability={deleteAvailability}
          saving={saving}
          studentsById={studentsById}
        />
      ) : null}
      {availabilityFormOpen ? (
        <AvailabilityFormModal
          draft={draft}
          existingSlotValuesForDraftDay={existingSlotValuesForDraftDay}
          instructors={instructors}
          onClose={() => setAvailabilityFormOpen(false)}
          onDraftChange={setDraft}
          onInstructorChange={setSelectedInstructorId}
          onSlotsChange={setSelectedSlotValues}
          onSubmit={createAvailability}
          selectedSlotValues={selectedSlotValues}
          saving={saving}
          selectedInstructorId={selectedInstructorId}
        />
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

function AvailabilityFormModal({
  draft,
  existingSlotValuesForDraftDay,
  instructors,
  onClose,
  onDraftChange,
  onInstructorChange,
  onSlotsChange,
  onSubmit,
  selectedSlotValues,
  saving,
  selectedInstructorId,
}: {
  draft: {
    dayOfWeek: string;
    fromTime: string;
  };
  existingSlotValuesForDraftDay: Set<string>;
  instructors: Row[];
  onClose: () => void;
  onDraftChange: (value: {
    dayOfWeek: string;
    fromTime: string;
  }) => void;
  onInstructorChange: (value: string) => void;
  onSlotsChange: (value: string[]) => void;
  onSubmit: () => Promise<void>;
  selectedSlotValues: string[];
  saving: boolean;
  selectedInstructorId: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/35 p-3 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-[420px] rounded-3xl border border-white/55 bg-white/90 p-4 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">
              Instructor calendar
            </p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-950">Add Availability</h2>
          </div>
          <Button onClick={onClose} size="sm" type="button" variant="glass">
            Close
          </Button>
        </div>

        <div className="mt-4 grid gap-3">
          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">
              Instructor
            </span>
            <select
              className="h-10 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl"
              onChange={(event) => onInstructorChange(event.target.value)}
              value={selectedInstructorId}
            >
              {instructors.map((instructor) => (
                <option key={instructor.id} value={instructor.id}>
                  {formatDisplayText(instructor.instructorName)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">
              Day
            </span>
            <select
              className="h-10 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl"
              onChange={(event) => onDraftChange({ ...draft, dayOfWeek: event.target.value })}
              value={draft.dayOfWeek}
            >
              {lessonDayOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">
              Time slots
            </span>
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-2xl border border-white/50 bg-white/58 p-2 backdrop-blur-xl">
              {hourlyLessonSlotOptions.map((option) => (
                <label
                  className={`flex items-center gap-2 rounded-lg px-2 py-1 text-sm ${
                    existingSlotValuesForDraftDay.has(option.value)
                      ? "bg-zinc-100/75 text-zinc-400"
                      : "text-zinc-900 hover:bg-white/65"
                  }`}
                  key={option.value}
                >
                  <input
                    checked={selectedSlotValues.includes(option.value)}
                    disabled={existingSlotValuesForDraftDay.has(option.value)}
                    onChange={(event) => {
                      if (event.target.checked) {
                        onSlotsChange([...selectedSlotValues, option.value]);
                        onDraftChange({ ...draft, fromTime: option.value });
                        return;
                      }
                      onSlotsChange(selectedSlotValues.filter((value) => value !== option.value));
                    }}
                    type="checkbox"
                  />
                  <span>
                    {option.label}
                    {existingSlotValuesForDraftDay.has(option.value) ? " (already added)" : ""}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-zinc-500">
              Pilih beberapa slot sekaligus. Contoh: 09:00-10:00, 10:00-11:00, 11:00-12:00.
            </p>
          </label>

          <p className="rounded-2xl border border-white/45 bg-white/42 px-3 py-2 text-xs text-zinc-500">
            Mode Studio atau Home Visit dipilih saat membuat Lesson Package.
          </p>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button disabled={saving} onClick={onClose} type="button" variant="glass">
            Cancel
          </Button>
          <Button disabled={saving} onClick={() => void onSubmit()} type="button">
            Save Availability
          </Button>
        </div>
      </div>
    </div>
  );
}

function DayDetailModal({
  availability,
  booked,
  coursesById,
  date,
  onClose,
  onDeleteAvailability,
  saving,
  studentsById,
}: {
  availability: Row[];
  booked: Row[];
  coursesById: Map<string, Row>;
  date: Date;
  onClose: () => void;
  onDeleteAvailability: (id: string) => Promise<void>;
  saving: boolean;
  studentsById: Map<string, Row>;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/35 p-3 backdrop-blur-sm sm:items-center">
      <div className="max-h-[86vh] w-full max-w-[520px] overflow-y-auto rounded-3xl border border-white/55 bg-white/88 p-4 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-400">
              {dayLabel.get(String(date.getUTCDay()))}
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
              <h3 className="text-sm font-semibold text-zinc-950">Available slots</h3>
            </div>
            {availability.length > 0 ? (
              availability.map((slot) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200/70 bg-emerald-50/80 px-3 py-2 text-emerald-950"
                  key={slot.id}
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {String(slot.fromTime)} - {String(slot.toTime)}
                    </p>
                    <p className="text-xs text-emerald-700">Instructor free</p>
                  </div>
                  <Button
                    aria-label="Delete availability"
                    disabled={saving}
                    onClick={() => void onDeleteAvailability(slot.id)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-zinc-200/80 bg-white/45 px-3 py-2 text-sm text-zinc-500">
                No available slot.
              </p>
            )}
          </section>

          <section className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-xs text-zinc-600">
                <span className="size-2 rounded-full bg-sky-500" />
                Studio
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-zinc-600">
                <span className="size-2 rounded-full bg-violet-500" />
                Home Visit
              </span>
              <h3 className="text-sm font-semibold text-zinc-950">Booked schedules</h3>
            </div>
            {booked.length > 0 ? (
              booked.map((schedule) => {
                const student = studentsById.get(String(schedule.studentId ?? ""));
                const course = coursesById.get(String(schedule.courseId ?? ""));
                const mode = scheduleLessonMode(schedule);
                const tone =
                  mode === "Studio"
                    ? "border-sky-200/70 bg-sky-50/90 text-sky-950"
                    : "border-violet-200/70 bg-violet-50/90 text-violet-950";
                const subTone = mode === "Studio" ? "text-sky-700" : "text-violet-700";

                return (
                  <div
                    className={`rounded-2xl border px-3 py-2 ${tone}`}
                    key={schedule.id}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold">
                        {String(schedule.fromTime)} - {String(schedule.toTime)}
                      </p>
                      <Badge className="h-5 rounded-md px-1.5 text-[10px]" variant="secondary">
                        {mode}
                      </Badge>
                    </div>
                    <p className={`mt-0.5 text-xs ${subTone}`}>
                      {studentName(student) || "Booked schedule"}
                    </p>
                    <p className={`text-xs ${subTone}`}>{formatDisplayText(course?.courseName)}</p>
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

function mapById(rows: Row[]) {
  return new Map(rows.map((row) => [row.id, row]));
}

function groupByDay(rows: Row[], key: "dayOfWeek") {
  return rows.reduce<Record<string, Row[]>>((acc, row) => {
    const day = String(row[key] ?? "");

    if (!acc[day]) acc[day] = [];
    acc[day].push(row);
    acc[day].sort((left, right) =>
      String(left.fromTime ?? "").localeCompare(String(right.fromTime ?? "")),
    );
    return acc;
  }, {});
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
  const date = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + amount, 1));
  return date;
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
      day: String(date.getUTCDay()),
      inMonth: date.getUTCMonth() === month,
    };
  });
}

function buildWeekCells(cursorDate: Date) {
  const gridStart = startOfWeek(cursorDate);
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(gridStart, index);
    return {
      date,
      day: String(date.getUTCDay()),
      inMonth: true,
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

function weekTitle(value: Date) {
  const start = startOfWeek(value);
  const end = addDays(start, 6);
  return `${formatDate(start)} - ${formatDate(end)}`;
}

function studentName(student?: Row) {
  if (!student) return "";
  return formatDisplayText(`${String(student.firstName ?? "")} ${String(student.lastName ?? "")}`);
}

function nextHour(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return "";

  return `${String(hours + 1).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function scheduleLessonMode(schedule: Row) {
  const mode = String(schedule.lessonMode ?? "").trim();
  if (mode === "Studio") return "Studio";
  if (mode === "Home Visit") return "Home Visit";
  return String(schedule.homeVisitAddress ?? "").trim() ? "Home Visit" : "Studio";
}

function availableSlotsForDate(availabilitySlots: Row[], bookedSlots: Row[]) {
  if (availabilitySlots.length === 0) return [];
  if (bookedSlots.length === 0) return availabilitySlots;

  return availabilitySlots.filter((slot) => {
    const slotFrom = String(slot.fromTime ?? "");
    const slotTo = String(slot.toTime ?? "");
    return !bookedSlots.some((booked) =>
      rangesOverlap(
        slotFrom,
        slotTo,
        String(booked.fromTime ?? ""),
        String(booked.toTime ?? ""),
      ),
    );
  });
}

function rangesOverlap(
  fromLeft: string,
  toLeft: string,
  fromRight: string,
  toRight: string,
) {
  return fromLeft < toRight && fromRight < toLeft;
}
