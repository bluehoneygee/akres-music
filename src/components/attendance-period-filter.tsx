"use client";

import { ChevronDown, Filter } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  period: string;
  from: string;
  to: string;
  scope: "all" | "student" | "instructor";
  targetId: string;
  students: Array<{ id: string; label: string }>;
  instructors: Array<{ id: string; label: string }>;
  allowAllScope?: boolean;
  allowStudentScope?: boolean;
  allowInstructorScope?: boolean;
  showScopeSelect?: boolean;
};

export function AttendancePeriodFilter({
  period,
  from,
  to,
  scope,
  targetId,
  students,
  instructors,
  allowAllScope = true,
  allowStudentScope = true,
  allowInstructorScope = true,
  showScopeSelect = true,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  function updateQuery(next: {
    period?: string;
    from?: string;
    to?: string;
    scope?: string;
    targetId?: string;
  }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.period !== undefined) params.set("period", next.period);
    if (next.from !== undefined) params.set("from", next.from);
    if (next.to !== undefined) params.set("to", next.to);
    if (next.scope !== undefined) params.set("scope", next.scope);
    if (next.targetId !== undefined) params.set("targetId", next.targetId);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <>
      {/* Desktop filters */}
      <div className="mt-2 hidden flex-wrap items-end gap-2 md:flex">
        <label className="text-xs text-zinc-500">
          Periode
          <select
            className="mt-1 block h-9 rounded-xl border border-white/45 bg-white/65 px-2 text-sm"
            value={period}
            name="period"
            onChange={(event) => updateQuery({ period: event.target.value })}
          >
            <option value="this_month">Bulan ini</option>
            <option value="last_30_days">30 hari terakhir</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        {showScopeSelect ? (
          <label className="text-xs text-zinc-500">
            Lihat
            <select
              className="mt-1 block h-9 rounded-xl border border-white/45 bg-white/65 px-2 text-sm"
              value={scope}
              name="scope"
              onChange={(event) => {
                const nextScope = event.target.value as "all" | "student" | "instructor";
                updateQuery({ scope: nextScope, targetId: "" });
              }}
            >
              {allowAllScope ? <option value="all">Semua</option> : null}
              {allowStudentScope ? <option value="student">Per Student</option> : null}
              {allowInstructorScope ? <option value="instructor">Per Instructor</option> : null}
            </select>
          </label>
        ) : null}
        {scope === "student" ? (
          <label className="text-xs text-zinc-500">
            Student
            <select
              className="mt-1 block h-9 rounded-xl border border-white/45 bg-white/65 px-2 text-sm"
              value={targetId}
              name="targetId"
              onChange={(event) => updateQuery({ targetId: event.target.value })}
            >
              <option value="">Pilih student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {scope === "instructor" ? (
          <label className="text-xs text-zinc-500">
            Instructor
            <select
              className="mt-1 block h-9 rounded-xl border border-white/45 bg-white/65 px-2 text-sm"
              value={targetId}
              name="targetId"
              onChange={(event) => updateQuery({ targetId: event.target.value })}
            >
              <option value="">Pilih instructor</option>
              {instructors.map((instructor) => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {period === "custom" ? (
          <>
            <label className="text-xs text-zinc-500">
              Dari
              <input
                className="mt-1 block h-9 rounded-xl border border-white/45 bg-white/65 px-2 text-sm"
                value={from}
                name="from"
                onChange={(event) => updateQuery({ from: event.target.value })}
                type="date"
              />
            </label>
            <label className="text-xs text-zinc-500">
              Sampai
              <input
                className="mt-1 block h-9 rounded-xl border border-white/45 bg-white/65 px-2 text-sm"
                value={to}
                name="to"
                onChange={(event) => updateQuery({ to: event.target.value })}
                type="date"
              />
            </label>
          </>
        ) : null}
      </div>

      {/* Mobile filters */}
      <div className="mt-2 md:hidden">
        <button
          className="flex h-10 w-full items-center justify-between rounded-full border border-emerald-800/55 bg-white/70 px-4 text-sm font-medium text-slate-800 shadow-[0_2px_0_rgba(21,128,61,0.25)] backdrop-blur-xl"
          onClick={() => setMobileFilterOpen((prev) => !prev)}
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
            <div className="space-y-1">
              <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">
                Periode
              </span>
              <Select value={period} onValueChange={(value) => updateQuery({ period: value })}>
                <SelectTrigger className="h-10 w-full rounded-xl border-white/80 bg-white/82 text-sm text-slate-800 focus:border-emerald-700/50 focus:ring-emerald-700/15">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_month" className="py-1.5">
                    Bulan ini
                  </SelectItem>
                  <SelectItem value="last_30_days" className="py-1.5">
                    30 hari terakhir
                  </SelectItem>
                  <SelectItem value="custom" className="py-1.5">
                    Custom
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showScopeSelect ? (
              <div className="space-y-1">
                <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">
                  Lihat
                </span>
                <Select
                  value={scope}
                  onValueChange={(value) => {
                    const nextScope = value as "all" | "student" | "instructor";
                    updateQuery({ scope: nextScope, targetId: "" });
                  }}
                >
                  <SelectTrigger className="h-10 w-full rounded-xl border-white/80 bg-white/82 text-sm text-slate-800 focus:border-emerald-700/50 focus:ring-emerald-700/15">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allowAllScope ? (
                      <SelectItem value="all" className="py-1.5">
                        Semua
                      </SelectItem>
                    ) : null}
                    {allowStudentScope ? (
                      <SelectItem value="student" className="py-1.5">
                        Per Student
                      </SelectItem>
                    ) : null}
                    {allowInstructorScope ? (
                      <SelectItem value="instructor" className="py-1.5">
                        Per Instructor
                      </SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {scope === "student" ? (
              <div className="space-y-1">
                <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">
                  Student
                </span>
                <Select
                  value={targetId || undefined}
                  onValueChange={(value) => updateQuery({ targetId: value })}
                >
                  <SelectTrigger className="h-10 w-full rounded-xl border-white/80 bg-white/82 text-sm text-slate-800 focus:border-emerald-700/50 focus:ring-emerald-700/15">
                    <SelectValue placeholder="Pilih student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id} className="py-1.5">
                        {student.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {scope === "instructor" ? (
              <div className="space-y-1">
                <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">
                  Instructor
                </span>
                <Select
                  value={targetId || undefined}
                  onValueChange={(value) => updateQuery({ targetId: value })}
                >
                  <SelectTrigger className="h-10 w-full rounded-xl border-white/80 bg-white/82 text-sm text-slate-800 focus:border-emerald-700/50 focus:ring-emerald-700/15">
                    <SelectValue placeholder="Pilih instructor" />
                  </SelectTrigger>
                  <SelectContent>
                    {instructors.map((instructor) => (
                      <SelectItem key={instructor.id} value={instructor.id} className="py-1.5">
                        {instructor.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {period === "custom" ? (
              <>
                <label className="block space-y-1">
                  <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">
                    Dari
                  </span>
                  <input
                    className="h-10 w-full rounded-xl border border-white/80 bg-white/82 px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-700/50 focus:ring-2 focus:ring-emerald-700/15"
                    value={from}
                    onChange={(event) => updateQuery({ from: event.target.value })}
                    type="date"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">
                    Sampai
                  </span>
                  <input
                    className="h-10 w-full rounded-xl border border-white/80 bg-white/82 px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-700/50 focus:ring-2 focus:ring-emerald-700/15"
                    value={to}
                    onChange={(event) => updateQuery({ to: event.target.value })}
                    type="date"
                  />
                </label>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}
