"use client";

import { Edit3, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getClientSession } from "@/lib/client-session";
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
  quickCreate?: {
    title: string;
    resource: ResourceName;
    fields: FieldConfig[];
  };
};

type RecordValue = string | number | boolean | string[];
type UiRecord = Record<string, RecordValue> & { id: string };
type RelationOption = {
  disabled?: boolean;
  label: string;
  record: UiRecord;
  unavailableReason?: string;
  value: string;
};

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
  const [rows, setRows] = useState<UiRecord[]>([]);
  const [draft, setDraft] = useState<Record<string, RecordValue>>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<UiRecord | null>(null);
  const [quickCreateField, setQuickCreateField] = useState<FieldConfig | null>(null);
  const [quickCreateDraft, setQuickCreateDraft] = useState<Record<string, RecordValue>>({});
  const [loading, setLoading] = useState(true);
  const [sessionRole, setSessionRole] = useState<string>("");
  const [error, setError] = useState("");
  const [relationOptions, setRelationOptions] = useState<Record<string, RelationOption[]>>({});
  const [scheduleRows, setScheduleRows] = useState<UiRecord[]>([]);
  const fieldsSignature = useMemo(() => JSON.stringify(fields), [fields]);
  const formFields = fields.filter(
    (field) => !field.hidden && (!field.hideOnCreate || editingId),
  );
  const isParentStudentsView = resource === "students" && sessionRole === "Parent Portal User";
  const hidePortalEnabledColumn = [
    "Parent Portal User",
    "Student Portal User",
    "Music Instructor",
  ].includes(sessionRole);
  const canWriteResource =
    resource === "users"
      ? canAccessResource({ role: sessionRole, resource: "users", action: "create" })
      : canAccessResource({ role: sessionRole, resource, action: "create" }) &&
        canAccessResource({ role: sessionRole, resource, action: "update" }) &&
        canAccessResource({ role: sessionRole, resource, action: "delete" });
  const tableFields = fields.filter(
    (field) =>
      !field.writeOnly &&
      !(isParentStudentsView && field.key === "portalEnabled") &&
      !(hidePortalEnabledColumn && field.key === "portalEnabled"),
  );
  const showActionsColumn = !isParentStudentsView && canWriteResource;
  const canCreate = allowCreate && !isParentStudentsView && canWriteResource;

  const fetchRelationOptions = useCallback(async (field: FieldConfig): Promise<
    readonly [string, RelationOption[]]
  > => {
    if (!field.relation) return [field.key, []];

    const response = await fetch(`/api/${field.relation.resource}`, { cache: "no-store" });
    const json = (await response.json()) as { data?: UiRecord[] };
    const records = (Array.isArray(json.data) ? json.data : []).filter((record) =>
      field.relation?.activeOnly ? record.isActive !== false : true,
    );
    const valueField = field.relation.valueField ?? "id";

    return [
      field.key,
      records.map((record) => ({
        value: String(record[valueField] ?? record.id),
        label: formatRelationOptionLabel(field, record, valueField),
        record,
      })),
    ] as const;
  }, []);

  const loadSchedulesForAvailability = useCallback(async () => {
    try {
      const response = await fetch("/api/schedules", { cache: "no-store" });
      const json = (await response.json()) as { data?: UiRecord[] };
      setScheduleRows(Array.isArray(json.data) ? json.data : []);
    } catch {
      setScheduleRows([]);
    }
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/${resource}`, { cache: "no-store" });
      const json = (await response.json()) as { data?: UiRecord[]; error?: string };

      if (!response.ok) {
        setRows([]);
        setError(json.error ?? "Unable to load records");
        toast.error(json.error ?? "Unable to load records");
        return;
      }

      setRows(Array.isArray(json.data) ? json.data : []);
    } catch {
      setRows([]);
      setError("Unable to connect to the server");
      toast.error("Unable to connect to the server");
    } finally {
      setLoading(false);
    }
  }, [resource]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadRows();
    });
  }, [loadRows]);

  useEffect(() => {
    let mounted = true;

    async function loadSessionRole() {
      try {
        const session = (await getClientSession()) as { user?: { role?: string } };
        if (mounted) {
          setSessionRole(session.user?.role ?? "");
        }
      } catch {
        if (mounted) {
          setSessionRole("");
        }
      }
    }

    void loadSessionRole();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadRelationOptions() {
      const relationFields = fields.filter((field) => field.type === "relation" && field.relation);
      const entries = await Promise.all(
        relationFields.map(async (field) => {
          try {
            return await fetchRelationOptions(field);
          } catch {
            return [field.key, []] as const;
          }
        }),
      );

      if (mounted) {
        setRelationOptions(Object.fromEntries(entries));
      }
    }

    void loadRelationOptions();

    return () => {
      mounted = false;
    };
  }, [fieldsSignature, fields, fetchRelationOptions]);

  useEffect(() => {
    if (!fields.some((field) => field.roomAvailabilityFrom || field.availabilityDateFrom)) return;

    let mounted = true;

    async function loadSchedules() {
      try {
        const response = await fetch("/api/schedules", { cache: "no-store" });
        const json = (await response.json()) as { data?: UiRecord[] };

        if (mounted) {
          setScheduleRows(Array.isArray(json.data) ? json.data : []);
        }
      } catch {
        if (mounted) setScheduleRows([]);
      }
    }

    void loadSchedules();

    return () => {
      mounted = false;
    };
  }, [fieldsSignature, fields]);

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

  function editRow(row: UiRecord) {
    setEditingId(row.id);
    setDraft(
      Object.fromEntries(
        fields.map((field) => [field.key, row[field.key] ?? emptyDraft[field.key]]),
      ) as Record<string, RecordValue>,
    );
    setFormOpen(true);
  }

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
              {loading ? <span className="block h-5 w-28 animate-pulse rounded-lg bg-white/45" /> : `${rows.length} records`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {error}
              </div>
            ) : null}
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-max max-w-full border-separate border-spacing-y-2 text-left text-sm sm:w-full sm:min-w-[820px]">
                <thead className="text-xs uppercase text-zinc-500">
                  <tr>
                    {tableFields.map((field) => (
                      <th className="whitespace-nowrap px-3 py-2 font-medium" key={field.key}>
                        {field.label}
                      </th>
                    ))}
                    {showActionsColumn ? (
                      <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Actions</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr className="bg-white/42" key={row.id}>
                      {tableFields.map((field, index) => (
                        <td
                          className={`whitespace-nowrap px-3 py-3 text-zinc-700 ${index === 0 ? "rounded-l-2xl font-medium text-zinc-950" : ""}`}
                          key={field.key}
                        >
                          {formatValue(row[field.key], field, relationOptions)}
                        </td>
                      ))}
                      {showActionsColumn ? (
                        <td className="rounded-r-2xl px-3 py-3">
                          <div className="flex justify-end gap-2">
                            <Button onClick={() => editRow(row)} size="icon" variant="glass">
                              <Edit3 className="size-4" />
                            </Button>
                            <Button
                              onClick={() => setPendingDelete(row)}
                              size="icon"
                              variant="glass"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

function isFieldVisible(field: FieldConfig, draft: Record<string, RecordValue>) {
  if (!field.visibleWhen) return true;

  return String(draft[field.visibleWhen.field] ?? "") === field.visibleWhen.value;
}

function clearHiddenDependentValues(
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

function isRecordValueEqual(left: RecordValue | undefined, right: RecordValue | undefined) {
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

function clearFilteredDependentValues(fields: FieldConfig[], changedField: string) {
  return Object.fromEntries(
    fields
      .filter((field) => field.relationFilter?.sourceField === changedField)
      .map((field) => [field.key, field.multiple ? [] : ""]),
  );
}

function getNextMultiSelectValue({
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

function applyDerivedValues(
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

function getSelectOptions(
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

function getAvailabilityDateOptions(
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

function getFieldOptions(
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

  return filterRoomAvailabilityOptions(field, draft, relationFilteredOptions, scheduleRows);
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

    const conflict = roomSchedules.find((schedule) =>
      rangesOverlap(
        fromTime,
        toTime,
        String(schedule.fromTime ?? ""),
        String(schedule.toTime ?? ""),
      ),
    );

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

function formatRelationOptionLabel(field: FieldConfig, record: UiRecord, valueField: string) {
  if (field.relation?.resource === "instructor-availability") {
    return [
      lessonDayLabel(record.dayOfWeek),
      `${String(record.fromTime ?? "")} - ${String(record.toTime ?? "")}`,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  return formatDisplayText(
    field.relation!.labelFields
      .map((labelField) => record[labelField])
      .filter(Boolean)
      .join(" ") || String(record[valueField] ?? record.id),
  );
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

function getDerivedValue(
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

function toMultiSelectValue(value: RecordValue | undefined) {
  if (Array.isArray(value)) return value.map(String);

  return String(value ?? "")
    .split(",")
    .filter(Boolean);
}

function formatValue(
  value: unknown,
  field?: FieldConfig,
  relationOptions?: Record<string, RelationOption[]>,
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

    if (Array.isArray(value)) {
      const mappedLabels = value
        .map((item) => options.find((option) => option.value === String(item))?.label)
        .filter((label): label is string => Boolean(label));

      return (
        mappedLabels
          .map((item) => formatDisplayText(item))
          .join(", ") || "-"
      );
    }

    if (value === null || value === undefined || value === "") return "-";

    return formatDisplayText(options.find((option) => option.value === String(value))?.label ?? "-");
  }

  if (Array.isArray(value)) return value.map(formatDisplayText).join(", ") || "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined || value === "") return "-";
  return formatDisplayText(value);
}

function optionLabel(options: { label: string; value: string }[], value: unknown) {
  return options.find((option) => option.value === String(value))?.label ?? String(value);
}
