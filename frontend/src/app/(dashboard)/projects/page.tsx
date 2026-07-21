import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { resolveActiveWorkspaceId } from "@/lib/active-workspace-server";
import {
  getAuthenticatedUser,
  getCurrentUserProjects,
  getDashboardTaskStats,
} from "@/lib/supabase/server";
import { resolveWorkspaceRole } from "@/lib/workspace-permissions";

type ProjectsPageProps = {
  searchParams: Promise<{ workspaceId?: string }>;
};

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const params = await searchParams;
  const workspaceId = await resolveActiveWorkspaceId(params.workspaceId ?? null);
  const { userName, projects } = await getCurrentUserProjects(workspaceId);
  const stats = await getDashboardTaskStats(projects.map((p) => p.id));

  let canCreateProject = false;
  if (workspaceId) {
    const auth = await getAuthenticatedUser();
    if (auth) {
      const roleCtx = await resolveWorkspaceRole(
        auth.supabase,
        workspaceId,
        auth.user.id,
      );
      canCreateProject = roleCtx.isAdmin;
    }
  }

  return (
    <DashboardHome
      userName={userName}
      projects={projects}
      stats={stats}
      workspaceId={workspaceId}
      canCreateProject={canCreateProject}
    />
  );
}
