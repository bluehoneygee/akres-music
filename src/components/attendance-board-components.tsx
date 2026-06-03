import { AlertTriangle, CalendarCheck, CalendarDays, ChevronLeft, ChevronRight, UserRound, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { AttendanceGroup, CombinedAttendanceGroup, Row, SelectedSession, SessionRow } from "@/components/attendance-board";
import {
  buildRescheduleDateOptions,
  buildRescheduleSlotOptions,
  findRescheduleSlotValueForSchedule,
  formatDateTime,
  indonesianDayName,
  Info,
  instructorStatusVariant,
  isStudioRoomBooked,
  packageLabel,
  packageRescheduleQuota,
  packageRescheduleUsage,
  pendingRescheduleLabel,
  rescheduleTargetForSchedule,
  scheduleDateTime,
  selectedAttendanceGroup,
  statusDotClass,
  statusVariant,
  stringField,
} from "@/components/attendance-board-utils";
import type { StudioRoomOption } from "@/components/attendance-board-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { instructorAttendanceStatusOptions, studentAttendanceStatusOptions } from "@/lib/options";
import { formatDisplayText } from "@/lib/utils";

const indonesianDayOptions = [
  { label: "Minggu", value: "0" },
  { label: "Senin", value: "1" },
  { label: "Selasa", value: "2" },
  { label: "Rabu", value: "3" },
  { label: "Kamis", value: "4" },
  { label: "Jumat", value: "5" },
  { label: "Sabtu", value: "6" },
];

export function SessionRail({ children, sessionCount }: { children: ReactNode; sessionCount: number }) {
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

export function SessionCard({
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
  const rescheduledTo = rescheduleTargetForSchedule(schedules, schedule);

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
          <p className="text-[8px] font-medium text-zinc-600 sm:text-xs">
            {indonesianDayName(schedule.scheduleDate)}
          </p>
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

export function StudentAttendanceModal({
  attendance,
  attendanceRows,
  disabled,
  instructorAttendanceRows,
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
  attendanceRows: Row[];
  disabled: boolean;
  instructorAttendanceRows: Row[];
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
  const controlDisabled = disabled || confirmed;
  const linkedReschedule = schedulesById.get(String(attendance?.makeupScheduleId ?? ""));
  const originalSchedule = schedulesById.get(String(schedule.originalScheduleId ?? ""));
  const rescheduledTo = rescheduleTargetForSchedule(schedules, schedule);
  const studentConfirmedRescheduleUsed = Boolean(attendance?.makeupScheduleId || linkedReschedule || rescheduledTo);
  const studentDraftReschedule = Boolean(pendingReschedule) && !studentConfirmedRescheduleUsed;
  const packageQuota = packageRescheduleQuota(schedule, schedules);
  const packageUsage = packageRescheduleUsage({
    attendanceRows,
    instructorAttendanceRows,
    schedule,
    schedules,
  });
  const ownRescheduleUsed = studentConfirmedRescheduleUsed || studentDraftReschedule;
  const packageQuotaAvailable = packageUsage.used < packageUsage.limit || ownRescheduleUsed;
  const rescheduleQuotaMessage = `Kuota reschedule package sudah habis (${packageUsage.used}/${packageUsage.limit}).`;
  const canSelectStudentReschedule =
    status === "Rescheduled"
      ? packageQuotaAvailable
      : !ownRescheduleUsed && packageQuotaAvailable;
  const canConfirm = Boolean(attendance) && !confirmed && status !== "Pending" && (
    !requiresReschedule || studentDraftReschedule
  );
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

                if (opensReplacement && !canSelectStudentReschedule) {
                  toast.error(ownRescheduleUsed ? "Sesi ini sudah pernah di-reschedule." : rescheduleQuotaMessage);
                  return;
                }

                if (opensReplacement && canSelectStudentReschedule && !attendance.makeupScheduleId && !pendingReschedule) {
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
                  pendingRescheduleDate: clearsReschedule ? "" : attendance.pendingRescheduleDate,
                  pendingRescheduleFromTime: clearsReschedule ? "" : attendance.pendingRescheduleFromTime,
                  pendingRescheduleStudioRoomId: clearsReschedule ? "" : attendance.pendingRescheduleStudioRoomId,
                  pendingRescheduleToTime: clearsReschedule ? "" : attendance.pendingRescheduleToTime,
                });
              }}
              value={status}
            >
              {studentAttendanceStatusOptions.map((option) => (
                <option
                  disabled={option.value === "Rescheduled" && !canSelectStudentReschedule}
                  key={option.value}
                  value={option.value}
                >
                  {option.value === "Rescheduled" && !canSelectStudentReschedule
                    ? `${option.label} (${packageQuota}x jatah habis)`
                    : option.label}
                </option>
              ))}
            </select>
            {!canSelectStudentReschedule ? (
              <p className="rounded-2xl border border-amber-200 bg-amber-100/70 px-3 py-2 text-xs font-medium text-amber-800">
                {ownRescheduleUsed
                  ? "Sesi ini sudah pernah di-reschedule."
                  : `${rescheduleQuotaMessage} Package ${packageQuota === 2 ? "8 sesi" : "4 sesi"} hanya bisa reschedule ${packageQuota}x.`}
              </p>
            ) : null}

            {schedule.originalScheduleId ? (
              <RescheduleBadge
                label="From"
                value={originalSchedule ? scheduleDateTime(originalSchedule) : "Original session"}
              />
            ) : null}
          {rescheduledTo && String(linkedReschedule?.id ?? "") !== String(rescheduledTo.id ?? "") ? (
            <RescheduleBadge label="To" value={scheduleDateTime(rescheduledTo)} />
          ) : null}
          {studentConfirmedRescheduleUsed ? (
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
                ) : canSelectStudentReschedule ? (
                  <Button
                    disabled={controlDisabled}
                    onClick={() => {
                      if (!canSelectStudentReschedule) {
                        toast.error(ownRescheduleUsed ? "Sesi ini sudah pernah di-reschedule." : rescheduleQuotaMessage);
                        return;
                      }
                      setReplacementStatus(status);
                      setReplacementOpen(true);
                    }}
                    size="sm"
                    type="button"
                    variant="glass"
                  >
                    Set replacement schedule
                  </Button>
                ) : null}
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
    <div className="attendance-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/35 p-3 backdrop-blur-sm">
      <div className="attendance-modal-surface max-h-[calc(100dvh-24px)] w-full max-w-[460px] overflow-y-auto rounded-3xl border border-white/55 bg-white/92 p-4 text-zinc-900 shadow-2xl backdrop-blur-2xl dark:border-zinc-700/80 dark:bg-zinc-900/92 dark:text-zinc-100">
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
      <AttendanceModalStyle />
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

function AttendanceModalStyle() {
  return (
    <style>{`
      .attendance-modal-overlay .attendance-modal-surface {
        background: rgba(255, 255, 255, 0.94) !important;
        border-color: rgba(255, 255, 255, 0.55) !important;
        color: #18181b !important;
      }

      .attendance-modal-overlay .attendance-modal-surface .text-zinc-950,
      .attendance-modal-overlay .attendance-modal-surface .text-zinc-900 {
        color: #09090b !important;
      }

      .attendance-modal-overlay .attendance-modal-surface .text-zinc-600 {
        color: #52525b !important;
      }

      .attendance-modal-overlay .attendance-modal-surface .text-zinc-500 {
        color: #71717a !important;
      }

      .attendance-modal-overlay .attendance-modal-surface .text-zinc-400 {
        color: #a1a1aa !important;
      }

      .attendance-modal-overlay .attendance-modal-surface .text-white {
        color: #ffffff !important;
      }

      .attendance-modal-overlay .attendance-modal-surface .bg-zinc-950 {
        background-color: #09090b !important;
      }

      .attendance-modal-overlay .attendance-modal-surface .border-zinc-950 {
        border-color: #09090b !important;
      }

      .attendance-modal-overlay .attendance-modal-surface input,
      .attendance-modal-overlay .attendance-modal-surface select {
        background: rgba(255, 255, 255, 0.58) !important;
        border-color: rgba(255, 255, 255, 0.5) !important;
        color: #18181b !important;
      }

      .attendance-modal-overlay .attendance-modal-surface option {
        background: #ffffff !important;
        color: #18181b !important;
      }

      .attendance-modal-overlay .attendance-modal-surface .max-h-40,
      .attendance-modal-overlay .attendance-modal-surface .max-h-44 {
        background: rgba(255, 255, 255, 0.42) !important;
        border-color: rgba(255, 255, 255, 0.5) !important;
      }

      .attendance-modal-overlay .attendance-modal-surface button[aria-pressed="true"] {
        background: #09090b !important;
        border-color: #09090b !important;
        color: #ffffff !important;
      }

      .attendance-modal-overlay .attendance-modal-surface button[aria-pressed="false"] {
        background: rgba(255, 255, 255, 0.52) !important;
        border-color: rgba(255, 255, 255, 0.5) !important;
        color: #18181b !important;
      }
    `}</style>
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
    <div className="attendance-modal-overlay fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/35 p-3 backdrop-blur-sm">
      <div className="attendance-modal-surface max-h-[calc(100dvh-24px)] w-full max-w-[420px] overflow-y-auto rounded-3xl border border-white/55 bg-white/92 p-4 text-zinc-900 shadow-2xl backdrop-blur-2xl dark:border-zinc-700/80 dark:bg-zinc-900/92 dark:text-zinc-100">
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

export function InstructorSessionCard({
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
  const rescheduledTo = rescheduleTargetForSchedule(schedules, schedule);

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
          <p className="text-[8px] font-medium text-zinc-600 sm:text-xs">
            {indonesianDayName(schedule.scheduleDate)}
          </p>
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

export function PackageSelector({
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

export function InstructorAttendanceModal({
  attendance,
  attendanceRows,
  disabled,
  instructorAttendanceRows,
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
  attendanceRows: Row[];
  disabled: boolean;
  instructorAttendanceRows: Row[];
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
  const rescheduledTo = rescheduleTargetForSchedule(schedules, schedule);
  const effectiveRescheduledTo = linkedReschedule ?? rescheduledTo;
  const instructorConfirmedRescheduleUsed = Boolean(
    attendance?.rescheduleScheduleId || effectiveRescheduledTo,
  );
  const instructorDraftReschedule = Boolean(pendingReschedule) && !instructorConfirmedRescheduleUsed;
  const packageQuota = packageRescheduleQuota(schedule, schedules);
  const packageUsage = packageRescheduleUsage({
    attendanceRows,
    instructorAttendanceRows,
    schedule,
    schedules,
  });
  const ownRescheduleUsed = instructorConfirmedRescheduleUsed || instructorDraftReschedule;
  const packageQuotaAvailable = packageUsage.used < packageUsage.limit || ownRescheduleUsed;
  const rescheduleQuotaMessage = `Kuota reschedule package sudah habis (${packageUsage.used}/${packageUsage.limit}).`;
  const canSelectInstructorReschedule =
    status === "Rescheduled"
      ? packageQuotaAvailable
      : !ownRescheduleUsed && packageQuotaAvailable;
  const canConfirm = Boolean(attendance) && !confirmed && status !== "Pending" && (
    !requiresReschedule || instructorDraftReschedule
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

              if (needsReschedule && !canSelectInstructorReschedule) {
                toast.error(ownRescheduleUsed ? "Sesi ini sudah pernah di-reschedule." : rescheduleQuotaMessage);
                return;
              }

              void onUpdate(attendance.id, {
                ...attendance,
                status: nextStatus,
                substituteInstructorId: "",
                rescheduleRequired: clearsReschedule ? false : needsReschedule || attendance.rescheduleRequired,
                rescheduleScheduleId: clearsReschedule ? "" : attendance.rescheduleScheduleId,
                pendingRescheduleDate: clearsReschedule ? "" : attendance.pendingRescheduleDate,
                pendingRescheduleFromTime: clearsReschedule ? "" : attendance.pendingRescheduleFromTime,
                pendingRescheduleStudioRoomId: clearsReschedule ? "" : attendance.pendingRescheduleStudioRoomId,
                pendingRescheduleToTime: clearsReschedule ? "" : attendance.pendingRescheduleToTime,
              });
            }}
            value={status}
          >
            {instructorAttendanceStatusOptions.map((option) => (
              <option
                disabled={option.value === "Rescheduled" && !canSelectInstructorReschedule}
                key={option.value}
                value={option.value}
              >
                {option.value === "Rescheduled" && !canSelectInstructorReschedule
                  ? `${option.label} (${packageQuota}x jatah habis)`
                  : option.label}
              </option>
            ))}
          </select>
          {!canSelectInstructorReschedule ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-100/70 px-3 py-2 text-xs font-medium text-amber-800">
              {ownRescheduleUsed
                ? "Sesi ini sudah pernah di-reschedule."
                : `${rescheduleQuotaMessage} Package ${packageQuota === 2 ? "8 sesi" : "4 sesi"} hanya bisa reschedule ${packageQuota}x.`}
            </p>
          ) : null}

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
          {instructorConfirmedRescheduleUsed ? (
            <p className="text-xs font-medium text-amber-700">
              Jatah reschedule habis.
            </p>
          ) : null}
          {attendance.rescheduleRequired && canSelectInstructorReschedule && !effectiveRescheduledTo && !pendingReschedule ? (
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
                disabled={controlDisabled || !canSelectInstructorReschedule}
                onClick={() => {
                  if (!canSelectInstructorReschedule) {
                    toast.error(ownRescheduleUsed ? "Sesi ini sudah pernah di-reschedule." : rescheduleQuotaMessage);
                    return;
                  }
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
