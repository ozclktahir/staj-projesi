"use client";

import type { ActivityLogItem } from "@/app/actions/activity-logs";
import type { AnalyticsData } from "@/app/actions/analytics";
import { AnalyticsStatCards } from "@/components/analytics/analytics-stat-cards";
import {
  PriorityBarCard,
  StatusDonutCard,
  WorkloadBarCard,
} from "@/components/analytics/chart-cards";
import { QuickActivityFeed } from "@/components/analytics/quick-activity-feed";
import { UpcomingDeadlines } from "@/components/analytics/upcoming-deadlines";

type AnalyticsDashboardProps = {
  data: AnalyticsData;
  recentLogs?: ActivityLogItem[];
  title?: string;
  description?: string;
};

export function AnalyticsDashboard({
  data,
  recentLogs = [],
  title = "Workspace Komuta Merkezi",
  description = "Tüm projelerin özet metrikleri, grafikler ve son hareketler.",
}: AnalyticsDashboardProps) {
  const deadlines = data.upcomingDeadlines.slice(0, 5);

  return (
    <div className="flex w-full flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <AnalyticsStatCards summary={data.summary} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <StatusDonutCard data={data.byStatus} />
        <PriorityBarCard data={data.byPriority} />
        <WorkloadBarCard workload={data.workload} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <UpcomingDeadlines items={deadlines} />
        <QuickActivityFeed logs={recentLogs} />
      </div>
    </div>
  );
}
