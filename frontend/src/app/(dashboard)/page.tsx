import { Suspense } from "react";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { getWorkspaceAnalytics } from "@/app/actions/analytics";
import { getWorkspaceActivityLogs } from "@/app/actions/activity-logs";
import { getUpcomingDeadlinesItems } from "@/app/actions/upcoming-deadlines";
import { DashboardSkeleton } from "@/components/loading/page-skeletons";
import { resolveActiveWorkspaceId } from "@/lib/active-workspace-server";

type DashboardPageProps = {
  searchParams: Promise<{ workspaceId?: string }>;
};

async function DashboardContent({
  searchParams,
}: {
  searchParams: Promise<{ workspaceId?: string }>;
}) {
  const params = await searchParams;
  const workspaceId = await resolveActiveWorkspaceId(
    params.workspaceId ?? null,
  );

  if (!workspaceId) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="rounded-lg border border-dashed border-border bg-card/60 px-4 py-10 text-center text-sm text-muted-foreground">
          Dashboard’u görmek için bir workspace seçin.
        </div>
      </div>
    );
  }

  const [analyticsResult, activityResult, deadlinesResult] = await Promise.all([
    getWorkspaceAnalytics(workspaceId),
    getWorkspaceActivityLogs(workspaceId, 8),
    getUpcomingDeadlinesItems(),
  ]);

  if (!analyticsResult.success) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="rounded-lg border border-rose-300/50 bg-rose-50 px-4 py-6 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {analyticsResult.error ?? "Dashboard verileri yüklenemedi."}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <AnalyticsDashboard
        data={analyticsResult.data}
        upcomingItems={deadlinesResult.success ? deadlinesResult.items : []}
        recentLogs={activityResult.success ? activityResult.logs : []}
        title="Dashboard"
        description="Workspace genel bakış: KPI’lar, görev grafikleri, iş yükü ve son aktiviteler."
      />
    </div>
  );
}

export default function DashboardPage({ searchParams }: DashboardPageProps) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent searchParams={searchParams} />
    </Suspense>
  );
}
