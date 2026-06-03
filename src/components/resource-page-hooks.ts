"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import type { SortDirection, UiRecord } from "@/components/resource-page";

export const TABLE_PAGE_SIZE = 50;

export function useResourceRows({
  debouncedSearchTerm,
  fieldFilters,
  page,
  resource,
  onRole,
  sortDirection,
  tableFieldKeys,
  visibleFilterFieldKeys,
}: {
  debouncedSearchTerm: string;
  fieldFilters: Record<string, string>;
  onRole?: (role: string) => void;
  page: number;
  resource: string;
  sortDirection: SortDirection;
  tableFieldKeys: string;
  visibleFilterFieldKeys: string;
}) {
  const rowsAbortRef = useRef<AbortController | null>(null);
  const [rows, setRows] = useState<UiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterFacets, setFilterFacets] = useState<Record<string, unknown[]>>({});
  const [totalRows, setTotalRows] = useState(0);

  const loadRows = useCallback(async () => {
    rowsAbortRef.current?.abort();
    const controller = new AbortController();
    rowsAbortRef.current = controller;
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        facetFields: visibleFilterFieldKeys,
        fields: tableFieldKeys,
        limit: String(TABLE_PAGE_SIZE),
        page: String(page),
      });
      if (debouncedSearchTerm.trim()) params.set("search", debouncedSearchTerm.trim());
      if (hasActiveFilters(fieldFilters)) params.set("filters", JSON.stringify(fieldFilters));
      if (sortDirection) params.set("sort", sortDirection);

      const response = await fetch(`/api/${resource}?${params.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const json = (await response.json()) as {
        data?: UiRecord[];
        error?: string;
        facets?: Record<string, unknown[]>;
        role?: string;
        total?: number;
      };
      if (controller.signal.aborted) return;

      if (!response.ok) {
        setRows([]);
        setFilterFacets({});
        setTotalRows(0);
        setError(json.error ?? "Unable to load records");
        toast.error(json.error ?? "Unable to load records");
        return;
      }

      setRows(Array.isArray(json.data) ? json.data : []);
      setFilterFacets(json.facets ?? {});
      onRole?.(json.role ?? "");
      setTotalRows(Number(json.total ?? json.data?.length ?? 0));
    } catch {
      if (controller.signal.aborted) return;
      setRows([]);
      setFilterFacets({});
      setTotalRows(0);
      setError("Unable to connect to the server");
      toast.error("Unable to connect to the server");
    } finally {
      setLoading(false);
    }
  }, [
    debouncedSearchTerm,
    fieldFilters,
    onRole,
    page,
    resource,
    sortDirection,
    tableFieldKeys,
    visibleFilterFieldKeys,
  ]);

  useEffect(() => () => rowsAbortRef.current?.abort(), []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadRows();
    });
  }, [loadRows]);

  return {
    error,
    filterFacets,
    loadRows,
    loading,
    rows,
    setError,
    totalRows,
  };
}

export function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, value]);

  return debouncedValue;
}

function hasActiveFilters(fieldFilters: Record<string, string>) {
  return Object.values(fieldFilters).some(Boolean);
}
