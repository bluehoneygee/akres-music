import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const db = await readDatabase();
  const absentCount = db["student-attendance"].filter((row) =>
    ["Absent", "Sick", "Permission"].includes(row.status),
  ).length;
  const outstanding = db.invoices
    .filter((invoice) => invoice.status !== "Paid")
    .reduce((sum, invoice) => sum + invoice.amount, 0);

  const reports = [
    ["Student attendance summary", `${db["student-attendance"].length} records`],
    ["Repeated absence watch", `${absentCount} absence records`],
    ["Student progress summary", `${db.journals.length} journals`],
    ["Room utilization", `${db.rooms.length} active rooms`],
    ["Outstanding invoice", `Rp${outstanding.toLocaleString("id-ID")}`],
  ];

  return (
    <AppShell>
      <Card className="liquid-glass">
        <CardHeader>
          <CardTitle>Reports</CardTitle>
          <p className="mt-1 text-sm text-zinc-500">
            Ringkasan laporan akademik, operasional, dan billing sekolah musik.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {reports.map(([title, value]) => (
            <div className="rounded-[20px] border border-white/45 bg-white/42 p-4" key={title}>
              <Badge variant="outline">Report</Badge>
              <p className="mt-4 font-medium">{title}</p>
              <p className="mt-1 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}
