"use client";

import type { AnalyticsData } from "@/app/actions/analytics";
import { AnalyticsStatCards } from "@/components/analytics/analytics-stat-cards";
import { StatusPriorityCharts } from "@/components/analytics/status-priority-charts";
import { UpcomingDeadlines } from "@/components/analytics/upcoming-deadlines";
import { WorkloadChart } from "@/components/analytics/workload-chart";

type AnalyticsDashboardProps = {
  data: AnalyticsData;
  title?: string;
  description?: string;
};

export function AnalyticsDashboard({
  data,
  title = "Analitik Dashboard",
  description = "Görev metrikleri, durum/öncelik dağılımı ve ekip iş yükü.",
}: AnalyticsDashboardProps) {
  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
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

      <UpcomingDeadlines items={data.upcomingDeadlines} />
    </div>
  );
}
