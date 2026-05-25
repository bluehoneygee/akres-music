"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";

type Item = {
  id: string;
  studentName: string;
  lessonDate: string;
  progressRating: string;
  progressVariant: "success" | "warning" | "danger" | "secondary";
  materialCovered: string;
  homework?: string;
};

type Props = {
  items: Item[];
  storageKey?: string;
};

export function LatestJournalList({
  items,
  storageKey = "overview-journal-read",
}: Props) {
  const [readIds, setReadIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed)) setReadIds(parsed);
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
    } catch {}
  }

  return (
    <>
      {items.map((item) => {
        const read = readIdSet.has(item.id);
        return (
          <button
            className={`w-full rounded-[20px] border p-3 text-left sm:p-4 ${
              read
                ? "border-white/45 bg-white/42"
                : "border-amber-200/70 bg-amber-50/85 shadow-[0_8px_20px_rgba(245,158,11,.14)] dark:border-amber-300/30 dark:bg-amber-500/10"
            }`}
            key={item.id}
            onClick={() => markAsRead(item.id)}
            type="button"
          >
            <div className="mb-3 flex items-start justify-between gap-3 sm:mb-4">
              <div className="min-w-0">
                <p className="font-medium">{item.studentName}</p>
                <p className="mt-1 text-xs text-zinc-500">{item.lessonDate}</p>
              </div>
              <div className="flex items-center gap-2">
                {!read ? <span className="size-2.5 rounded-full bg-amber-500" /> : null}
                <Badge className="shrink-0" variant={item.progressVariant}>
                  {item.progressRating}
                </Badge>
              </div>
            </div>
            <p className="text-sm text-zinc-600 sm:min-h-16">{item.materialCovered || "Materi belum diisi"}</p>
            {item.homework ? <p className="mt-3 text-xs text-zinc-500">Homework: {item.homework}</p> : null}
          </button>
        );
      })}
    </>
  );
}
