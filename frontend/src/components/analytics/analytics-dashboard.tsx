"use client";

import type { ActivityLogItem } from "@/app/actions/activity-logs";
import type { AnalyticsData } from "@/app/actions/analytics";
import { AnalyticsStatCards } from "@/components/analytics/analytics-stat-cards";
import { QuickActivityFeed } from "@/components/analytics/quick-activity-feed";
import { StatusPriorityCharts } from "@/components/analytics/status-priority-charts";
import { UpcomingDeadlines } from "@/components/analytics/upcoming-deadlines";
import { WorkloadChart } from "@/components/analytics/workload-chart";

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
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <AnalyticsStatCards summary={data.summary} />

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="space-y-4 xl:col-span-3">
          <StatusPriorityCharts
            byStatus={data.byStatus}
            byPriority={data.byPriority}
            stacked
          />
        </div>
        <div className="xl:col-span-2">
          <WorkloadChart workload={data.workload} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <UpcomingDeadlines items={deadlines} />
        <QuickActivityFeed logs={recentLogs} />
      </div>
    </div>
  );
}
