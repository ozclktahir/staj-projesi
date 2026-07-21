import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { resolveActiveWorkspaceId } from "@/lib/active-workspace";
import {
  getCurrentUserProjects,
  getDashboardTaskStats,
} from "@/lib/supabase/server";
import type { DashboardProject, DashboardTaskStats } from "@/lib/supabase/types";

type DashboardPageProps = {
  searchParams: Promise<{ workspaceId?: string }>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const params = await searchParams;
  const workspaceId = await resolveActiveWorkspaceId(params.workspaceId ?? null);

  let userName = "Kullanıcı";
  let projects: DashboardProject[] = [];
  let stats: DashboardTaskStats = { total: 0, inProgress: 0, done: 0 };

  try {
    const result = await getCurrentUserProjects(workspaceId);
    userName = result.userName;
    projects = result.projects;
    stats = await getDashboardTaskStats(projects.map((p) => p.id));
  } catch (error) {
    console.error("[DashboardPage]", error);
  }

  return (
    <DashboardHome
      userName={userName}
      projects={projects}
      stats={stats}
      workspaceId={workspaceId}
    />
  );
}
