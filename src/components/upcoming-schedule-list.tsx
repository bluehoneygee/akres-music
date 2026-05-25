"use client";

import { Home, MapPin, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";

type ScheduleItem = {
  id: string;
  fromTime: string;
  scheduleDate: string;
  studentName: string;
  courseName: string;
  instructorName: string;
  lessonMode: "Studio" | "Home Visit";
  locationLabel: string;
  statusLabel: string;
  statusVariant: "success" | "warning" | "danger" | "secondary";
};

type Props = {
  items: ScheduleItem[];
  storageKey?: string;
};

export function UpcomingScheduleList({
  items,
  storageKey = "overview-schedule-read",
}: Props) {
  const router = useRouter();
  const [readIds, setReadIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed)) {
        setReadIds(parsed);
      }
    } catch {
      setReadIds([]);
    }
  }, [storageKey]);

  const readIdSet = useMemo(() => new Set(readIds), [readIds]);

  function markAsRead(id: string) {
    if (readIdSet.has(id)) return;
    const next = [...readIds, id];
    setReadIds(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  }

  function onScheduleClick(id: string) {
    markAsRead(id);
    router.push("/attendance");
  }

  return (
    <>
      {items.map((item) => {
        const read = readIdSet.has(item.id);

        return (
          <button
            className={`grid w-full gap-2 rounded-[20px] border p-3 text-left transition sm:grid-cols-[92px_minmax(0,1fr)_auto] sm:gap-3 ${
              read
                ? "border-white/45 bg-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,.6)]"
                : "border-amber-200/70 bg-amber-50/85 shadow-[0_8px_20px_rgba(245,158,11,.14),inset_0_1px_0_rgba(255,255,255,.72)] dark:border-amber-300/30 dark:bg-amber-500/10"
            }`}
            key={item.id}
            onClick={() => onScheduleClick(item.id)}
            type="button"
          >
            <div className="flex items-start justify-between gap-3 sm:block">
              <div>
                <p className="font-semibold">{item.fromTime}</p>
                <p className="text-xs text-zinc-500">{item.scheduleDate}</p>
              </div>
              <div className="flex items-center gap-2 sm:hidden">
                {!read ? <span className="size-2.5 rounded-full bg-amber-500" /> : null}
                <Badge className="px-2.5 py-0.5" variant={item.statusVariant}>
                  {item.statusLabel}
                </Badge>
              </div>
            </div>
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(112px,.72fr)] gap-3 sm:block">
              <div className="min-w-0">
                <p className="truncate font-medium">{item.studentName}</p>
                <p className="truncate text-sm text-zinc-500">{item.courseName}</p>
              </div>
              <div className="min-w-0 space-y-1 text-xs text-zinc-600 sm:mt-2 sm:flex sm:flex-wrap sm:gap-2 sm:space-y-0">
                <span className="flex max-w-full items-center gap-1">
                  <Users className="size-3.5 shrink-0" />
                  <span className="truncate">{item.instructorName}</span>
                </span>
                <span className="flex max-w-full min-w-0 items-center gap-1">
                  {item.lessonMode === "Studio" ? (
                    <MapPin className="size-3.5 shrink-0" />
                  ) : (
                    <Home className="size-3.5 shrink-0" />
                  )}
                  <span className="truncate">{item.locationLabel}</span>
                </span>
              </div>
            </div>
            <div className="hidden items-center gap-2 sm:flex sm:self-center sm:justify-self-end">
              {!read ? <span className="size-2.5 rounded-full bg-amber-500" /> : null}
              <Badge className="px-3 py-1" variant={item.statusVariant}>
                {item.statusLabel}
              </Badge>
            </div>
          </button>
        );
      })}
    </>
  );
}
