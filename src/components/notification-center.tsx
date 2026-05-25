"use client";

import { BellRing, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PushNotificationToggle } from "@/components/push-notification-toggle";
import { getClientSession } from "@/lib/client-session";
import { cn, formatDisplayText } from "@/lib/utils";

type NotificationRow = {
  id: string;
  type?: string;
  targetRole?: string;
  studentId?: string;
  message?: string;
  sentAt?: string;
  createdAt?: string;
  readByUserIds?: string[];
};

type StudentRow = {
  id: string;
  firstName?: string;
  lastName?: string;
};

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [session, notificationRes, studentRes] = await Promise.all([
        getClientSession(),
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
      setUserId(String(session.user?.id ?? ""));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load notifications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => setIsDarkMode(root.classList.contains("dark"));
    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  async function markAsRead(id: string) {
    if (!id || !userId) return;
    const row = notifications.find((item) => String(item.id) === id);
    const currentRead = new Set((row?.readByUserIds ?? []).map(String));
    if (currentRead.has(userId)) return;

    try {
      const response = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error("Failed to mark notification as read");

      setNotifications((current) =>
        current.map((item) =>
          String(item.id) === id
            ? {
                ...item,
                readByUserIds: [...new Set([...(item.readByUserIds ?? []), userId])],
              }
            : item,
        ),
      );
      window.dispatchEvent(new Event("notifications:seen-updated"));
    } catch {
      // no-op: keep UX quiet for read marker
    }
  }

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
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
          <div className="flex items-center justify-start gap-2 md:justify-end">
            <PushNotificationToggle />
            <Button onClick={loadData} size="icon" variant="glass" aria-label="Refresh">
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card className="liquid-glass">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-5">
              <div className="h-5 w-44 animate-pulse rounded-lg bg-white/45" />
              <div className="h-16 w-full animate-pulse rounded-2xl bg-white/40" />
              <div className="h-16 w-full animate-pulse rounded-2xl bg-white/40" />
            </div>
          ) : null}

          {!loading && orderedRows.length === 0 ? (
            <div className="p-5 text-sm text-zinc-500">Belum ada notifikasi.</div>
          ) : null}

          {!loading && orderedRows.length > 0 ? (
            <div className="divide-y divide-white/35">
              {orderedRows.map((row) => (
                <button
                  className="block w-full border-0 bg-transparent p-0 text-left"
                  key={row.id}
                  onClick={() => void markAsRead(String(row.id ?? ""))}
                  type="button"
                >
                {(() => {
                  const isRead = new Set((row.readByUserIds ?? []).map(String)).has(userId);
                  const itemClass = isRead
                    ? (isDarkMode
                      ? "flex flex-col gap-2 bg-zinc-900 px-5 py-4 text-zinc-100 transition-colors ring-1 ring-zinc-700"
                      : "flex flex-col gap-2 bg-white px-5 py-4 text-zinc-900 transition-colors ring-1 ring-zinc-200")
                    : (isDarkMode
                      ? "flex flex-col gap-2 bg-amber-500/18 px-5 py-4 transition-colors ring-1 ring-amber-300/65"
                      : "flex flex-col gap-2 bg-amber-50/95 px-5 py-4 transition-colors ring-1 ring-amber-300/80");

                  return (
                <div
                  className={itemClass}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{formatDisplayText(row.type || "Notification")}</Badge>
                    <Badge variant="secondary">{formatDisplayText(row.targetRole || "-")}</Badge>
                    {row.studentId ? (
                      <Badge variant="outline">
                        {studentNameById.get(String(row.studentId)) || "Student"}
                      </Badge>
                    ) : null}
                  </div>
                  <p
                    className={cn(
                      "text-sm",
                      isDarkMode ? "text-zinc-100" : "text-zinc-800",
                    )}
                  >
                    {formatDisplayText(row.message || "-")}
                  </p>
                  <p
                    className={cn(
                      "text-xs",
                      isDarkMode ? "text-zinc-400" : "text-zinc-500",
                    )}
                  >
                    {formatDateTime(String(row.sentAt || row.createdAt || ""))}
                  </p>
                </div>
                  );
                })()}
                </button>
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
