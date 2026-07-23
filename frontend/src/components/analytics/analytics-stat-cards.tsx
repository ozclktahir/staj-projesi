"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ListTodo,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { AnalyticsSummary } from "@/app/actions/analytics";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCard = {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  accent: string;
  iconWrap: string;
};

export function AnalyticsStatCards({ summary }: { summary: AnalyticsSummary }) {
  const cards: StatCard[] = [
    {
      label: "Toplam Görev",
      value: String(summary.totalTasks),
      hint: "Workspace / proje kapsamı",
      icon: ListTodo,
      accent: "border-indigo-300/80 dark:border-indigo-500/30",
      iconWrap:
        "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400",
    },
    {
      label: "Tamamlanma Oranı",
      value: `%${summary.completionRate}`,
      hint: `${summary.completedTasks} tamamlandı`,
      icon: CheckCircle2,
      accent: "border-emerald-300/80 dark:border-emerald-500/30",
      iconWrap:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    },
    {
      label: "Geciken Görevler",
      value: String(summary.overdueTasks),
      hint: "Teslim tarihi geçmiş",
      icon: AlertTriangle,
      accent: "border-rose-300/80 dark:border-rose-500/30",
      iconWrap: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
    },
    {
      label: "Aktif Üyeler",
      value: String(summary.activeMembers),
      hint: "Çalışma alanındaki kişiler",
      icon: Users,
      accent: "border-amber-300/80 dark:border-amber-500/30",
      iconWrap:
        "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card
          key={card.label}
          className={cn(
            "rounded-lg border-2 py-4 shadow-sm dark:border",
            card.accent,
          )}
        >
          <CardContent className="flex items-start gap-3 px-4">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg",
                card.iconWrap,
              )}
            >
              <card.icon className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                {card.label}
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                {card.value}
              </p>
              {card.hint ? (
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {card.hint}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
