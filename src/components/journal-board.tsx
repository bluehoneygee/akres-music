"use client";

import { BookOpenCheck, CheckCircle2, RefreshCw, Save } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getClientSession } from "@/lib/client-session";
import { progressRatingOptions } from "@/lib/options";
import { formatDisplayText } from "@/lib/utils";

type Row = Record<string, unknown> & { id: string };

type JournalDraft = {
  materialCovered: string;
  techniqueFocus: string;
  repertoireIds: string[];
  homework: string;
  teacherNotes: string;
  progressRating: string;
  parentVisible: boolean;
};

type JournalLine = {
  attendance: Row;
  schedule: Row | null;
  student: Row | null;
  instructor: Row | null;
  instrument: Row | null;
  journal: Row | null;
};

const emptyDraft: JournalDraft = {
  materialCovered: "",
  techniqueFocus: "",
  repertoireIds: [],
  homework: "",
  teacherNotes: "",
  progressRating: "Improving",
  parentVisible: true,
};

export function JournalBoard() {
  const [attendance, setAttendance] = useState<Row[]>([]);
  const [schedules, setSchedules] = useState<Row[]>([]);
  const [students, setStudents] = useState<Row[]>([]);
  const [instructors, setInstructors] = useState<Row[]>([]);
  const [instruments, setInstruments] = useState<Row[]>([]);
  const [repertoires, setRepertoires] = useState<Row[]>([]);
  const [journals, setJournals] = useState<Row[]>([]);
  const [drafts, setDrafts] = useState<Record<string, JournalDraft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [sessionRole, setSessionRole] = useState<string>("");
  const isParentPortal = sessionRole === "Parent Portal User";
  const isStudentPortal = sessionRole === "Student Portal User";
  const isPortalReadOnly = isParentPortal || isStudentPortal;

  async function loadData() {
    setLoading(true);

    try {
      const [
        attendanceRows,
        scheduleRows,
        studentRows,
        instructorRows,
        instrumentRows,
        repertoireRows,
        journalRows,
      ] = await Promise.all([
        fetchRows("student-attendance"),
        fetchRows("schedules"),
        fetchRows("students"),
        fetchRows("instructors"),
        fetchRows("instruments"),
        fetchRows("repertoires"),
        fetchRows("journals"),
      ]);

      setAttendance(attendanceRows);
      setSchedules(scheduleRows);
      setStudents(studentRows);
      setInstructors(instructorRows);
      setInstruments(instrumentRows);
      setRepertoires(repertoireRows);
      setJournals(journalRows);
      setDrafts(buildDrafts(journalRows));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load journals");
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
        if (mounted) setSessionRole(session.user?.role ?? "");
      } catch {
        if (mounted) setSessionRole("");
      }
    }
    void loadSessionRole();
    return () => {
      mounted = false;
    };
  }, []);

  const lines = useMemo(() => {
    const schedulesById = mapById(schedules);
    const studentsById = mapById(students);
    const instructorsById = mapById(instructors);
    const instrumentsById = mapById(instruments);
    const journalsByAttendanceId = new Map(
      journals.map((journal) => [String(journal.attendanceId ?? ""), journal]),
    );

    return attendance
      .filter((row) => row.status === "Present" && row.confirmed)
      .map((row) => {
        const schedule = schedulesById.get(String(row.courseScheduleId ?? "")) ?? null;
        const instructorId = String(schedule?.instructorId ?? "");
        const instrumentId = String(row.instrumentId ?? schedule?.instrumentId ?? "");

        return {
          attendance: row,
          schedule,
          student: studentsById.get(String(row.studentId ?? "")) ?? null,
          instructor: instructorsById.get(instructorId) ?? null,
          instrument: instrumentsById.get(instrumentId) ?? null,
          journal: journalsByAttendanceId.get(row.id) ?? null,
        };
      })
      .filter((line) => (isPortalReadOnly ? Boolean(line.journal?.confirmed) : true))
      .sort((left, right) =>
        String(right.schedule?.scheduleDate ?? right.attendance.date ?? "").localeCompare(
          String(left.schedule?.scheduleDate ?? left.attendance.date ?? ""),
        ),
      );
  }, [attendance, instruments, instructors, isPortalReadOnly, journals, schedules, students]);

  function updateDraft(attendanceId: string, patch: Partial<JournalDraft>) {
    setDrafts((current) => ({
      ...current,
      [attendanceId]: {
        ...(current[attendanceId] ?? emptyDraft),
        ...patch,
      },
    }));
  }

  async function saveJournal(line: JournalLine) {
    const attendanceId = line.attendance.id;
    const draft = drafts[attendanceId] ?? emptyDraft;
    const existingJournal = line.journal;
    const schedule = line.schedule;

    if (!schedule) {
      toast.error("Schedule belum tersedia untuk attendance ini");
      return;
    }

    setSavingId(attendanceId);

    try {
      const payload = buildJournalPayload(line, draft);
      const response = await fetch(
        existingJournal ? `/api/journals/${existingJournal.id}` : "/api/journals",
        {
          method: existingJournal ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = (await response.json()) as { data?: Row; error?: string };

      if (!response.ok || !json.data) {
        throw new Error(json.error ?? "Unable to save journal");
      }

      await loadData();
      toast.success("Journal saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save journal");
    } finally {
      setSavingId("");
    }
  }

  async function confirmJournal(line: JournalLine) {
    const attendanceId = line.attendance.id;
    const draft = drafts[attendanceId] ?? emptyDraft;
    const existingJournal = line.journal;

    if (!existingJournal) {
      toast.error("Save journal dulu sebelum confirm");
      return;
    }

    setSavingId(attendanceId);

    try {
      const response = await fetch(`/api/journals/${existingJournal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...buildJournalPayload(line, draft),
          confirmed: true,
        }),
      });
      const json = (await response.json()) as { data?: Row; error?: string };

      if (!response.ok || !json.data) {
        throw new Error(json.error ?? "Unable to confirm journal");
      }

      await loadData();
      toast.success("Journal confirmed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to confirm journal");
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
              <BookOpenCheck className="size-6" />
              Lesson Journals
            </CardTitle>
          </div>
          <Button onClick={loadData} size="icon" variant="glass" aria-label="Refresh">
            <RefreshCw className="size-4" />
          </Button>
        </CardHeader>
      </Card>

      <Card className="liquid-glass">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-5">
              <div className="h-5 w-40 animate-pulse rounded-lg bg-white/45" />
              <div className="h-20 w-full animate-pulse rounded-2xl bg-white/40" />
            </div>
          ) : null}

          {!loading && lines.length === 0 ? (
            <div className="p-5 text-sm text-zinc-500">
              {isPortalReadOnly
                ? "Belum ada jurnal pelajaran yang sudah final. Jurnal akan muncul setelah sesi selesai dan dikonfirmasi."
                : "Belum ada attendance Present yang sudah confirmed. Confirm attendance dulu untuk mulai isi journal."}
            </div>
          ) : null}

          {!loading && lines.length > 0 ? (
            <div className="overflow-x-auto no-scrollbar">
              <table
                className={`${isPortalReadOnly ? "min-w-[1120px]" : "min-w-[1280px]"} w-max max-w-full border-separate border-spacing-y-2 text-left text-sm sm:w-full`}
              >
                <thead className="text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Session</th>
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Repertoire</th>
                    <th className="px-4 py-3 font-medium">Material</th>
                    <th className="px-4 py-3 font-medium">Technique</th>
                    <th className="px-4 py-3 font-medium">Homework</th>
                    <th className="px-4 py-3 font-medium">Progress</th>
                    {!isPortalReadOnly ? <th className="px-4 py-3 font-medium">Parent</th> : null}
                    {!isPortalReadOnly ? <th className="px-4 py-3 font-medium">Action</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => {
                    const draft = drafts[line.attendance.id] ?? emptyDraft;
                    const isConfirmed = Boolean(line.journal?.confirmed);
                    const repertoireOptions = repertoires.filter(
                      (repertoire) =>
                        repertoire.isActive !== false &&
                        String(repertoire.instrumentId ?? "") === String(line.instrument?.id ?? ""),
                    );

                    return (
                      <tr className="align-top" key={line.attendance.id}>
                        <td className="w-[170px] rounded-l-2xl bg-white/42 px-4 py-3">
                          <p className="font-medium text-zinc-950">
                            {String(line.schedule?.scheduleDate ?? line.attendance.date ?? "-")}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {String(line.schedule?.fromTime ?? "-")} - {String(line.schedule?.toTime ?? "-")}
                          </p>
                          <Badge className="mt-2" variant={line.journal ? "success" : "outline"}>
                            {isConfirmed ? "Confirmed" : line.journal ? "Saved" : "Ready"}
                          </Badge>
                        </td>
                        <td className="w-[180px] bg-white/42 px-4 py-3">
                          <p className="font-medium text-zinc-950">{studentName(line.student)}</p>
                          <p className="text-xs text-zinc-500">
                            {formatDisplayText(line.instrument?.instrumentName)}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {formatDisplayText(line.instructor?.instructorName)}
                          </p>
                        </td>
                        <td className="w-[210px] bg-white/42 px-4 py-3">
                          <select
                            className="h-24 w-full rounded-2xl border border-white/50 bg-white/58 px-3 py-2 text-sm text-zinc-900 outline-none backdrop-blur-xl transition focus:border-sky-300 focus:bg-white/75 focus:ring-2 focus:ring-sky-200"
                            disabled={isConfirmed || isPortalReadOnly}
                            multiple
                            onChange={(event) =>
                              updateDraft(line.attendance.id, {
                                repertoireIds: Array.from(event.target.selectedOptions).map(
                                  (option) => option.value,
                                ),
                              })
                            }
                            value={draft.repertoireIds}
                          >
                            {repertoireOptions.map((repertoire) => (
                              <option key={repertoire.id} value={repertoire.id}>
                                {formatDisplayText(repertoire.title)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="w-[240px] bg-white/42 px-4 py-3">
                          <textarea
                            className="min-h-24 w-full rounded-2xl border border-white/50 bg-white/58 px-3 py-2 text-sm text-zinc-900 outline-none backdrop-blur-xl transition focus:border-sky-300 focus:bg-white/75 focus:ring-2 focus:ring-sky-200"
                            disabled={isConfirmed || isPortalReadOnly}
                            onChange={(event) =>
                              updateDraft(line.attendance.id, { materialCovered: event.target.value })
                            }
                            value={draft.materialCovered}
                          />
                        </td>
                        <td className="w-[210px] bg-white/42 px-4 py-3">
                          <input
                            className="h-10 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl transition focus:border-sky-300 focus:bg-white/75 focus:ring-2 focus:ring-sky-200"
                            disabled={isConfirmed || isPortalReadOnly}
                            onChange={(event) =>
                              updateDraft(line.attendance.id, { techniqueFocus: event.target.value })
                            }
                            value={draft.techniqueFocus}
                          />
                        </td>
                        <td className="w-[240px] bg-white/42 px-4 py-3">
                          <textarea
                            className="min-h-24 w-full rounded-2xl border border-white/50 bg-white/58 px-3 py-2 text-sm text-zinc-900 outline-none backdrop-blur-xl transition focus:border-sky-300 focus:bg-white/75 focus:ring-2 focus:ring-sky-200"
                            disabled={isConfirmed || isPortalReadOnly}
                            onChange={(event) =>
                              updateDraft(line.attendance.id, { homework: event.target.value })
                            }
                            value={draft.homework}
                          />
                        </td>
                        <td className="w-[170px] bg-white/42 px-4 py-3">
                          <select
                            className="h-10 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl transition focus:border-sky-300 focus:bg-white/75 focus:ring-2 focus:ring-sky-200"
                            disabled={isConfirmed || isPortalReadOnly}
                            onChange={(event) =>
                              updateDraft(line.attendance.id, { progressRating: event.target.value })
                            }
                            value={draft.progressRating}
                          >
                            {progressRatingOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        {!isPortalReadOnly ? (
                          <td className="w-[100px] bg-white/42 px-4 py-3">
                            <input
                              checked={draft.parentVisible}
                              className="size-4 accent-zinc-950"
                              disabled={isConfirmed || isPortalReadOnly}
                              onChange={(event) =>
                                updateDraft(line.attendance.id, { parentVisible: event.target.checked })
                              }
                              type="checkbox"
                            />
                          </td>
                        ) : null}
                        {!isPortalReadOnly ? (
                          <td className="w-[130px] rounded-r-2xl bg-white/42 px-4 py-3">
                            <div className="flex items-center gap-2">
                              {!isConfirmed ? (
                                <IconAction
                                  ariaLabel="Save journal"
                                  disabled={savingId === line.attendance.id}
                                  onClick={() => void saveJournal(line)}
                                  tooltip="Save journal"
                                >
                                  <Save className="size-4" />
                                </IconAction>
                              ) : null}
                              {line.journal && !isConfirmed ? (
                                <IconAction
                                  ariaLabel="Confirm journal"
                                  disabled={savingId === line.attendance.id}
                                  onClick={() => void confirmJournal(line)}
                                  tooltip="Confirm journal"
                                  variant="glass"
                                >
                                  <CheckCircle2 className="size-4" />
                                </IconAction>
                              ) : null}
                            </div>
                            <div className="mt-2">
                              {!line.journal ? (
                                <p className="text-xs italic text-zinc-500">Save journal to confirm.</p>
                              ) : null}
                              {isConfirmed ? <ConfirmedText journal={line.journal} /> : null}
                            </div>
                          </td>
                        ) : (
                          <td className="rounded-r-2xl bg-white/42 px-2 py-3" />
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
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

function buildDrafts(journals: Row[]) {
  return Object.fromEntries(
    journals.map((journal) => [
      String(journal.attendanceId ?? ""),
      {
        materialCovered: String(journal.materialCovered ?? ""),
        techniqueFocus: String(journal.techniqueFocus ?? ""),
        repertoireIds: Array.isArray(journal.repertoireIds)
          ? journal.repertoireIds.map(String)
          : [],
        homework: String(journal.homework ?? ""),
        teacherNotes: String(journal.teacherNotes ?? ""),
        progressRating: String(journal.progressRating ?? "Improving"),
        parentVisible: Boolean(journal.parentVisible ?? true),
      },
    ]),
  );
}

function buildJournalPayload(line: JournalLine, draft: JournalDraft) {
  const attendanceId = line.attendance.id;
  const schedule = line.schedule;

  if (!schedule) {
    throw new Error("Schedule belum tersedia untuk attendance ini");
  }

  return {
    id: line.journal?.id ?? `journal-${attendanceId}`,
    studentId: line.attendance.studentId,
    instructorId: schedule.instructorId,
    courseScheduleId: schedule.id,
    lessonDate: schedule.scheduleDate,
    instrumentId: line.attendance.instrumentId || schedule.instrumentId,
    level: String(line.student?.skillLevel ?? "Beginner"),
    attendanceId,
    materialCovered: draft.materialCovered,
    techniqueFocus: draft.techniqueFocus,
    repertoireIds: draft.repertoireIds,
    homework: draft.homework,
    teacherNotes: draft.teacherNotes,
    progressRating: draft.progressRating,
    parentVisible: draft.parentVisible,
    submittedAt: new Date().toISOString(),
  };
}

function mapById(rows: Row[]) {
  return new Map(rows.map((row) => [row.id, row]));
}

function studentName(student: Row | null) {
  if (!student) return "Unknown student";
  return formatDisplayText(`${String(student.firstName ?? "")} ${String(student.lastName ?? "")}`);
}

function IconAction({
  ariaLabel,
  children,
  disabled,
  onClick,
  tooltip,
  variant,
}: {
  ariaLabel: string;
  children: ReactNode;
  disabled: boolean;
  onClick: () => void;
  tooltip: string;
  variant?: "default" | "glass" | "ghost";
}) {
  return (
    <span className="group relative inline-flex">
      <Button
        aria-label={ariaLabel}
        className="size-9"
        disabled={disabled}
        onClick={onClick}
        size="icon"
        type="button"
        variant={variant}
      >
        {children}
      </Button>
      <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/45 bg-zinc-950 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 shadow-xl transition group-focus-within:opacity-100 group-hover:opacity-100">
        {tooltip}
      </span>
    </span>
  );
}

function ConfirmedText({ journal }: { journal: Row | null }) {
  if (!journal) return null;

  return (
    <p className="text-xs italic text-zinc-500">
      Confirmed by {formatDisplayText(journal.confirmedByName) || "Unknown User"}
      {formatDateTime(journal.confirmedAt) ? ` at ${formatDateTime(journal.confirmedAt)}` : ""}
    </p>
  );
}

function formatDateTime(value: unknown) {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
