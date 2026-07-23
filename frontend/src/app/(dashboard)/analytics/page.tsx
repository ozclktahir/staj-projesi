import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { getWorkspaceAnalytics } from "@/app/actions/analytics";
import { resolveActiveWorkspaceId } from "@/lib/active-workspace-server";

type AnalyticsPageProps = {
  searchParams: Promise<{ workspaceId?: string }>;
};

export default async function AnalyticsPage({
  searchParams,
}: AnalyticsPageProps) {
  const params = await searchParams;
  const workspaceId = await resolveActiveWorkspaceId(
    params.workspaceId ?? null,
  );

  const result = await getWorkspaceAnalytics(workspaceId);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {!workspaceId ? (
        <div className="rounded-lg border border-dashed border-border bg-card/60 px-4 py-10 text-center text-sm text-muted-foreground">
          Analitikleri görmek için bir workspace seçin.
        </div>
      ) : !result.success ? (
        <div className="rounded-lg border border-rose-300/50 bg-rose-50 px-4 py-6 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {result.error ?? "Analitik verileri yüklenemedi."}
        </div>
      ) : (
        <AnalyticsDashboard
          data={result.data}
          title="Workspace Analitik Dashboard"
          description="Aktif çalışma alanındaki görev metrikleri, dağılımlar ve ekip iş yükü."
        />
      )}
    </div>
  );
}
