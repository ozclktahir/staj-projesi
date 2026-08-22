"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ActivityLogItem } from "@/app/actions/activity-logs";
import type { AnalyticsData } from "@/app/actions/analytics";
import type { UpcomingDeadlineItem } from "@/types/personal-workspace";
import { AnalyticsLiveRefresh } from "@/components/analytics/analytics-live-refresh";
import { AnalyticsStatCards } from "@/components/analytics/analytics-stat-cards";
import { QuickActivityFeed } from "@/components/analytics/quick-activity-feed";
import { UpcomingDeadlines } from "@/components/analytics/upcoming-deadlines";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/use-translation";
import { useWorkspacePresence } from "@/hooks/use-workspace-presence";
import { cn } from "@/lib/utils";

const StatusDonutCard = dynamic(
  () =>
    import("@/components/analytics/chart-cards").then((m) => m.StatusDonutCard),
  {
    ssr: false,
    loading: () => (
      <div className="h-[280px] animate-pulse rounded-lg border border-border bg-muted/40" />
    ),
  },
);

const PriorityBarCard = dynamic(
  () =>
    import("@/components/analytics/chart-cards").then((m) => m.PriorityBarCard),
  {
    ssr: false,
    loading: () => (
      <div className="h-[280px] animate-pulse rounded-lg border border-border bg-muted/40" />
    ),
  },
);

const WorkloadBarCard = dynamic(
  () =>
    import("@/components/analytics/chart-cards").then((m) => m.WorkloadBarCard),
  {
    ssr: false,
    loading: () => (
      <div className="h-[280px] animate-pulse rounded-lg border border-border bg-muted/40" />
    ),
  },
);

type AnalyticsDashboardProps = {
  data: AnalyticsData;
  upcomingItems?: UpcomingDeadlineItem[];
  recentLogs?: ActivityLogItem[];
  title?: string;
  description?: string;
  workspaceId?: string | null;
};

export function AnalyticsDashboard({
  data,
  upcomingItems,
  recentLogs = [],
  title,
  description,
  workspaceId = null,
}: AnalyticsDashboardProps) {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t("dashboardPage.commandCenter");
  const resolvedDescription =
    description ?? t("dashboardPage.commandCenterDesc");
  const presence = useWorkspacePresence(workspaceId);
  // Presence kanalı henüz senkronlaşmadıysa sunucudan gelen statik üye
  // sayısına geri düş; hazır olunca gerçek zamanlı çevrimiçi sayısı gösterilir.
  const summary = presence.ready
    ? { ...data.summary, activeMembers: presence.onlineCount }
    : data.summary;
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "start",
    dragFree: false,
    watchDrag: false,
  });
  const [page, setPage] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setPage(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  const deadlines =
    upcomingItems && upcomingItems.length > 0
      ? upcomingItems
      : data.upcomingDeadlines.map((item) => ({
          id: item.id,
          kind: "task" as const,
          title: item.title,
          dueDate: item.dueDate,
          status: item.status,
          priority: null,
          projectId: item.projectId,
          projectName: item.projectName,
          parentTaskId: null,
          parentTaskTitle: null,
          completed: item.status === "DONE",
          subtasks: [],
        }));

  return (
    <div className="flex w-full flex-col gap-4">
      <AnalyticsLiveRefresh workspaceId={workspaceId} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {resolvedTitle}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {resolvedDescription}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={page === 0}
            onClick={() => emblaApi?.scrollPrev()}
            aria-label={t("dashboard.prevPage")}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-1.5">
            {[0, 1].map((i) => (
              <button
                key={i}
                type="button"
                aria-label={`${t("dashboard.page")} ${i + 1}`}
                className={cn(
                  "size-2.5 rounded-full transition-colors",
                  page === i ? "bg-primary" : "bg-muted-foreground/30",
                )}
                onClick={() => emblaApi?.scrollTo(i)}
              />
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={page === 1}
            onClick={() => emblaApi?.scrollNext()}
            aria-label={t("dashboard.nextPage")}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex touch-pan-y">
          <div className="min-w-0 shrink-0 grow-0 basis-full pr-1">
            <AnalyticsStatCards
              summary={summary}
              isMembersLive={presence.ready}
              workspaceId={workspaceId}
            />
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <StatusDonutCard data={data.byStatus} />
              <PriorityBarCard data={data.byPriority} />
              <WorkloadBarCard workload={data.workload} />
            </div>
          </div>

          <div className="min-w-0 shrink-0 grow-0 basis-full pl-1">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("dashboard.pageDetails")}
            </p>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <UpcomingDeadlines items={deadlines} />
              <QuickActivityFeed logs={recentLogs} />
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {t("dashboard.swipeHint")}
      </p>
    </div>
  );
}
