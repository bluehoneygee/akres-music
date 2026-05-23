"use client";

import { Banknote, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDisplayText } from "@/lib/utils";

type Row = Record<string, unknown> & { id: string };

type BillingLine = {
  invoice: Row;
  lessonPackage: Row | null;
  student: Row | null;
  course: Row | null;
  instrument: Row | null;
};

export function BillingBoard() {
  const [invoices, setInvoices] = useState<Row[]>([]);
  const [packages, setPackages] = useState<Row[]>([]);
  const [students, setStudents] = useState<Row[]>([]);
  const [courses, setCourses] = useState<Row[]>([]);
  const [instruments, setInstruments] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [sessionRole, setSessionRole] = useState<string>("");
  const isPortalReadOnly =
    sessionRole === "Parent Portal User" || sessionRole === "Student Portal User";

  async function loadData() {
    setLoading(true);

    try {
      const [invoiceRows, packageRows, studentRows, courseRows, instrumentRows] =
        await Promise.all([
          fetchRows("invoices"),
          fetchRows("lesson-packages"),
          fetchRows("students"),
          fetchRows("courses"),
          fetchRows("instruments"),
        ]);

      setInvoices(invoiceRows);
      setPackages(packageRows);
      setStudents(studentRows);
      setCourses(courseRows);
      setInstruments(instrumentRows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load billing");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadSessionRole() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const session = (await response.json()) as { user?: { role?: string } };
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

  const lines = useMemo(() => {
    const packagesById = mapById(packages);
    const studentsById = mapById(students);
    const coursesById = mapById(courses);
    const instrumentsById = mapById(instruments);

    return invoices
      .map((invoice) => {
        const lessonPackage = packagesById.get(String(invoice.lessonPackageId ?? "")) ?? null;
        const courseId = String(invoice.courseId ?? lessonPackage?.courseId ?? "");
        const instrumentId = String(invoice.instrumentId ?? lessonPackage?.instrumentId ?? "");

        return {
          invoice,
          lessonPackage,
          student: studentsById.get(String(invoice.studentId ?? lessonPackage?.studentId ?? "")) ?? null,
          course: coursesById.get(courseId) ?? null,
          instrument: instrumentsById.get(instrumentId) ?? null,
        };
      })
      .sort((left, right) =>
        String(right.invoice.billingPeriod ?? "").localeCompare(String(left.invoice.billingPeriod ?? "")),
      );
  }, [courses, instruments, invoices, packages, students]);

  async function updateInvoice(invoice: Row, patch: Record<string, unknown>) {
    setSavingId(invoice.id);

    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...invoice, ...patch }),
      });
      const json = (await response.json()) as { data?: Row; error?: string };

      if (!response.ok || !json.data) {
        throw new Error(json.error ?? "Unable to update invoice");
      }

      setInvoices((current) => current.map((row) => (row.id === invoice.id ? json.data! : row)));
      toast.success("Billing updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update invoice");
    } finally {
      setSavingId("");
    }
  }

  return (
    <div className="space-y-4">
      <Card className="liquid-glass">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-zinc-500">Finance workflow</p>
            <CardTitle className="mt-1 flex items-center gap-2 text-2xl">
              <Banknote className="size-6" />
              Billing
            </CardTitle>
          </div>
          <Button onClick={loadData} size="icon" variant="glass" aria-label="Refresh">
            <RefreshCw className="size-4" />
          </Button>
        </CardHeader>
      </Card>

      <Card className="liquid-glass">
        <CardContent className="p-0">
          {isPortalReadOnly ? (
            <div className="border-b border-white/40 px-5 py-3 text-sm text-zinc-600">
              Billing mode read-only untuk akun portal.
            </div>
          ) : null}
          {loading ? <div className="p-5 text-sm text-zinc-500">Loading billing...</div> : null}

          {!loading && lines.length === 0 ? (
            <div className="p-5 text-sm text-zinc-500">
              Belum ada invoice. Buat Lesson Package dulu supaya invoice otomatis muncul.
            </div>
          ) : null}

          {!loading && lines.length > 0 ? (
            <div className="overflow-x-auto no-scrollbar">
              <table className={`${isPortalReadOnly ? "min-w-[920px]" : "min-w-[1080px]"} text-left text-sm`}>
                <thead className="border-b border-white/40 bg-white/35 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Package</th>
                    <th className="px-4 py-3 font-medium">Period</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    {!isPortalReadOnly ? <th className="px-4 py-3 font-medium">Confirmation</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr className="border-b border-white/30" key={line.invoice.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-zinc-950">{studentName(line.student)}</p>
                        <p className="text-xs text-zinc-500">
                          {formatDisplayText(line.instrument?.instrumentName)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-zinc-950">
                          {formatDisplayText(line.course?.courseName ?? line.invoice.lessonPackage)}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {formatPackageName(line.lessonPackage?.lessonCount)}
                        </p>
                      </td>
                      <td className="px-4 py-3">{formatDisplayText(line.invoice.billingPeriod)}</td>
                      <td className="px-4 py-3 font-medium">
                        {formatCurrency(Number(line.invoice.amount ?? 0))}
                      </td>
                      <td className="px-4 py-3">
                        {isPortalReadOnly ? (
                          <p className="font-medium text-zinc-900">
                            {formatDisplayText(line.invoice.status || "Unpaid")}
                          </p>
                        ) : (
                          <select
                            className="h-10 rounded-2xl border border-white/50 bg-white/58 px-3 text-sm text-zinc-900 outline-none backdrop-blur-xl"
                            disabled={savingId === line.invoice.id || Boolean(line.invoice.confirmed)}
                            onChange={(event) =>
                              void updateInvoice(line.invoice, {
                                status: event.target.value,
                                paidAt: event.target.value === "Paid" ? new Date().toISOString() : "",
                              })
                            }
                            value={String(line.invoice.status ?? "Unpaid")}
                          >
                            {["Unpaid", "Paid"].map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        )}
                        {line.invoice.paidAt ? (
                          <p className="mt-1 text-xs italic text-zinc-500">
                            Paid at {formatDateTime(line.invoice.paidAt)}
                          </p>
                        ) : null}
                      </td>
                      {!isPortalReadOnly ? (
                        <td className="px-4 py-3">
                          {line.invoice.confirmed ? (
                            <p className="text-xs italic text-zinc-500">
                              Confirmed by {formatDisplayText(line.invoice.confirmedByName) || "Unknown User"}
                              {formatDateTime(line.invoice.confirmedAt)
                                ? ` at ${formatDateTime(line.invoice.confirmedAt)}`
                                : ""}
                            </p>
                          ) : line.invoice.status === "Paid" ? (
                            <Button
                              disabled={savingId === line.invoice.id}
                              onClick={() =>
                                void updateInvoice(line.invoice, {
                                  confirmed: true,
                                  paidAt: line.invoice.paidAt || new Date().toISOString(),
                                  status: "Paid",
                                })
                              }
                              size="sm"
                              type="button"
                            >
                              Confirm Payment
                            </Button>
                          ) : (
                            <p className="text-xs italic text-zinc-500">Set status to Paid to confirm.</p>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

async function fetchRows(resource: string) {
  const response = await fetch(`/api/${resource}`, { cache: "no-store" });
  const json = (await response.json()) as { data?: Row[]; error?: string };

  if (!response.ok) {
    throw new Error(json.error ?? `Unable to load ${resource}`);
  }

  return Array.isArray(json.data) ? json.data : [];
}

function mapById(rows: Row[]) {
  return new Map(rows.map((row) => [row.id, row]));
}

function studentName(student: Row | null) {
  if (!student) return "Unknown student";
  return formatDisplayText(`${String(student.firstName ?? "")} ${String(student.lastName ?? "")}`);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatPackageName(value: unknown) {
  return Number(value) === 8 ? "Paket B - 8 sessions" : "Paket A - 4 sessions";
}

function formatDateTime(value: unknown) {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
