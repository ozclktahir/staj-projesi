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

  const [{ userName, projects }, auth] = await Promise.all([
    getCurrentUserProjects(workspaceId),
    getAuthenticatedUser(),
  ]);

  const projectIds = projects.map((p) => p.id);

  const [stats, roleCtx] = await Promise.all([
    getDashboardTaskStats(projectIds),
    workspaceId && auth
      ? resolveWorkspaceRole(auth.supabase, workspaceId, auth.user.id)
      : Promise.resolve(null),
  ]);

  const canCreateProject = Boolean(roleCtx?.isAdmin);

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
