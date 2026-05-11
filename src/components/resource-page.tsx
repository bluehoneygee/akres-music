"use client";

import { Edit3, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ResourceName } from "@/lib/models";

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
};

type RecordValue = string | number | boolean | string[];
type UiRecord = Record<string, RecordValue> & { id: string };
type RelationOption = { label: string; record: UiRecord; value: string };

export function ResourcePage({
  title,
  description,
  resource,
  fields,
}: {
  title: string;
  description: string;
  resource: ResourceName | "users";
  fields: FieldConfig[];
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
  const [pendingDelete, setPendingDelete] = useState<UiRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [relationOptions, setRelationOptions] = useState<Record<string, RelationOption[]>>({});
  const fieldsSignature = useMemo(() => JSON.stringify(fields), [fields]);
  const formFields = fields.filter(
    (field) => !field.hidden && (!field.hideOnCreate || editingId) && isFieldVisible(field, draft),
  );
  const tableFields = fields.filter((field) => !field.writeOnly);

  async function loadRows() {
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
  }

  useEffect(() => {
    void loadRows();
  }, [resource]);

  useEffect(() => {
    let mounted = true;

    async function loadRelationOptions() {
      const relationFields = fields.filter((field) => field.type === "relation" && field.relation);
      const entries = await Promise.all(
        relationFields.map(async (field) => {
          try {
            const response = await fetch(`/api/${field.relation!.resource}`, { cache: "no-store" });
            const json = (await response.json()) as { data?: UiRecord[] };
            const records = Array.isArray(json.data) ? json.data : [];
            const valueField = field.relation!.valueField ?? "id";

            return [
              field.key,
              records.map((record) => ({
                value: String(record[valueField] ?? record.id),
                label:
                  field.relation!.labelFields
                    .map((labelField) => record[labelField])
                    .filter(Boolean)
                    .join(" ") || String(record[valueField] ?? record.id),
                record,
              })),
            ] as const;
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
  }, [fieldsSignature, fields]);

  useEffect(() => {
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

            const options = getFieldOptions(field, current, relationOptions);
            const currentValue = current[field.key];
            const optionValues = new Set(options.map((option) => option.value));

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
              options.length === 1
            ) {
              return [field.key, options[0].value];
            }

            return [field.key, currentValue];
          }),
      ) as Record<string, RecordValue>;

      const changed = Object.entries(updates).some(
        ([key, value]) => !isRecordValueEqual(current[key], value),
      );
      return changed ? { ...current, ...updates } : current;
    });
  }, [fieldsSignature, fields, relationOptions]);

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
    setDraft(emptyDraft);
    await loadRows();
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
  }

  return (
    <div className="space-y-4">
      <Card className="liquid-glass">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-zinc-500">Academic data</p>
            <CardTitle className="mt-1 text-2xl">{title}</CardTitle>
            <p className="mt-2 text-sm text-zinc-500">{description}</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline">Live records</Badge>
            <Button onClick={loadRows} size="icon" variant="glass" aria-label="Refresh">
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="liquid-glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="size-4" />
              {editingId ? "Edit record" : "Create record"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {formFields.map((field) => (
              <label className="block" key={field.key}>
                <span className="mb-1.5 block text-xs font-medium text-zinc-500">
                  {field.label}
                </span>
                {field.type === "textarea" ? (
                  <textarea
                    className="min-h-24 w-full rounded-2xl border border-white/50 bg-white/58 px-3 py-2 text-sm text-zinc-900 outline-none backdrop-blur-xl transition focus:border-sky-300 focus:bg-white/75 focus:ring-2 focus:ring-sky-200"
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, [field.key]: event.target.value }))
                    }
                    value={String(draft[field.key] ?? "")}
                  />
                ) : field.type === "checkbox" ? (
                  <input
                    checked={Boolean(draft[field.key])}
                    className="size-5 accent-zinc-950"
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, [field.key]: event.target.checked }))
                    }
                    type="checkbox"
                  />
                ) : field.type === "select" || field.type === "relation" ? (
                  <select
                    className={`${field.multiple ? "min-h-28 py-2" : "h-11"} w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl transition focus:border-sky-300 focus:bg-white/75 focus:ring-2 focus:ring-sky-200`}
                    multiple={field.multiple}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        [field.key]: field.multiple
                          ? Array.from(event.target.selectedOptions, (option) => option.value)
                          : event.target.value,
                        ...clearHiddenDependentValues(fields, field.key, event.target.value),
                        ...clearFilteredDependentValues(fields, field.key),
                      }))
                    }
                    value={
                      field.multiple
                        ? toMultiSelectValue(draft[field.key])
                        : String(draft[field.key] ?? "")
                    }
                  >
                    {field.multiple ? null : <option value="">Select {field.label}</option>}
                    {(
                      field.type === "relation"
                        ? getFieldOptions(field, draft, relationOptions)
                        : field.options ?? []
                    ).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="h-11 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl transition focus:border-sky-300 focus:bg-white/75 focus:ring-2 focus:ring-sky-200"
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        [field.key]:
                          field.type === "number" ? Number(event.target.value) : event.target.value,
                      }))
                    }
                    type={field.type ?? "text"}
                    value={String(draft[field.key] ?? "")}
                  />
                )}
              </label>
            ))}
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={saveRecord}>
                <Save className="size-4" />
                Save
              </Button>
              <Button
                onClick={() => {
                  setEditingId(null);
                  setDraft(emptyDraft);
                }}
                variant="glass"
              >
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="liquid-glass">
          <CardHeader>
            <CardTitle className="text-base">
              {loading ? "Loading..." : `${rows.length} records`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {error}
              </div>
            ) : null}
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full min-w-[820px] border-separate border-spacing-y-2 text-left text-sm">
                <thead className="text-xs uppercase text-zinc-500">
                  <tr>
                    {tableFields.map((field) => (
                      <th className="px-3 py-2 font-medium" key={field.key}>
                        {field.label}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr className="bg-white/42" key={row.id}>
                      {tableFields.map((field, index) => (
                        <td
                          className={`px-3 py-3 text-zinc-700 ${index === 0 ? "rounded-l-2xl font-medium text-zinc-950" : ""}`}
                          key={field.key}
                        >
                          {formatValue(row[field.key], field, relationOptions)}
                        </td>
                      ))}
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

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

function getFieldOptions(
  field: FieldConfig,
  draft: Record<string, RecordValue>,
  relationOptions: Record<string, RelationOption[]>,
) {
  const options = relationOptions[field.key] ?? [];

  if (!field.relationFilter) return options;

  const sourceValue = draft[field.relationFilter.sourceField];
  if (!sourceValue) return options;

  const sourceOptions = relationOptions[field.relationFilter.sourceField] ?? [];
  const sourceRecord = sourceOptions.find((option) => option.value === String(sourceValue))?.record;
  const expectedValue = field.relationFilter.sourceOptionField
    ? sourceRecord?.[field.relationFilter.sourceOptionField]
    : sourceValue;

  if (!expectedValue) return options;

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

function getDerivedValue(
  field: FieldConfig,
  draft: Record<string, RecordValue>,
  relationOptions: Record<string, RelationOption[]>,
) {
  if (!field.deriveFrom) return undefined;

  const sourceValue = draft[field.deriveFrom.sourceField];
  if (!sourceValue) return undefined;

  const sourceOptions = relationOptions[field.deriveFrom.sourceField] ?? [];
  const sourceRecord = sourceOptions.find((option) => option.value === String(sourceValue))?.record;
  const derivedValue = sourceRecord?.[field.deriveFrom.sourceOptionField];

  return Array.isArray(derivedValue) ? derivedValue.map(String) : String(derivedValue ?? "");
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
  if (field?.type === "relation" && relationOptions) {
    const options = relationOptions[field.key] ?? [];

    if (Array.isArray(value)) {
      return (
        value
          .map((item) => options.find((option) => option.value === String(item))?.label ?? String(item))
          .join(", ") || "-"
      );
    }

    if (value === null || value === undefined || value === "") return "-";

    return options.find((option) => option.value === String(value))?.label ?? String(value);
  }

  if (Array.isArray(value)) return value.join(", ") || "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}
