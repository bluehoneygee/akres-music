import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const db = await readDatabase();
  const student = db.students[0];
  const guardian = db.guardians.find((row) => student?.guardianIds.includes(row.id));
  const visibleJournals = db.journals.filter(
    (journal) => journal.studentId === student?.id && journal.parentVisible,
  );
  const invoices = db.invoices.filter((invoice) => invoice.studentId === student?.id);

  return (
    <AppShell>
      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="liquid-glass">
          <CardHeader>
            <CardTitle>Portal Access Preview</CardTitle>
            <p className="mt-1 text-sm text-zinc-500">
              Simulasi aturan visibility User - Guardian - Student dari specs.
            </p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-2xl border border-white/45 bg-white/42 p-4">
              <p className="text-zinc-500">Parent user</p>
              <p className="font-medium">{guardian?.user}</p>
            </div>
            <div className="rounded-2xl border border-white/45 bg-white/42 p-4">
              <p className="text-zinc-500">Linked student</p>
              <p className="font-medium">
                {student?.firstName} {student?.lastName}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="liquid-glass">
          <CardHeader>
            <CardTitle>Parent/Student Portal Data</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/45 bg-white/42 p-4">
              <Badge variant="outline">Schedule</Badge>
              <p className="mt-4 text-2xl font-semibold">
                {db.schedules.filter((row) => row.studentId === student?.id).length}
              </p>
              <p className="text-sm text-zinc-500">upcoming lessons</p>
            </div>
            <div className="rounded-2xl border border-white/45 bg-white/42 p-4">
              <Badge variant="outline">Journal</Badge>
              <p className="mt-4 text-2xl font-semibold">{visibleJournals.length}</p>
              <p className="text-sm text-zinc-500">parent visible</p>
            </div>
            <div className="rounded-2xl border border-white/45 bg-white/42 p-4">
              <Badge variant="outline">Invoice</Badge>
              <p className="mt-4 text-2xl font-semibold">{invoices.length}</p>
              <p className="text-sm text-zinc-500">billing records</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
