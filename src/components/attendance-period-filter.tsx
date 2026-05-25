"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
    <div className="mt-2 flex flex-wrap items-end gap-2">
      <label className="text-xs text-zinc-500">
        Periode
        <select
          className="mt-1 block h-9 rounded-xl border border-white/45 bg-white/65 px-2 text-sm"
          defaultValue={period}
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
            defaultValue={scope}
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
            defaultValue={targetId}
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
            defaultValue={targetId}
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
              defaultValue={from}
              name="from"
              onChange={(event) => updateQuery({ from: event.target.value })}
              type="date"
            />
          </label>
          <label className="text-xs text-zinc-500">
            Sampai
            <input
              className="mt-1 block h-9 rounded-xl border border-white/45 bg-white/65 px-2 text-sm"
              defaultValue={to}
              name="to"
              onChange={(event) => updateQuery({ to: event.target.value })}
              type="date"
            />
          </label>
        </>
      ) : null}
    </div>
  );
}
