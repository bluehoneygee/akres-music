"use client";

import { useEffect, useState } from "react";

import type { FieldConfig, RelationOption, UiRecord } from "@/components/resource-page";
import { formatDisplayText } from "@/lib/utils";

const RESOURCE_OPTIONS_CACHE_MS = 60_000;
const resourceOptionsCache = new Map<string, { data: Record<string, UiRecord[]>; expiresAt: number }>();

export function useResourceOptions(fields: FieldConfig[]) {
  const [relationOptions, setRelationOptions] = useState<Record<string, RelationOption[]>>({});
  const fieldsSignature = JSON.stringify(fields);

  useEffect(() => {
    let mounted = true;

    async function loadResourceOptions() {
      const relationFields = fields.filter((field) => field.type === "relation" && field.relation);
      const resources = buildResourceOptionRequirements(fields);

      if (resources.length === 0) return;

      try {
        const data = await fetchResourceOptions(resources);
        const nextRelationOptions = Object.fromEntries(
          relationFields.map((field) => {
            const records = data[String(field.relation?.resource)] ?? [];
            const valueField = field.relation?.valueField ?? "id";
            const options = records
              .filter((record) => (field.relation?.activeOnly ? record.isActive !== false : true))
              .map((record) => ({
                value: String(record[valueField] ?? record.id),
                label: formatRelationOptionLabel(field, record, valueField),
                record,
              }));

            return [field.key, options] as const;
          }),
        );

        if (mounted) setRelationOptions(nextRelationOptions);
      } catch {
        if (mounted) {
          setRelationOptions(Object.fromEntries(relationFields.map((field) => [field.key, []])));
        }
      }
    }

    void loadResourceOptions();

    return () => {
      mounted = false;
    };
  }, [fieldsSignature, fields]);

  return {
    fetchRelationOptions,
    relationOptions,
    setRelationOptions,
  };
}

export async function fetchRelationOptions(field: FieldConfig): Promise<readonly [string, RelationOption[]]> {
  if (!field.relation) return [field.key, []];

  const data = await fetchResourceOptions(buildResourceOptionRequirements([field]));
  const records = (data[field.relation.resource] ?? []).filter((record) =>
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
}

export function invalidateResourceOptionsCache(resources: string[]) {
  const resourceSet = new Set(resources);
  for (const key of resourceOptionsCache.keys()) {
    try {
      const requirements = JSON.parse(key) as Array<{ resource?: string }>;
      if (requirements.some((requirement) => resourceSet.has(String(requirement.resource ?? "")))) {
        resourceOptionsCache.delete(key);
      }
    } catch {
      resourceOptionsCache.delete(key);
    }
  }
}

async function fetchResourceOptions(resources: Array<{ fields: string[]; resource: string }>) {
  const cacheKey = JSON.stringify(resources);
  const cached = resourceOptionsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const response = await fetch("/api/resource-options", {
    body: JSON.stringify({ resources }),
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const json = (await response.json()) as { data?: Record<string, UiRecord[]> };
  const nextData = json.data ?? {};
  resourceOptionsCache.set(cacheKey, {
    data: nextData,
    expiresAt: Date.now() + RESOURCE_OPTIONS_CACHE_MS,
  });

  return nextData;
}

function buildResourceOptionRequirements(fields: FieldConfig[]) {
  const fieldsByKey = new Map(fields.map((field) => [field.key, field]));
  const fieldSetsByResource = new Map<string, Set<string>>();

  function addFields(resource: string | undefined, values: Array<string | undefined>) {
    if (!resource) return;
    const fieldSet = fieldSetsByResource.get(resource) ?? new Set<string>();
    values.filter(Boolean).forEach((value) => fieldSet.add(value!));
    fieldSetsByResource.set(resource, fieldSet);
  }

  for (const field of fields) {
    if (field.type === "relation" && field.relation) {
      addFields(field.relation.resource, [
        field.relation.valueField ?? "id",
        ...field.relation.labelFields,
        field.relation.activeOnly ? "isActive" : undefined,
        field.relation.activeOnly ? "active" : undefined,
        field.relationFilter?.optionField,
      ]);
    }

    if (field.deriveFrom) {
      const sourceField = fieldsByKey.get(field.deriveFrom.sourceField);
      addFields(sourceField?.relation?.resource, [field.deriveFrom.sourceOptionField]);
    }
  }

  return Array.from(fieldSetsByResource.entries()).map(([resource, fieldSet]) => ({
    resource,
    fields: [...fieldSet],
  }));
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
