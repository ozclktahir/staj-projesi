"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ListTodo,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { AnalyticsSummary } from "@/app/actions/analytics";
import { OnlineMembersPopover } from "@/components/analytics/online-members-popover";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/i18n/use-translation";
import { cn } from "@/lib/utils";

type StatCard = {
  id: "totalTasks" | "completionRate" | "overdueTasks" | "activeMembers";
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  accent: string;
  iconWrap: string;
};

export function AnalyticsStatCards({
  summary,
  isMembersLive = false,
  workspaceId = null,
}: {
  summary: AnalyticsSummary;
  isMembersLive?: boolean;
  /** "Aktif Üyeler" kartındaki çevrimiçi listesi açılır menüsü için gerekir. */
  workspaceId?: string | null;
}) {
  const { t } = useTranslation();

  const cards: StatCard[] = [
    {
      id: "totalTasks",
      label: t("analytics.totalTasks"),
      value: String(summary.totalTasks),
      hint: t("analytics.totalTasksHint"),
      icon: ListTodo,
      accent: "border-indigo-300/80 dark:border-indigo-500/30",
      iconWrap:
        "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400",
    },
    {
      id: "completionRate",
      label: t("analytics.completionRate"),
      value: `%${summary.completionRate}`,
      hint: t("analytics.completedHint", { n: summary.completedTasks }),
      icon: CheckCircle2,
      accent: "border-emerald-300/80 dark:border-emerald-500/30",
      iconWrap:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    },
    {
      id: "overdueTasks",
      label: t("analytics.overdueTasks"),
      value: String(summary.overdueTasks),
      hint: t("analytics.overdueHint"),
      icon: AlertTriangle,
      accent: "border-rose-300/80 dark:border-rose-500/30",
      iconWrap: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
    },
    {
      id: "activeMembers",
      label: t("analytics.activeMembers"),
      value: String(summary.activeMembers),
      hint: isMembersLive
        ? t("analytics.activeMembersLiveHint")
        : t("analytics.activeMembersHint"),
      icon: Users,
      accent: "border-amber-300/80 dark:border-amber-500/30",
      iconWrap:
        "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => {
        const cardInner = (
          <>
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg",
                card.iconWrap,
              )}
            >
              <card.icon className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">
                {card.label}
              </p>
              <p className="text-lg font-semibold tracking-tight text-foreground">
                {card.value}
              </p>
              {card.hint ? (
                <p className="truncate text-[11px] text-muted-foreground">
                  {card.hint}
                </p>
              ) : null}
            </div>
          </>
        );

        if (card.id === "activeMembers") {
          return (
            <OnlineMembersPopover key={card.id} workspaceId={workspaceId}>
              <button
                type="button"
                aria-label={t("analytics.onlineMembersAriaLabel")}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg border-2 border-border bg-card px-3 py-3 text-left shadow-sm outline-none transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring dark:border",
                  card.accent,
                )}
              >
                {cardInner}
              </button>
            </OnlineMembersPopover>
          );
        }

        return (
          <Card
            key={card.id}
            className={cn(
              "rounded-lg border-2 py-3 shadow-sm dark:border",
              card.accent,
            )}
          >
            <CardContent className="flex items-center gap-2.5 px-3">
              {cardInner}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
