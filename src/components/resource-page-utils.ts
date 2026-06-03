import type { FieldConfig, RecordValue, RelationOption, UiRecord } from "@/components/resource-page";
import type { ResourceName } from "@/lib/models";
import { formatDisplayText } from "@/lib/utils";
import { toast } from "sonner";

type ScheduleSlotTime = {
  dayOfWeek: string;
  fromTime: string;
  toTime: string;
};
type RelationOptionLookup = Record<string, Map<string, RelationOption>>;

export function isFieldVisible(field: FieldConfig, draft: Record<string, RecordValue>) {
  if (!field.visibleWhen) return true;

  return String(draft[field.visibleWhen.field] ?? "") === field.visibleWhen.value;
}

export function clearHiddenDependentValues(
  fields: FieldConfig[],
  changedField: string,
  changedValue: string,
) {
  return Object.fromEntries(
    fields
      .filter(
        (field) =>
          field.visibleWhen?.field === changedField && field.visibleWhen.value !== changedValue,
      )
      .map((field) => [field.key, field.multiple ? [] : ""]),
  );
}

export function isRecordValueEqual(left: RecordValue | undefined, right: RecordValue | undefined) {
  if (Array.isArray(left) || Array.isArray(right)) {
    const leftArray = Array.isArray(left) ? left.map(String) : [String(left ?? "")];
    const rightArray = Array.isArray(right) ? right.map(String) : [String(right ?? "")];

    return (
      leftArray.length === rightArray.length &&
      leftArray.every((value, index) => value === rightArray[index])
    );
  }

  return left === right;
}

export function clearFilteredDependentValues(fields: FieldConfig[], changedField: string) {
  return Object.fromEntries(
    fields
      .filter((field) => field.relationFilter?.sourceField === changedField)
      .map((field) => [field.key, field.multiple ? [] : ""]),
  );
}

export function getNextMultiSelectValue({
  checked,
  currentValues,
  draft,
  field,
  option,
  relationOptions,
}: {
  checked: boolean;
  currentValues: string[];
  draft: Record<string, RecordValue>;
  field: FieldConfig;
  option: RelationOption | { label: string; value: string };
  relationOptions: Record<string, RelationOption[]>;
}) {
  if (checked) return currentValues.filter((value) => value !== option.value);

  const limit = Number(draft.lessonCount) === 8 ? 2 : 1;

  if (field.key === "availabilitySlotId") {
    const selectedOptions = currentValues
      .map((value) => relationOptions[field.key]?.find((item) => item.value === value))
      .filter(Boolean);
    const optionDay = optionDayOfWeek(option);
    const hasSameDay = selectedOptions.some((item) => optionDayOfWeek(item!) === optionDay);

    if (hasSameDay) {
      toast.error("Slot di hari yang sama sudah dipilih. Uncheck slot lama dulu.", {
        id: "availability-slot-same-day",
      });
      return null;
    }

    if (currentValues.length >= limit) {
      toast.error(limit === 2 ? "Paket B hanya bisa memilih 2 slots." : "Paket A hanya bisa memilih 1 slot.", {
        id: "availability-slot-limit",
      });
      return null;
    }

    return [...currentValues, option.value];
  }

  if (field.key === "availableDate") {
    const optionDay = optionDayOfWeek(option);
    const selectedOptions = currentValues
      .map((value) => ({ label: value, value }))
      .filter((item) => optionDayOfWeek(item) !== optionDay);
    const nextValues = [...selectedOptions.map((item) => item.value), option.value].sort();

    if (nextValues.length > limit) {
      toast.error(
        limit === 2 ? "Paket B hanya bisa memilih 2 tanggal awal." : "Paket A hanya bisa memilih 1 tanggal awal.",
        { id: "available-date-limit" },
      );
      return null;
    }

    return nextValues;
  }

  return [...currentValues, option.value];
}

function optionDayOfWeek(option: { label: string; record?: UiRecord; value: string }) {
  if (option.record?.dayOfWeek !== undefined) return String(option.record.dayOfWeek);
  if (/^\d{4}-\d{2}-\d{2}$/.test(option.value)) {
    return String(new Date(`${option.value}T00:00:00.000Z`).getUTCDay());
  }

  return "";
}

export function applyDerivedValues(
  fields: FieldConfig[],
  draft: Record<string, RecordValue>,
  relationOptions: Record<string, RelationOption[]>,
  scheduleRows: UiRecord[] = [],
) {
  const updates = Object.fromEntries(
    fields
      .filter((field) => field.deriveFrom)
      .map((field) => [field.key, getDerivedValue(field, draft, relationOptions)])
      .filter(([, value]) => value !== undefined),
  ) as Record<string, RecordValue>;

  const nextDraft = { ...draft, ...updates };

  const availabilityDateField = fields.find((field) => field.availabilityDateFrom);
  if (availabilityDateField) {
    const options = getAvailabilityDateOptions(availabilityDateField, nextDraft, relationOptions, scheduleRows);
    const optionValues = new Set(options.map((option) => option.value));

    if (availabilityDateField.multiple) {
      const currentDates = toMultiSelectValue(nextDraft[availabilityDateField.key]);
      const nextDates = currentDates.filter((date) => optionValues.has(date));

      nextDraft[availabilityDateField.key] =
        nextDates.length > 0 ? nextDates : options[0]?.value ? [options[0].value] : [];
      if (fields.some((field) => field.key === "lessonStartDate")) {
        nextDraft.lessonStartDate = toMultiSelectValue(nextDraft[availabilityDateField.key]).sort()[0] ?? "";
      }
    } else {
      const currentDate = String(nextDraft[availabilityDateField.key] ?? "");
      const nextDate = optionValues.has(currentDate) ? currentDate : options[0]?.value ?? "";

      nextDraft[availabilityDateField.key] = nextDate;
      if (fields.some((field) => field.key === "lessonStartDate")) {
        nextDraft.lessonStartDate = nextDate;
      }
    }
  } else if (
    fields.some((field) => field.key === "lessonStartDate") &&
    nextDraft.availabilitySlotId &&
    nextDraft.billingPeriod
  ) {
    const options = getAvailabilityDateOptions(
      {
        key: "lessonStartDate",
        label: "Lesson start date",
        availabilityDateFrom: {
          monthField: "billingPeriod",
          slotField: "availabilitySlotId",
        },
      },
      nextDraft,
      relationOptions,
      scheduleRows,
    );

    if (options[0]?.value) nextDraft.lessonStartDate = options[0].value;
  }

  return nextDraft;
}

export function getSelectOptions(
  field: FieldConfig,
  draft: Record<string, RecordValue>,
  relationOptions: Record<string, RelationOption[]>,
  scheduleRows: UiRecord[] = [],
) {
  if (field.availabilityDateFrom) {
    return getAvailabilityDateOptions(field, draft, relationOptions, scheduleRows);
  }

  return field.options ?? [];
}

export function getAvailabilityDateOptions(
  field: FieldConfig,
  draft: Record<string, RecordValue>,
  relationOptions: Record<string, RelationOption[]>,
  scheduleRows: UiRecord[] = [],
) {
  if (!field.availabilityDateFrom) return [];

  const monthValue = String(draft[field.availabilityDateFrom.monthField] ?? "");
  const slotIds = toMultiSelectValue(draft[field.availabilityDateFrom.slotField]);
  const slotOptions = relationOptions[field.availabilityDateFrom.slotField] ?? [];
  const slots = slotIds
    .map((slotId) => slotOptions.find((option) => option.value === slotId)?.record)
    .filter(Boolean);
  const instructorId = String(draft.instructorId ?? "");
  const studentId = String(draft.studentId ?? "");
  const dates = slots.flatMap((slot) => {
    const slotDayOfWeek = String(slot?.dayOfWeek ?? "");
    const slotFromTime = String(slot?.fromTime ?? "");
    const slotToTime = String(slot?.toTime ?? "");

    return datesInMonthForDay(monthValue, slotDayOfWeek).map((date) => {
      const conflictSchedules = scheduleRows.filter((schedule) => {
        if (isNonBlockingScheduleStatus(schedule.scheduleStatus)) return false;
        if (String(schedule.scheduleDate ?? "") !== date) return false;
        const isInstructorConflict =
          Boolean(instructorId) && String(schedule.instructorId ?? "") === instructorId;
        const isStudentConflict =
          Boolean(studentId) && String(schedule.studentId ?? "") === studentId;
        if (!isInstructorConflict && !isStudentConflict) return false;
        return rangesOverlap(
          slotFromTime,
          slotToTime,
          String(schedule.fromTime ?? ""),
          String(schedule.toTime ?? ""),
        );
      });

      const conflictReasons = new Set<string>();
      conflictSchedules.forEach((schedule) => {
        if (instructorId && String(schedule.instructorId ?? "") === instructorId) {
          conflictReasons.add("Instructor");
        }
        if (studentId && String(schedule.studentId ?? "") === studentId) {
          conflictReasons.add("Student");
        }
      });
      const reasonLabel =
        conflictReasons.size === 0
          ? ""
          : conflictReasons.size === 2
            ? "student + instructor"
            : Array.from(conflictReasons)[0].toLowerCase();
      const conflictSchedule = conflictSchedules[0];

      return {
        disabled: conflictSchedules.length > 0,
        label: `${lessonDayLabel(slot?.dayOfWeek)}, ${date}${conflictSchedule ? ` · Booked (${reasonLabel})` : ""}`,
        reasonLabel,
        hasInstructorConflict: conflictReasons.has("Instructor"),
        hasStudentConflict: conflictReasons.has("Student"),
        unavailableReason: conflictSchedule
          ? `${String(conflictSchedule.fromTime ?? "")} - ${String(conflictSchedule.toTime ?? "")}`
          : undefined,
        value: date,
      };
    });
  });
  const today = todayDateString();
  const uniqueDates = new Map<
    string,
    {
      label: string;
      value: string;
      disabled?: boolean;
      unavailableReason?: string;
      reasonLabel?: string;
      totalSlots: number;
      blockedSlots: number;
      reasonSet: Set<string>;
      hasInstructorConflict: boolean;
      hasStudentConflict: boolean;
    }
  >();
  dates
    .filter((date) => date.value >= today)
    .forEach((date) => {
      const current = uniqueDates.get(date.value);
      if (!current) {
        uniqueDates.set(date.value, {
          ...date,
          totalSlots: 1,
          blockedSlots: date.disabled ? 1 : 0,
          reasonSet: date.reasonLabel ? new Set([date.reasonLabel]) : new Set<string>(),
          hasInstructorConflict: Boolean(date.hasInstructorConflict),
          hasStudentConflict: Boolean(date.hasStudentConflict),
        });
        return;
      }

      if (date.reasonLabel) {
        if (date.reasonLabel === "student + instructor") {
          current.reasonSet.add("student");
          current.reasonSet.add("instructor");
        } else {
          current.reasonSet.add(date.reasonLabel);
        }
      }
      current.totalSlots += 1;
      if (date.disabled) current.blockedSlots += 1;
      current.hasInstructorConflict = current.hasInstructorConflict || Boolean(date.hasInstructorConflict);
      current.hasStudentConflict = current.hasStudentConflict || Boolean(date.hasStudentConflict);
      if (!current.unavailableReason && date.unavailableReason) {
        current.unavailableReason = date.unavailableReason;
      }
      uniqueDates.set(date.value, current);
    });

  return Array.from(uniqueDates.values())
    .map((date) => {
      const bookedStatus =
        date.hasInstructorConflict && date.hasStudentConflict
          ? "student + instructor"
          : date.hasInstructorConflict
            ? "instructor"
            : date.hasStudentConflict
              ? "student"
              : "";
      const isFullyBooked = date.blockedSlots >= date.totalSlots;
      const baseLabel = date.label.split(" · Booked")[0];

      return {
        value: date.value,
        disabled: isFullyBooked,
        label: bookedStatus ? `${baseLabel} · Booked (${bookedStatus})` : baseLabel,
        unavailableReason: date.unavailableReason,
      };
    })
    .sort((left, right) => left.value.localeCompare(right.value));
}

function todayDateString() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getFieldOptions(
  field: FieldConfig,
  draft: Record<string, RecordValue>,
  relationOptions: Record<string, RelationOption[]>,
  scheduleRows: UiRecord[] = [],
) {
  const options = relationOptions[field.key] ?? [];

  const relationFilteredOptions = field.relationFilter
    ? filterRelationOptions(field, draft, relationOptions, options)
    : options;

  if (!field.roomAvailabilityFrom) return relationFilteredOptions;

  return filterRoomAvailabilityOptions(field, draft, relationFilteredOptions, relationOptions, scheduleRows);
}

function filterRelationOptions(
  field: FieldConfig,
  draft: Record<string, RecordValue>,
  relationOptions: Record<string, RelationOption[]>,
  options: RelationOption[],
) {
  if (!field.relationFilter) return options;

  const sourceValue = draft[field.relationFilter.sourceField];
  if (!sourceValue) return [];

  const sourceOptions = relationOptions[field.relationFilter.sourceField] ?? [];
  const sourceRecord = sourceOptions.find((option) => option.value === String(sourceValue))?.record;
  const expectedValue = field.relationFilter.sourceOptionField
    ? sourceRecord?.[field.relationFilter.sourceOptionField]
    : sourceValue;

  if (!expectedValue) return [];

  return options.filter((option) => {
    const optionValue = option.record[field.relationFilter!.optionField];

    if (field.relationFilter!.mode === "includes") {
      return Array.isArray(optionValue)
        ? optionValue.map(String).includes(String(expectedValue))
        : String(optionValue || "")
            .split(",")
            .map((item) => item.trim())
            .includes(String(expectedValue));
    }

    return String(optionValue) === String(expectedValue);
  });
}

function filterRoomAvailabilityOptions(
  field: FieldConfig,
  draft: Record<string, RecordValue>,
  options: RelationOption[],
  relationOptions: Record<string, RelationOption[]>,
  scheduleRows: UiRecord[],
) {
  if (!field.roomAvailabilityFrom) return options;

  const config = field.roomAvailabilityFrom;
  const lessonMode = String(draft[config.lessonModeField] ?? "");
  const lessonStartDate = String(draft[config.startDateField] ?? "");
  const lessonDays = toMultiSelectValue(draft[config.lessonDaysField]);
  const lessonCount = Number(draft[config.lessonCountField] || 4);
  const fromTime = String(draft[config.fromTimeField] ?? "");
  const toTime = String(draft[config.toTimeField] ?? "");
  const scheduleSlotTimes = selectedAvailabilitySlotTimes(draft, relationOptions);

  if (lessonMode !== "Studio") return options;
  if (!lessonStartDate || lessonDays.length === 0 || !fromTime || !toTime) return options;

  const dates = expandLessonDates(lessonStartDate, lessonDays, lessonCount);
  if (dates.length === 0) return options;

  return options.map((option) => {
    const roomSchedules = scheduleRows.filter(
      (schedule) =>
        String(schedule.studioRoomId ?? "") === option.value &&
        String(schedule.lessonMode ?? "") === "Studio" &&
        !isNonBlockingScheduleStatus(schedule.scheduleStatus) &&
        dates.includes(String(schedule.scheduleDate ?? "")),
    );

    const conflict = roomSchedules.find((schedule) => {
      const slotTime = slotTimeForDate(
        String(schedule.scheduleDate ?? ""),
        scheduleSlotTimes,
        fromTime,
        toTime,
      );

      return rangesOverlap(
        slotTime.fromTime,
        slotTime.toTime,
        String(schedule.fromTime ?? ""),
        String(schedule.toTime ?? ""),
      );
    });

    if (!conflict) {
      return {
        ...option,
        label: `${option.label} · Available`,
      };
    }

    return {
      ...option,
      disabled: true,
      label: `${option.label} · Booked`,
      unavailableReason: `${String(conflict.scheduleDate ?? "")}, ${String(conflict.fromTime ?? "")} - ${String(conflict.toTime ?? "")}`,
    };
  });
}

function selectedAvailabilitySlotTimes(
  draft: Record<string, RecordValue>,
  relationOptions: Record<string, RelationOption[]>,
) {
  const selectedSlotIds = toMultiSelectValue(draft.availabilitySlotId);
  const slotOptions = relationOptions.availabilitySlotId ?? [];

  return selectedSlotIds
    .map((slotId) => slotOptions.find((option) => option.value === slotId)?.record)
    .filter(Boolean)
    .map((slot) => ({
      dayOfWeek: String(slot?.dayOfWeek ?? ""),
      fromTime: String(slot?.fromTime ?? ""),
      toTime: String(slot?.toTime ?? ""),
    }))
    .filter((slot) => slot.dayOfWeek && slot.fromTime && slot.toTime);
}

function slotTimeForDate(
  date: string,
  scheduleSlotTimes: ScheduleSlotTime[],
  fallbackFromTime: string,
  fallbackToTime: string,
) {
  const dayOfWeek = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? String(new Date(`${date}T00:00:00.000Z`).getUTCDay())
    : "";
  const slotTime = scheduleSlotTimes.find((slot) => slot.dayOfWeek === dayOfWeek);

  return {
    fromTime: slotTime?.fromTime || fallbackFromTime,
    toTime: slotTime?.toTime || fallbackToTime,
  };
}


function lessonDayLabel(value: unknown) {
  const labels: Record<string, string> = {
    "0": "Sunday",
    "1": "Monday",
    "2": "Tuesday",
    "3": "Wednesday",
    "4": "Thursday",
    "5": "Friday",
    "6": "Saturday",
  };

  return labels[String(value ?? "")] ?? "";
}

function datesInMonthForDay(monthValue: string, dayOfWeekValue: string) {
  if (!/^\d{4}-\d{2}$/.test(monthValue)) return [];

  const targetDay = Number(dayOfWeekValue);
  if (!Number.isInteger(targetDay) || targetDay < 0 || targetDay > 6) return [];

  const [year, month] = monthValue.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  const dates: string[] = [];

  while (date.getUTCMonth() === month - 1) {
    if (date.getUTCDay() === targetDay) {
      dates.push(date.toISOString().slice(0, 10));
    }
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return dates;
}

function expandLessonDates(
  lessonStartDate: string,
  lessonDays: string[],
  lessonCount: number,
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lessonStartDate)) return [];

  const [year, month, day] = lessonStartDate.split("-").map(Number);
  const current = new Date(Date.UTC(year, month - 1, day));
  const selectedDays = new Set(
    lessonDays.map(Number).filter((dayOfWeek) => dayOfWeek >= 0 && dayOfWeek <= 6),
  );
  const maxDates = Number.isFinite(lessonCount) && lessonCount > 0 ? lessonCount : 4;
  const dates: string[] = [];

  if (Number.isNaN(current.getTime()) || selectedDays.size === 0) return [];

  for (let attempts = 0; dates.length < maxDates && attempts < 370; attempts += 1) {
    if (selectedDays.has(current.getUTCDay())) {
      dates.push(current.toISOString().slice(0, 10));
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

function rangesOverlap(
  leftFrom: string,
  leftTo: string,
  rightFrom: string,
  rightTo: string,
) {
  const startA = timeToMinutes(leftFrom);
  const endA = timeToMinutes(leftTo);
  const startB = timeToMinutes(rightFrom);
  const endB = timeToMinutes(rightTo);

  if ([startA, endA, startB, endB].some((value) => Number.isNaN(value))) return false;
  return startA < endB && startB < endA;
}

function isNonBlockingScheduleStatus(status: unknown) {
  const normalized = String(status ?? "").toLowerCase();
  return normalized === "cancelled" || normalized === "rescheduled";
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return Number.NaN;

  return hours * 60 + minutes;
}

export function getDerivedValue(
  field: FieldConfig,
  draft: Record<string, RecordValue>,
  relationOptions: Record<string, RelationOption[]>,
) {
  if (!field.deriveFrom) return undefined;

  const sourceValue = draft[field.deriveFrom.sourceField];
  if (!sourceValue) return field.multiple ? [] : "";

  const sourceOptions = relationOptions[field.deriveFrom.sourceField] ?? [];
  const sourceRecords = toMultiSelectValue(sourceValue)
    .map((value) => sourceOptions.find((option) => option.value === value)?.record)
    .filter(Boolean);
  const sourceRecord = sourceRecords[0];
  const derivedValue = sourceRecord?.[field.deriveFrom.sourceOptionField];

  if (sourceRecords.length > 1) {
    const derivedValues = Array.from(
      new Set(
        sourceRecords
          .map((record) => record?.[field.deriveFrom!.sourceOptionField])
          .filter((value) => value !== undefined && value !== "")
          .map(String),
      ),
    );

    if (field.multiple) return derivedValues;
    if (derivedValues.length === 1) return derivedValues[0];

    const currentValue = String(draft[field.key] ?? "");
    return currentValue || derivedValues[0] || "";
  }

  if (Array.isArray(derivedValue)) return derivedValue.map(String);
  if (field.multiple) return derivedValue ? [String(derivedValue)] : [];

  return String(derivedValue ?? "");
}


export function toMultiSelectValue(value: RecordValue | undefined) {
  if (Array.isArray(value)) return value.map(String);

  return String(value ?? "")
    .split(",")
    .filter(Boolean);
}

export function formatValue(
  value: unknown,
  field?: FieldConfig,
  relationOptions?: Record<string, RelationOption[]>,
  relationOptionLookup?: RelationOptionLookup,
) {
  if (field?.type === "select" && field.options) {
    const options = field.options;

    if (Array.isArray(value)) {
      return (
        value
          .map((item) => optionLabel(options, item))
          .map(formatDisplayText)
          .join(", ") || "-"
      );
    }

    if (value === null || value === undefined || value === "") return "-";

    return formatDisplayText(optionLabel(options, value));
  }

  if (field?.type === "relation" && relationOptions) {
    const options = relationOptions[field.key] ?? [];
    const optionMap = relationOptionLookup?.[field.key];

    if (Array.isArray(value)) {
      const mappedLabels = value
        .map((item) => optionMap?.get(String(item))?.label ?? options.find((option) => option.value === String(item))?.label)
        .filter((label): label is string => Boolean(label));

      return (
        mappedLabels
          .map((item) => formatDisplayText(item))
          .join(", ") || "-"
      );
    }

    if (value === null || value === undefined || value === "") return "-";

    return formatDisplayText(
      optionMap?.get(String(value))?.label ??
        options.find((option) => option.value === String(value))?.label ??
        "-",
    );
  }

  if (Array.isArray(value)) return value.map(formatDisplayText).join(", ") || "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined || value === "") return "-";
  return formatDisplayText(value);
}

export function isFilterCandidateField(field: FieldConfig) {
  if (field.key === "portalEnabled") return false;
  if (field.key === "guardianIds") return false;
  if (field.type === "textarea" || field.type === "number" || field.type === "time") return false;
  return true;
}

export function isFilterableField(field: FieldConfig, rows: UiRecord[], facetValues?: unknown[]) {
  if (field.type === "select" || field.type === "relation" || field.type === "checkbox") return true;

  const uniqueValues = new Set(
    (facetValues?.length ? facetValues : rows.flatMap((row) => row[field.key]))
      .flatMap((value) => fieldFilterValues(value, field))
      .filter(Boolean),
  );

  return uniqueValues.size > 1 && uniqueValues.size <= 20;
}

export function isFilterVisibleForRole(
  resource: ResourceName | "users",
  role: string,
  field: FieldConfig,
) {
  if (role === "Music Instructor" && resource === "lesson-packages" && field.key === "instructorId") {
    return false;
  }

  if (
    role === "Student Portal User" &&
    resource === "lesson-packages" &&
    field.key === "studentId"
  ) {
    return false;
  }

  return true;
}

export function getResourceFilterAllowlist(resource: ResourceName | "users") {
  if (resource === "users") return ["role"];
  if (resource === "instruments") return ["instrumentCategory"];
  return null;
}

export function getResourceSortConfig(resource: ResourceName | "users") {
  if (resource === "instructors") {
    return {
      label: "Instructor name",
      value: (row: UiRecord) => String(row.instructorName ?? ""),
    };
  }

  if (resource === "students") {
    return {
      label: "Student name",
      value: (row: UiRecord) =>
        `${String(row.firstName ?? "")} ${String(row.lastName ?? "")}`.trim(),
    };
  }

  if (resource === "guardians") {
    return {
      label: "Guardian name",
      value: (row: UiRecord) => String(row.guardianName ?? ""),
    };
  }

  return null;
}

export function buildFieldFilterOptions(
  facets: Record<string, unknown[]>,
  rows: UiRecord[],
  fields: FieldConfig[],
  relationOptions: Record<string, RelationOption[]>,
  relationOptionLookup: RelationOptionLookup,
) {
  return Object.fromEntries(
    fields.map((field) => {
      const sourceValues = facets[field.key]?.length
        ? facets[field.key]
        : rows.flatMap((row) => fieldFilterValues(row[field.key], field));
      const values = Array.from(
        new Set(sourceValues.flatMap((value) => fieldFilterValues(value, field)).filter(Boolean)),
      ).sort((left, right) =>
        filterOptionLabel(field, left, relationOptions, relationOptionLookup).localeCompare(
          filterOptionLabel(field, right, relationOptions, relationOptionLookup),
        ),
      );

      return [
        field.key,
        values.map((value) => ({
          value,
          label: filterOptionLabel(field, value, relationOptions, relationOptionLookup),
        })),
      ];
    }),
  ) as Record<string, Array<{ label: string; value: string }>>;
}

function fieldFilterValues(value: unknown, field: FieldConfig) {
  if (field.type === "checkbox") return [String(Boolean(value))];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value === null || value === undefined || value === "") return [];
  return [String(value)];
}

function filterOptionLabel(
  field: FieldConfig,
  value: string,
  relationOptions: Record<string, RelationOption[]>,
  relationOptionLookup: RelationOptionLookup,
) {
  if (field.type === "select" && field.options) {
    return formatDisplayText(optionLabel(field.options, value));
  }

  if (field.type === "relation") {
    return formatDisplayText(
      relationOptionLookup[field.key]?.get(value)?.label ??
        relationOptions[field.key]?.find((option) => option.value === value)?.label ??
        value,
    );
  }

  if (field.type === "checkbox") return value === "true" ? "Yes" : "No";
  return formatDisplayText(value);
}

export function hasActiveFilters(fieldFilters: Record<string, string>) {
  return Object.values(fieldFilters).some(Boolean);
}

function optionLabel(options: { label: string; value: string }[], value: unknown) {
  return options.find((option) => option.value === String(value))?.label ?? String(value);
}
