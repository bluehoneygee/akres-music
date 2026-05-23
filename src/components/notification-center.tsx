"use client";

import { BellRing, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDisplayText } from "@/lib/utils";

type NotificationRow = {
  id: string;
  type?: string;
  targetRole?: string;
  studentId?: string;
  message?: string;
  sentAt?: string;
  createdAt?: string;
};

type StudentRow = {
  id: string;
  firstName?: string;
  lastName?: string;
};

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const [notificationRes, studentRes] = await Promise.all([
        fetch("/api/notifications", { cache: "no-store" }),
        fetch("/api/students", { cache: "no-store" }),
      ]);
      const notificationsJson = (await notificationRes.json()) as {
        data?: NotificationRow[];
        error?: string;
      };
      const studentsJson = (await studentRes.json()) as { data?: StudentRow[] };

      if (!notificationRes.ok) {
        throw new Error(notificationsJson.error ?? "Unable to load notifications");
      }

      setNotifications(Array.isArray(notificationsJson.data) ? notificationsJson.data : []);
      setStudents(Array.isArray(studentsJson.data) ? studentsJson.data : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load notifications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const studentNameById = useMemo(() => {
    return new Map(
      students.map((student) => [
        student.id,
        formatDisplayText(`${String(student.firstName ?? "")} ${String(student.lastName ?? "")}`),
      ]),
    );
  }, [students]);

  const orderedRows = useMemo(() => {
    return [...notifications].sort((a, b) =>
      String(b.sentAt || b.createdAt || "").localeCompare(String(a.sentAt || a.createdAt || "")),
    );
  }, [notifications]);

  return (
    <div className="space-y-4">
      <Card className="liquid-glass">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase text-zinc-500">Communication</p>
            <CardTitle className="mt-1 flex items-center gap-2 text-2xl">
              <BellRing className="size-6" />
              Notification Center
            </CardTitle>
            <p className="mt-2 text-sm text-zinc-500">
              Reminder jadwal kelas terbaru untuk akun Anda.
            </p>
          </div>
          <Button onClick={loadData} size="icon" variant="glass" aria-label="Refresh">
            <RefreshCw className="size-4" />
          </Button>
        </CardHeader>
      </Card>

      <Card className="liquid-glass">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-5 text-sm text-zinc-500">Loading notifications...</div>
          ) : null}

          {!loading && orderedRows.length === 0 ? (
            <div className="p-5 text-sm text-zinc-500">Belum ada notifikasi.</div>
          ) : null}

          {!loading && orderedRows.length > 0 ? (
            <div className="divide-y divide-white/35">
              {orderedRows.map((row) => (
                <div className="flex flex-col gap-2 px-5 py-4" key={row.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{formatDisplayText(row.type || "Notification")}</Badge>
                    <Badge variant="secondary">{formatDisplayText(row.targetRole || "-")}</Badge>
                    {row.studentId ? (
                      <Badge variant="outline">
                        {studentNameById.get(String(row.studentId)) || "Student"}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-zinc-800">{formatDisplayText(row.message || "-")}</p>
                  <p className="text-xs text-zinc-500">
                    {formatDateTime(String(row.sentAt || row.createdAt || ""))}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
