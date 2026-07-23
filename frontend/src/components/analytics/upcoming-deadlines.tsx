"use client";

import { CalendarClock } from "lucide-react";
import type { DeadlineItem } from "@/app/actions/analytics";
import { TASK_STATUS_LABELS } from "@/lib/supabase/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function formatDue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysUntil(iso: string): string {
  const due = new Date(iso).getTime();
  if (Number.isNaN(due)) return "";
  const diff = Math.ceil((due - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Bugün";
  if (diff === 1) return "Yarın";
  if (diff < 0) return `${Math.abs(diff)} gün gecikmiş`;
  return `${diff} gün kaldı`;
}

export function UpcomingDeadlines({ items }: { items: DeadlineItem[] }) {
  return (
    <Card className="rounded-lg border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="size-4 text-primary" />
          Yaklaşan Teslim Tarihleri
        </CardTitle>
        <CardDescription>
          Tamamlanmamış görevler, en yakın teslim tarihine göre
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Yaklaşan teslim tarihi olan görev yok.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.projectName ? `${item.projectName} · ` : ""}
                    {TASK_STATUS_LABELS[item.status]}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    {formatDue(item.dueDate)}
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    {daysUntil(item.dueDate)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
