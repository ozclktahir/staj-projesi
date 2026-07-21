import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { resolveActiveWorkspaceId } from "@/lib/active-workspace";
import {
  getCurrentUserProjects,
  getDashboardTaskStats,
} from "@/lib/supabase/server";

type ProjectsPageProps = {
  searchParams: Promise<{ workspaceId?: string }>;
};

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const params = await searchParams;
  const workspaceId = await resolveActiveWorkspaceId(params.workspaceId ?? null);
  const { userName, projects } = await getCurrentUserProjects(workspaceId);
  const stats = await getDashboardTaskStats(projects.map((p) => p.id));

  return (
    <DashboardHome
      userName={userName}
      projects={projects}
      stats={stats}
      workspaceId={workspaceId}
    />
  );
}
