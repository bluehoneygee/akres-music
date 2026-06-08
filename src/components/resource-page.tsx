"use client";

import { Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { TABLE_PAGE_SIZE, useDebouncedValue, useResourceRows } from "@/components/resource-page-hooks";
import { invalidateResourceOptionsCache, useResourceOptions } from "@/components/resource-page-options";
import { ResourceFilterBar, ResourcePagination, ResourceTable } from "@/components/resource-page-parts";
import {
  applyDerivedValues,
  buildFieldFilterOptions,
  clearFilteredDependentValues,
  clearHiddenDependentValues,
  formatValue,
  getAvailabilityDateOptions,
  getDerivedValue,
  getFieldOptions,
  getNextMultiSelectValue,
  getResourceFilterAllowlist,
  getResourceSortConfig,
  getSelectOptions,
  hasActiveFilters,
  isFieldVisible,
  isFilterableField,
  isFilterCandidateField,
  isFilterVisibleForRole,
  isRecordValueEqual,
  toMultiSelectValue,
} from "@/components/resource-page-utils";
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
import type { ResourceName } from "@/lib/models";
import { canAccessResource } from "@/lib/roles";
import { formatDisplayText } from "@/lib/utils";

export type FieldConfig = {
  key: string;
  label: string;
  type?:
    | "text"
    | "number"
    | "date"
    | "month"
    | "time"
    | "checkbox"
    | "textarea"
    | "select"
    | "relation";
  options?: { label: string; value: string }[];
  relation?: {
    activeOnly?: boolean;
    resource: ResourceName | "users";
    labelFields: string[];
    valueField?: string;
  };
  relationFilter?: {
    sourceField: string;
    sourceOptionField?: string;
    optionField: string;
    mode?: "equals" | "includes";
  };
  deriveFrom?: {
    sourceField: string;
    sourceOptionField: string;
  };
  availabilityDateFrom?: {
    monthField: string;
    slotField: string;
  };
  roomAvailabilityFrom?: {
    fromTimeField: string;
    lessonCountField: string;
    lessonDaysField: string;
    lessonModeField: string;
    startDateField: string;
    toTimeField: string;
  };
  autoSelectSingleOption?: boolean;
  multiple?: boolean;
  visibleWhen?: {
    field: string;
    value: string;
  };
  required?: boolean;
  writeOnly?: boolean;
  hidden?: boolean;
  hideOnCreate?: boolean;
  tableOnly?: boolean;
  quickCreate?: {
    title: string;
    resource: ResourceName;
    fields: FieldConfig[];
  };
};

export type RecordValue = string | number | boolean | string[];
export type UiRecord = Record<string, RecordValue> & { id: string };
export type RelationOption = {
  disabled?: boolean;
  label: string;
  record: UiRecord;
  unavailableReason?: string;
  value: string;
};
type RelationOptionLookup = Record<string, Map<string, RelationOption>>;
export type SortDirection = "" | "asc" | "desc";

type ScheduleSlotTime = {
  dayOfWeek: string;
  fromTime: string;
  toTime: string;
};

function inferAvailabilitySlotIds(record: UiRecord, slotOptions: RelationOption[]) {
  const slotTimes = normalizeScheduleSlotTimes(record);
  const inferredIds: string[] = [];

  for (const slotTime of slotTimes) {
    const matchedOption = slotOptions.find(
      (option) =>
        String(option.record.dayOfWeek ?? "") === slotTime.dayOfWeek &&
        String(option.record.fromTime ?? "") === slotTime.fromTime &&
        String(option.record.toTime ?? "") === slotTime.toTime,
    );

    if (matchedOption && !inferredIds.includes(matchedOption.value)) {
      inferredIds.push(matchedOption.value);
    }
  }

  return inferredIds;
}

function normalizeScheduleSlotTimes(record: UiRecord) {
  const rawScheduleSlotTimes = Array.isArray(record.scheduleSlotTimes)
    ? (record.scheduleSlotTimes as unknown[])
    : [];

  const normalized = rawScheduleSlotTimes
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const value = item as Record<string, unknown>;

      return {
        dayOfWeek: String(value.dayOfWeek ?? ""),
        fromTime: String(value.fromTime ?? ""),
        toTime: String(value.toTime ?? ""),
      };
    })
    .filter((item): item is { dayOfWeek: string; fromTime: string; toTime: string } => Boolean(item))
    .filter((item) => item.dayOfWeek && item.fromTime && item.toTime);

  if (normalized.length > 0) return normalized;

  const lessonDays = Array.isArray(record.lessonDays) ? record.lessonDays.map(String) : [];
  const fromTime = String(record.fromTime ?? "");
  const toTime = String(record.toTime ?? "");

  return lessonDays
    .map((dayOfWeek) => ({ dayOfWeek, fromTime, toTime }))
    .filter((item) => item.dayOfWeek && item.fromTime && item.toTime);
}

export function ResourcePage({
  title,
  description,
  resource,
  fields,
  allowCreate = true,
}: {
  title: string;
  description: string;
  resource: ResourceName | "users";
  fields: FieldConfig[];
  allowCreate?: boolean;
}) {
  const emptyDraft = useMemo(
    () =>
      Object.fromEntries(
        fields.map((field) => [
          field.key,
          field.type === "checkbox" ? false : field.multiple ? [] : "",
        ]),
      ) as Record<string, RecordValue>,
    [fields],
  );
  const [draft, setDraft] = useState<Record<string, RecordValue>>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<UiRecord | null>(null);
  const [quickCreateField, setQuickCreateField] = useState<FieldConfig | null>(null);
  const [quickCreateDraft, setQuickCreateDraft] = useState<Record<string, RecordValue>>({});
  const [sessionRole, setSessionRole] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [fieldFilters, setFieldFilters] = useState<Record<string, string>>({});
  const [sortDirection, setSortDirection] = useState<SortDirection>("");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [scheduleRows, setScheduleRows] = useState<UiRecord[]>([]);
  const fieldsSignature = useMemo(() => JSON.stringify(fields), [fields]);
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 180);
  const { fetchRelationOptions, relationOptions, setRelationOptions } = useResourceOptions(fields);
  const relationOptionLookup = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(relationOptions).map(([fieldKey, options]) => [
          fieldKey,
          new Map(options.map((option) => [option.value, option])),
        ]),
      ) as RelationOptionLookup,
    [relationOptions],
  );
  const formFields = useMemo(
    () =>
      fields.filter(
        (field) => !field.hidden && !field.tableOnly && (!field.hideOnCreate || editingId),
      ),
    [editingId, fields],
  );
  const isParentStudentsView = resource === "students" && sessionRole === "Parent Portal User";
  const hidePortalEnabledColumn = [
    "Parent Portal User",
    "Student Portal User",
    "Music Instructor",
  ].includes(sessionRole);
  const canCreateResource = canAccessResource({ role: sessionRole, resource, action: "create" });
  const canUpdateResource = canAccessResource({ role: sessionRole, resource, action: "update" });
  const canDeleteResource = canAccessResource({ role: sessionRole, resource, action: "delete" });
  const tableFields = useMemo(
    () =>
      fields.filter(
        (field) =>
          !field.writeOnly &&
          (!field.hidden || field.tableOnly) &&
          !(isParentStudentsView && field.key === "portalEnabled") &&
          !(hidePortalEnabledColumn && field.key === "portalEnabled"),
      ),
    [fields, hidePortalEnabledColumn, isParentStudentsView],
  );
  const showActionsColumn = !isParentStudentsView && (canUpdateResource || canDeleteResource);
  const canCreate = allowCreate && !isParentStudentsView && canCreateResource;
  const filterAllowlist = useMemo(() => getResourceFilterAllowlist(resource), [resource]);
  const sortConfig = useMemo(() => getResourceSortConfig(resource), [resource]);
  const filterCandidateFields = useMemo(
    () =>
      tableFields.filter(
        (field) =>
          (!filterAllowlist || filterAllowlist.includes(field.key)) &&
          isFilterVisibleForRole(resource, sessionRole, field) &&
          isFilterCandidateField(field),
      ),
    [filterAllowlist, resource, sessionRole, tableFields],
  );
  const tableFieldKeys = useMemo(
    () => tableFields.map((field) => field.key).join(","),
    [tableFields],
  );
  const visibleFilterFieldKeys = useMemo(
    () => filterCandidateFields.map((field) => field.key).join(","),
    [filterCandidateFields],
  );
  const {
    error,
    filterFacets,
    loadRows,
    loading,
    rows,
    setError,
    totalRows,
  } = useResourceRows({
    debouncedSearchTerm,
    fieldFilters,
    onRole: setSessionRole,
    page,
    resource,
    sortDirection,
    tableFieldKeys,
    visibleFilterFieldKeys,
  });
  const filterableFields = useMemo(
    () =>
      filterCandidateFields.filter((field) => isFilterableField(field, rows, filterFacets[field.key])),
    [filterCandidateFields, filterFacets, rows],
  );
  const filterOptions = useMemo(
    () => buildFieldFilterOptions(filterFacets, rows, filterableFields, relationOptions, relationOptionLookup),
    [filterFacets, rows, filterableFields, relationOptions, relationOptionLookup],
  );
  const visibleFilterFields = useMemo(
    () => filterableFields.filter((field) => (filterOptions[field.key] ?? []).length > 0),
    [filterOptions, filterableFields],
  );
  const totalPages = Math.max(1, Math.ceil(totalRows / TABLE_PAGE_SIZE));
  const paginatedRows = rows;
  const hasFiltering = Boolean(searchTerm.trim()) || hasActiveFilters(fieldFilters);
  const needsScheduleRows = fields.some((field) => field.roomAvailabilityFrom || field.availabilityDateFrom);


  const loadSchedulesForAvailability = useCallback(async () => {
    const month =
      String(draft.billingPeriod ?? "") ||
      String(draft.lessonStartDate ?? "").slice(0, 7);
    const params = new URLSearchParams();
    if (month) params.set("month", month);
    if (draft.studentId) params.set("studentId", String(draft.studentId));
    if (draft.instructorId) params.set("instructorId", String(draft.instructorId));
    if (draft.studioRoomId) params.set("roomId", String(draft.studioRoomId));
    if (draft.fromTime) params.set("fromTime", String(draft.fromTime));
    if (draft.toTime) params.set("toTime", String(draft.toTime));

    if (!params.toString()) {
      setScheduleRows([]);
      return;
    }

    try {
      const response = await fetch(`/api/schedule-conflicts?${params.toString()}`, {
        cache: "no-store",
      });
      const json = (await response.json()) as { data?: UiRecord[] };
      setScheduleRows(json.data ?? []);
    } catch {
      setScheduleRows([]);
    }
  }, [
    draft.billingPeriod,
    draft.fromTime,
    draft.instructorId,
    draft.lessonStartDate,
    draft.studioRoomId,
    draft.studentId,
    draft.toTime,
  ]);

  useEffect(() => {
    if (!formOpen || !needsScheduleRows) return;
    void loadSchedulesForAvailability();
  }, [
    draft.availabilitySlotId,
    draft.billingPeriod,
    draft.fromTime,
    draft.instructorId,
    draft.lessonDays,
    draft.lessonMode,
    draft.lessonStartDate,
    draft.studioRoomId,
    draft.studentId,
    draft.toTime,
    formOpen,
    loadSchedulesForAvailability,
    needsScheduleRows,
  ]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm, fieldFilters, sortDirection, resource]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    queueMicrotask(() => {
      setDraft((current) => {
        const updates = Object.fromEntries(
          fields
            .filter((field) => field.type === "relation" || field.deriveFrom)
            .map((field) => {
              const derivedValue = getDerivedValue(field, current, relationOptions);

              if (derivedValue !== undefined) {
                return [field.key, derivedValue];
              }

              if (field.type !== "relation") {
                return [field.key, current[field.key]];
              }

              if (!relationOptions[field.key]) {
                return [field.key, current[field.key]];
              }

              const options = getFieldOptions(field, current, relationOptions, scheduleRows);
              const currentValue = current[field.key];
              const optionValues = new Set(
                options.filter((option) => !option.disabled).map((option) => option.value),
              );

              if (field.multiple && Array.isArray(currentValue)) {
                return [field.key, currentValue.filter((value) => optionValues.has(String(value)))];
              }

              if (!field.multiple && currentValue && !optionValues.has(String(currentValue))) {
                return [field.key, ""];
              }

              if (
                field.autoSelectSingleOption &&
                !field.multiple &&
                !currentValue &&
                options.filter((option) => !option.disabled).length === 1
              ) {
                return [field.key, options.find((option) => !option.disabled)?.value ?? ""];
              }

              return [field.key, currentValue];
            }),
        ) as Record<string, RecordValue>;

        const changed = Object.entries(updates).some(
          ([key, value]) => !isRecordValueEqual(current[key], value),
        );
        return changed ? { ...current, ...updates } : current;
      });
    });
  }, [fieldsSignature, fields, relationOptions, scheduleRows]);

  async function saveRecord() {
    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `/api/${resource}/${editingId}` : `/api/${resource}`;
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });

    if (!response.ok) {
      const json = (await response.json()) as { error?: string };
      setError(json.error ?? "Unable to save record");
      toast.error(json.error ?? "Unable to save record");
      return;
    }

    toast.success(editingId ? "Record updated" : "Record created");
    invalidateResourceOptionsCache([resource]);
    setEditingId(null);
    setFormOpen(false);
    setDraft(emptyDraft);
    await loadRows();
    if (fields.some((field) => field.roomAvailabilityFrom || field.availabilityDateFrom)) {
      await loadSchedulesForAvailability();
    }
  }

  async function deleteRow(id: string) {
    const response = await fetch(`/api/${resource}/${id}`, { method: "DELETE" });

    if (!response.ok) {
      const json = (await response.json()) as { error?: string };
      setError(json.error ?? "Unable to delete record");
      toast.error(json.error ?? "Unable to delete record");
      return;
    }

    toast.success("Record deleted");
    setPendingDelete(null);
    await loadRows();
  }

  const editRow = useCallback(
    async (row: UiRecord) => {
      const baseDraft = Object.fromEntries(
        fields.map((field) => [field.key, row[field.key] ?? emptyDraft[field.key]]),
      ) as Record<string, RecordValue>;

      if (resource !== "lesson-packages") {
        setEditingId(row.id);
        setDraft(baseDraft);
        setFormOpen(true);
        return;
      }

      try {
        const editableFieldList = [
          "availableDate",
          "availabilitySlotId",
          "billingPeriod",
          "courseId",
          "fromTime",
          "homeVisitAddress",
          "id",
          "instructorId",
          "instrumentId",
          "lessonCount",
          "lessonDays",
          "lessonMode",
          "lessonStartDate",
          "scheduleSlotTimes",
          "status",
          "studentId",
          "studioRoomId",
          "toTime",
        ];
        const params = new URLSearchParams({
          fields: editableFieldList.join(","),
          filters: JSON.stringify({ id: row.id }),
        });
        const response = await fetch(`/api/lesson-packages?${params.toString()}`, {
          cache: "no-store",
        });
        const json = (await response.json()) as { data?: UiRecord[] };
        const editableRecord = json.data?.[0] ?? row;
        const recordDraft = Object.fromEntries(
          fields.map((field) => [
            field.key,
            editableRecord[field.key] ?? baseDraft[field.key] ?? emptyDraft[field.key],
          ]),
        ) as Record<string, RecordValue>;

        const availabilitySlotField = fields.find((field) => field.key === "availabilitySlotId");
        const availabilityDateField = fields.find((field) => field.key === "availableDate");
        const slotOptions = availabilitySlotField
          ? (await fetchRelationOptions(availabilitySlotField))[1]
          : [];
        const hydratedRelationOptions = {
          ...relationOptions,
          ...(availabilitySlotField ? { [availabilitySlotField.key]: slotOptions } : {}),
        };
        const inferredSlotIds =
          toMultiSelectValue(editableRecord.availabilitySlotId).length > 0
            ? toMultiSelectValue(editableRecord.availabilitySlotId)
            : inferAvailabilitySlotIds(editableRecord, slotOptions);
        const draftWithSlots = {
          ...recordDraft,
          availabilitySlotId: inferredSlotIds,
        };

        const availableDates = availabilityDateField
          ? toMultiSelectValue(editableRecord.availableDate).length > 0
            ? toMultiSelectValue(editableRecord.availableDate)
            : getAvailabilityDateOptions(
                availabilityDateField,
                draftWithSlots,
                hydratedRelationOptions,
                [],
              )
                .map((option) => option.value)
                .slice(0, Number(editableRecord.lessonCount ?? 4) === 8 ? 2 : 1)
          : [];

        setEditingId(row.id);
        setDraft({
          ...draftWithSlots,
          availableDate: availableDates,
        });
        setFormOpen(true);
      } catch {
        setEditingId(row.id);
        setDraft(baseDraft);
        setFormOpen(true);
      }
    },
    [emptyDraft, fields, fetchRelationOptions, relationOptions, resource],
  );

  const renderTableValue = useCallback(
    (row: UiRecord, field: FieldConfig) =>
      formatValue(row[field.key], field, relationOptions, relationOptionLookup),
    [relationOptionLookup, relationOptions],
  );

  function openCreateRecord() {
    setEditingId(null);
    setDraft(emptyDraft);
    setFormOpen(true);
  }

  function openQuickCreate(field: FieldConfig) {
    if (!field.quickCreate) return;

    setQuickCreateField(field);
    setQuickCreateDraft(
      Object.fromEntries(
        field.quickCreate.fields.map((quickField) => [
          quickField.key,
          quickField.type === "checkbox" ? false : quickField.multiple ? [] : "",
        ]),
      ) as Record<string, RecordValue>,
    );
  }

  async function saveQuickCreate() {
    if (!quickCreateField?.quickCreate) return;

    const response = await fetch(`/api/${quickCreateField.quickCreate.resource}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quickCreateDraft),
    });

    const json = (await response.json()) as { data?: UiRecord; error?: string };

    if (!response.ok || !json.data) {
      toast.error(json.error ?? "Unable to create related record");
      return;
    }

    const [fieldKey, options] = await fetchRelationOptions(quickCreateField);
    invalidateResourceOptionsCache([quickCreateField.quickCreate.resource]);
    setRelationOptions((current) => ({ ...current, [fieldKey]: options }));
    setDraft((current) => ({
      ...current,
      [quickCreateField.key]: quickCreateField.multiple
        ? [...toMultiSelectValue(current[quickCreateField.key]), json.data!.id]
        : json.data!.id,
    }));
    setQuickCreateField(null);
    setQuickCreateDraft({});
    toast.success(`${quickCreateField.quickCreate.title} created`);
  }

  return (
    <div className="space-y-4">
      <Card className="liquid-glass">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-zinc-500">Academic data</p>
            <CardTitle className="mt-1 text-2xl">{title}</CardTitle>
            <p className="mt-2 whitespace-pre-line text-sm text-zinc-500">{description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Live records</Badge>
            {canCreate ? (
              <Button onClick={openCreateRecord} variant="glass">
                <Plus className="size-4" />
                Create record
              </Button>
            ) : null}
            <Button onClick={loadRows} size="icon" variant="glass" aria-label="Refresh">
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4">
        <Card className="liquid-glass">
          <CardHeader>
            <CardTitle className="text-base">
              {loading ? (
                <span className="block h-5 w-28 animate-pulse rounded-lg bg-white/45" />
              ) : hasFiltering ? (
                `${totalRows} matching records`
              ) : (
                `${totalRows} records`
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {error}
              </div>
            ) : null}
            <ResourceFilterBar
              fieldFilters={fieldFilters}
              filterOptions={filterOptions}
              mobileFilterOpen={mobileFilterOpen}
              searchTerm={searchTerm}
              setFieldFilters={setFieldFilters}
              setMobileFilterOpen={setMobileFilterOpen}
              setSearchTerm={setSearchTerm}
              setSortDirection={setSortDirection}
              sortConfig={sortConfig}
              sortDirection={sortDirection}
              title={title}
              visibleFilterFields={visibleFilterFields}
            />
            <ResourceTable
              loading={loading}
              onDelete={setPendingDelete}
              onEdit={editRow}
              renderValue={renderTableValue}
              rows={paginatedRows}
              searchTerm={searchTerm}
              showDeleteAction={canDeleteResource}
              showEditAction={canUpdateResource}
              showActionsColumn={showActionsColumn}
              tableFields={tableFields}
              totalRows={totalRows}
            />
            <ResourcePagination
              onPageChange={setPage}
              page={page}
              pageSize={TABLE_PAGE_SIZE}
              totalPages={totalPages}
              totalRows={totalRows}
            />
          </CardContent>
        </Card>
      </div>

      {formOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/30 p-4 backdrop-blur-sm">
          <Card className="liquid-glass flex max-h-[calc(100vh-32px)] w-full max-w-[420px] flex-col overflow-hidden">
            <CardHeader className="shrink-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Plus className="size-4" />
                {editingId ? "Edit record" : "Create record"}
              </CardTitle>
            </CardHeader>
            <CardContent className="min-h-0 space-y-3 overflow-y-auto no-scrollbar">
              {formFields.map((field) => {
                const fieldVisible = isFieldVisible(field, draft);

                return (
                  <label className={fieldVisible ? "block" : "hidden"} key={field.key}>
                    <span className="mb-1.5 block text-xs font-medium text-zinc-500">
                      {field.label}
                    </span>
                    {field.type === "textarea" ? (
                      <textarea
                        className="min-h-24 w-full rounded-2xl border border-white/50 bg-white/58 px-3 py-2 text-sm text-zinc-900 outline-none backdrop-blur-xl transition focus:border-sky-300 focus:bg-white/75 focus:ring-2 focus:ring-sky-200"
                        disabled={!fieldVisible}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, [field.key]: event.target.value }))
                        }
                        value={String(draft[field.key] ?? "")}
                      />
                    ) : field.type === "checkbox" ? (
                      <input
                        checked={Boolean(draft[field.key])}
                        className="size-5 accent-zinc-950"
                        disabled={!fieldVisible}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, [field.key]: event.target.checked }))
                        }
                        type="checkbox"
                      />
                    ) : (field.type === "select" || field.type === "relation") && field.multiple ? (
                      <div className="space-y-2">
                        <div className="grid max-h-44 gap-2 overflow-y-auto rounded-2xl border border-white/50 bg-white/42 p-2 backdrop-blur-xl">
                          {(
                            field.type === "relation"
                              ? getFieldOptions(field, draft, relationOptions, scheduleRows)
                              : getSelectOptions(field, draft, relationOptions, scheduleRows)
                          ).map((option) => {
                            const selectedValues = toMultiSelectValue(draft[field.key]);
                            const checked = selectedValues.includes(option.value);
                            const disabled = Boolean("disabled" in option && option.disabled);

                            return (
                              <button
                                aria-pressed={checked}
                                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition ${
                                  checked
                                    ? "border-zinc-950 bg-zinc-950 text-white"
                                    : "border-white/50 bg-white/52 text-zinc-900 hover:bg-white/75"
                                } ${disabled ? "cursor-not-allowed opacity-45" : ""}`}
                                disabled={disabled || !fieldVisible}
                                key={option.value}
                                onClick={(event) => {
                                  event.preventDefault();
                                  setDraft((current) => {
                                    const currentValues = toMultiSelectValue(current[field.key]);
                                    const nextValue = getNextMultiSelectValue({
                                      checked,
                                      currentValues,
                                      draft: current,
                                      field,
                                      option,
                                      relationOptions,
                                    });

                                    if (!nextValue) return current;

                                    const nextDraft = {
                                      ...current,
                                      [field.key]: nextValue,
                                      ...clearHiddenDependentValues(fields, field.key, option.value),
                                      ...clearFilteredDependentValues(fields, field.key),
                                    };

                                    return applyDerivedValues(fields, nextDraft, relationOptions, scheduleRows);
                                  });
                                }}
                                type="button"
                              >
                                <span
                                  className={`grid size-4 shrink-0 place-items-center rounded border text-[10px] ${
                                    checked
                                      ? "border-white bg-white text-zinc-950"
                                      : "border-zinc-300 bg-white/70 text-transparent"
                                  }`}
                                >
                                  ✓
                                </span>
                                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                              </button>
                            );
                          })}
                        </div>
                        {field.key === "availabilitySlotId" ? (
                          <p className="text-xs text-zinc-500">
                            Paket A pilih 1 slot. Paket B pilih 2 slot.
                          </p>
                        ) : null}
                        {field.key === "availableDate" ? (
                          <p className="text-xs text-zinc-500">
                            Paket A pilih 1 tanggal. Paket B pilih 2 tanggal awal dari slot yang dipilih.
                          </p>
                        ) : null}
                        {field.quickCreate ? (
                          <Button
                            onClick={(event) => {
                              event.preventDefault();
                              openQuickCreate(field);
                            }}
                            size="sm"
                            type="button"
                            variant="glass"
                          >
                            <Plus className="size-3.5" />
                            Add {field.quickCreate.title}
                          </Button>
                        ) : null}
                      </div>
                    ) : field.type === "select" || field.type === "relation" ? (
                      <div className="space-y-2">
                        <select
                          className="h-11 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl transition focus:border-sky-300 focus:bg-white/75 focus:ring-2 focus:ring-sky-200"
                          disabled={!fieldVisible}
                          onChange={(event) =>
                            setDraft((current) => {
                              const nextValue = event.target.value;
                              const nextDraft = {
                                ...current,
                                [field.key]: nextValue,
                                ...clearHiddenDependentValues(fields, field.key, event.target.value),
                                ...clearFilteredDependentValues(fields, field.key),
                              };

                              return applyDerivedValues(fields, nextDraft, relationOptions, scheduleRows);
                            })
                          }
                          value={
                            String(draft[field.key] ?? "")
                          }
                        >
                          <option value="">Select {field.label}</option>
                          {(
                            field.type === "relation"
                              ? getFieldOptions(field, draft, relationOptions, scheduleRows)
                              : getSelectOptions(field, draft, relationOptions, scheduleRows)
                          ).map((option) => (
                            <option disabled={Boolean("disabled" in option && option.disabled)} key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {field.roomAvailabilityFrom &&
                        isFieldVisible(field, draft) &&
                        getFieldOptions(field, draft, relationOptions, scheduleRows).length > 0 &&
                        getFieldOptions(field, draft, relationOptions, scheduleRows).every(
                          (option) => option.disabled,
                        ) ? (
                          <p className="rounded-2xl border border-amber-200/70 bg-amber-50/80 px-3 py-2 text-xs text-amber-800">
                            Semua studio sudah booked untuk slot ini. Ganti tanggal, jam, atau instructor.
                          </p>
                        ) : null}
                        {field.quickCreate ? (
                          <Button
                            onClick={(event) => {
                              event.preventDefault();
                              openQuickCreate(field);
                            }}
                            size="sm"
                            type="button"
                            variant="glass"
                          >
                            <Plus className="size-3.5" />
                            Add {field.quickCreate.title}
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      <input
                        className="h-11 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl transition focus:border-sky-300 focus:bg-white/75 focus:ring-2 focus:ring-sky-200"
                        disabled={!fieldVisible}
                        onChange={(event) =>
                          setDraft((current) =>
                            applyDerivedValues(
                              fields,
                              {
                                ...current,
                                [field.key]:
                                  field.type === "number" ? Number(event.target.value) : event.target.value,
                              },
                              relationOptions,
                              scheduleRows,
                            ),
                          )
                        }
                        type={field.type ?? "text"}
                        value={String(draft[field.key] ?? "")}
                      />
                    )}
                  </label>
                );
              })}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  onClick={() => {
                    setEditingId(null);
                    setDraft(emptyDraft);
                    setFormOpen(false);
                  }}
                  variant="glass"
                >
                  Cancel
                </Button>
                <Button onClick={saveRecord}>
                  <Save className="size-4" />
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {pendingDelete ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/30 p-4 backdrop-blur-sm">
          <Card className="liquid-glass w-full max-w-md">
            <CardHeader>
              <CardTitle>Delete record?</CardTitle>
              <p className="mt-1 text-sm text-zinc-500">
                This action cannot be undone. The selected record will be removed from
                {` ${title}`}.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-white/45 bg-white/42 p-3 text-sm text-zinc-600">
                {tableFields
                  .slice(0, 3)
                  .map(
                    (field) =>
                      `${field.label}: ${formatValue(pendingDelete[field.key], field, relationOptions)}`,
                  )
                  .join(" | ")}
              </div>
              <div className="flex justify-end gap-2">
                <Button onClick={() => setPendingDelete(null)} variant="glass">
                  Cancel
                </Button>
                <Button onClick={() => deleteRow(pendingDelete.id)}>
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {quickCreateField?.quickCreate ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/30 p-4 backdrop-blur-sm">
          <Card className="liquid-glass w-full max-w-md">
            <CardHeader>
              <CardTitle>Add {quickCreateField.quickCreate.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {quickCreateField.quickCreate.fields.map((field) => (
                <label className="block" key={field.key}>
                  <span className="mb-1.5 block text-xs font-medium text-zinc-500">
                    {field.label}
                  </span>
                  {field.type === "checkbox" ? (
                    <input
                      checked={Boolean(quickCreateDraft[field.key])}
                      className="size-5 accent-zinc-950"
                      onChange={(event) =>
                        setQuickCreateDraft((current) => ({
                          ...current,
                          [field.key]: event.target.checked,
                        }))
                      }
                      type="checkbox"
                    />
                  ) : (
                    <input
                      className="h-11 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl transition focus:border-sky-300 focus:bg-white/75 focus:ring-2 focus:ring-sky-200"
                      onChange={(event) =>
                        setQuickCreateDraft((current) => ({
                          ...current,
                          [field.key]:
                            field.type === "number"
                              ? Number(event.target.value)
                              : event.target.value,
                        }))
                      }
                      type={field.type ?? "text"}
                      value={String(quickCreateDraft[field.key] ?? "")}
                    />
                  )}
                </label>
              ))}
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => {
                    setQuickCreateField(null);
                    setQuickCreateDraft({});
                  }}
                  type="button"
                  variant="glass"
                >
                  Cancel
                </Button>
                <Button onClick={saveQuickCreate} type="button">
                  <Save className="size-4" />
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
