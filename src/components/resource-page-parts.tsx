"use client";

import { ChevronDown, Edit3, Filter, Search, Trash2, X } from "lucide-react";
import { memo } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FieldConfig, UiRecord, SortDirection } from "@/components/resource-page";

type SortConfig = {
  label: string;
  value: (row: UiRecord) => string;
} | null;

export const ResourceFilterBar = memo(function ResourceFilterBar({
  fieldFilters,
  filterOptions,
  mobileFilterOpen,
  searchTerm,
  setFieldFilters,
  setMobileFilterOpen,
  setSearchTerm,
  setSortDirection,
  sortConfig,
  sortDirection,
  title,
  visibleFilterFields,
}: {
  fieldFilters: Record<string, string>;
  filterOptions: Record<string, Array<{ label: string; value: string }>>;
  mobileFilterOpen: boolean;
  searchTerm: string;
  setFieldFilters: Dispatch<SetStateAction<Record<string, string>>>;
  setMobileFilterOpen: Dispatch<SetStateAction<boolean>>;
  setSearchTerm: Dispatch<SetStateAction<string>>;
  setSortDirection: Dispatch<SetStateAction<SortDirection>>;
  sortConfig: SortConfig;
  sortDirection: SortDirection;
  title: string;
  visibleFilterFields: FieldConfig[];
}) {
  return (
    <div className="mb-4">
      <div className="no-scrollbar hidden items-center gap-2 overflow-x-auto pb-1 sm:flex">
        <div className="relative w-[280px] shrink-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <input
            className="h-10 w-full rounded-2xl border border-white/50 bg-white/58 pl-9 pr-9 text-sm text-zinc-900 outline-none backdrop-blur-xl transition placeholder:text-zinc-400 focus:border-sky-300 focus:bg-white/75 focus:ring-2 focus:ring-sky-200"
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={`Search ${title.toLowerCase()}`}
            type="search"
            value={searchTerm}
          />
          {searchTerm ? (
            <button
              aria-label="Clear search"
              className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-zinc-500 transition hover:bg-white/70 hover:text-zinc-900"
              onClick={() => setSearchTerm("")}
              type="button"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
        {visibleFilterFields.map((field) => {
          const options = filterOptions[field.key] ?? [];

          return (
            <select
              className="h-9 min-w-[150px] shrink-0 rounded-2xl border border-white/50 bg-white/58 px-3 text-xs text-zinc-900 outline-none backdrop-blur-xl transition focus:border-sky-300 focus:bg-white/75 focus:ring-2 focus:ring-sky-200"
              key={field.key}
              onChange={(event) =>
                setFieldFilters((current) => ({
                  ...current,
                  [field.key]: event.target.value,
                }))
              }
              value={fieldFilters[field.key] ?? ""}
            >
              <option value="">All {field.label}</option>
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          );
        })}
        {sortConfig ? (
          <select
            className="h-9 w-fit min-w-[160px] shrink-0 rounded-2xl border border-white/50 bg-white/58 px-3 text-xs text-zinc-900 outline-none backdrop-blur-xl transition focus:border-sky-300 focus:bg-white/75 focus:ring-2 focus:ring-sky-200"
            onChange={(event) => setSortDirection(event.target.value as SortDirection)}
            value={sortDirection}
          >
            <option value="">Default order</option>
            <option value="asc">{sortConfig.label} A-Z</option>
            <option value="desc">{sortConfig.label} Z-A</option>
          </select>
        ) : null}
      </div>

      <div className="sm:hidden">
        <button
          className="flex h-10 w-full items-center justify-between rounded-full border border-emerald-800/55 bg-white/70 px-4 text-sm font-medium text-slate-800 shadow-[0_2px_0_rgba(21,128,61,0.25)] backdrop-blur-xl"
          onClick={() => setMobileFilterOpen((current) => !current)}
          type="button"
        >
          <span className="flex items-center gap-2">
            <Filter className="size-4" />
            Filter
          </span>
          <ChevronDown className={`size-4 transition-transform ${mobileFilterOpen ? "rotate-180" : ""}`} />
        </button>

        {mobileFilterOpen ? (
          <div className="mt-3 space-y-3 rounded-3xl border border-white/75 bg-slate-100/86 p-4 shadow-sm backdrop-blur-xl">
            {visibleFilterFields.map((field) => {
              const options = filterOptions[field.key] ?? [];

              return (
                <div className="space-y-1" key={field.key}>
                  <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">
                    {field.label}
                  </span>
                  <Select
                    onValueChange={(value) => {
                      setFieldFilters((current) => ({
                        ...current,
                        [field.key]: value === "ALL" ? "" : value,
                      }));
                    }}
                    value={fieldFilters[field.key] || "ALL"}
                  >
                    <SelectTrigger className="h-10 w-full rounded-xl border-white/80 bg-white/82 text-sm text-slate-800 focus:border-emerald-700/50 focus:ring-emerald-700/15">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem className="py-1.5" value="ALL">
                        All {field.label}
                      </SelectItem>
                      {options.map((option) => (
                        <SelectItem className="py-1.5" key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}

            {sortConfig ? (
              <div className="space-y-1">
                <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">
                  Sort
                </span>
                <Select
                  onValueChange={(value) =>
                    setSortDirection(value === "DEFAULT" ? "" : (value as SortDirection))
                  }
                  value={sortDirection || "DEFAULT"}
                >
                  <SelectTrigger className="h-10 w-full rounded-xl border-white/80 bg-white/82 text-sm text-slate-800 focus:border-emerald-700/50 focus:ring-emerald-700/15">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem className="py-1.5" value="DEFAULT">
                      Default order
                    </SelectItem>
                    <SelectItem className="py-1.5" value="asc">
                      {sortConfig.label} A-Z
                    </SelectItem>
                    <SelectItem className="py-1.5" value="desc">
                      {sortConfig.label} Z-A
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <label className="block space-y-1">
              <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">
                Search
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                <input
                  className="h-10 w-full rounded-xl border border-white/80 bg-white/82 pl-9 pr-9 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-700/50 focus:ring-2 focus:ring-emerald-700/15"
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={`Search ${title.toLowerCase()}`}
                  type="search"
                  value={searchTerm}
                />
                {searchTerm ? (
                  <button
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                    onClick={() => setSearchTerm("")}
                    type="button"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : null}
              </div>
            </label>
          </div>
        ) : null}
      </div>
    </div>
  );
});

export const ResourceTable = memo(function ResourceTable({
  loading,
  onDelete,
  onEdit,
  renderValue,
  rows,
  searchTerm,
  showDeleteAction,
  showEditAction,
  showActionsColumn,
  tableFields,
  totalRows,
}: {
  loading: boolean;
  onDelete: (row: UiRecord) => void;
  onEdit: (row: UiRecord) => void;
  renderValue: (row: UiRecord, field: FieldConfig) => ReactNode;
  rows: UiRecord[];
  searchTerm: string;
  showDeleteAction: boolean;
  showEditAction: boolean;
  showActionsColumn: boolean;
  tableFields: FieldConfig[];
  totalRows: number;
}) {
  return (
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
                  {renderValue(row, field)}
                </td>
              ))}
              {showActionsColumn ? (
                <td className="rounded-r-2xl px-3 py-3">
                  <div className="flex justify-end gap-2">
                    {showEditAction ? (
                      <Button onClick={() => onEdit(row)} size="icon" variant="glass">
                        <Edit3 className="size-4" />
                      </Button>
                    ) : null}
                    {showDeleteAction ? (
                      <Button onClick={() => onDelete(row)} size="icon" variant="glass">
                        <Trash2 className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
      {!loading && rows.length === 0 ? (
        <div className="rounded-2xl border border-white/45 bg-white/38 px-4 py-6 text-center text-sm text-zinc-500">
          {totalRows === 0
            ? "No records yet."
            : searchTerm.trim()
              ? "No records match this search."
              : "No records match the current filters."}
        </div>
      ) : null}
    </div>
  );
});

export const ResourcePagination = memo(function ResourcePagination({
  onPageChange,
  page,
  pageSize,
  totalPages,
  totalRows,
}: {
  onPageChange: Dispatch<SetStateAction<number>>;
  page: number;
  pageSize: number;
  totalPages: number;
  totalRows: number;
}) {
  if (totalRows <= pageSize) return null;

  return (
    <div className="mt-3 flex flex-col gap-2 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
      <span>
        Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalRows)} of {totalRows}
      </span>
      <div className="flex gap-2">
        <Button
          disabled={page <= 1}
          onClick={() => onPageChange((current) => Math.max(1, current - 1))}
          size="sm"
          type="button"
          variant="glass"
        >
          Prev
        </Button>
        <Button
          disabled={page >= totalPages}
          onClick={() => onPageChange((current) => Math.min(totalPages, current + 1))}
          size="sm"
          type="button"
          variant="glass"
        >
          Next
        </Button>
      </div>
    </div>
  );
});
