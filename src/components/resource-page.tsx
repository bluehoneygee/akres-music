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
  type?: "text" | "number" | "date" | "time" | "checkbox" | "textarea" | "select";
  options?: { label: string; value: string }[];
  required?: boolean;
  writeOnly?: boolean;
};

type RecordValue = string | number | boolean | string[];
type UiRecord = Record<string, RecordValue> & { id: string };

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
        fields.map((field) => [field.key, field.type === "checkbox" ? false : ""]),
      ) as Record<string, RecordValue>,
    [fields],
  );
  const [rows, setRows] = useState<UiRecord[]>([]);
  const [draft, setDraft] = useState<Record<string, RecordValue>>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<UiRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
            {fields.map((field) => (
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
                ) : field.type === "select" ? (
                  <select
                    className="h-11 w-full rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl transition focus:border-sky-300 focus:bg-white/75 focus:ring-2 focus:ring-sky-200"
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, [field.key]: event.target.value }))
                    }
                    value={String(draft[field.key] ?? "")}
                  >
                    <option value="">Select {field.label}</option>
                    {(field.options ?? []).map((option) => (
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
                          {formatValue(row[field.key])}
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
                  .map((field) => `${field.label}: ${formatValue(pendingDelete[field.key])}`)
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

function formatValue(value: unknown) {
  if (Array.isArray(value)) return value.join(", ") || "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}
