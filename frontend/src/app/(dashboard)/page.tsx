import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { getAdminOverview } from "@/app/actions/admin-overview";
import { resolveActiveWorkspaceId } from "@/lib/active-workspace-server";
import {
  getAuthenticatedUser,
  getCurrentUserProjects,
  getDashboardTaskStats,
} from "@/lib/supabase/server";
import type { DashboardProject, DashboardTaskStats } from "@/lib/supabase/types";
import { resolveWorkspaceRole } from "@/lib/workspace-permissions";

type DashboardPageProps = {
  searchParams: Promise<{ workspaceId?: string }>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const params = await searchParams;
  const workspaceId = await resolveActiveWorkspaceId(params.workspaceId ?? null);

  let userName = "—";
  let projects: DashboardProject[] = [];
  let stats: DashboardTaskStats = { total: 0, inProgress: 0, done: 0 };
  let adminMembers: Awaited<ReturnType<typeof getAdminOverview>>["members"] =
    [];
  let showAdminOverview = false;
  let canCreateProject = false;

  try {
    const result = await getCurrentUserProjects(workspaceId);
    userName = result.userName;
    projects = result.projects;
    stats = await getDashboardTaskStats(projects.map((p) => p.id));

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

    const overview = await getAdminOverview(workspaceId);
    if (overview.success && overview.isAdmin) {
      showAdminOverview = true;
      adminMembers = overview.members;
      canCreateProject = true;
    }
  } catch (error) {
    console.error("[DashboardPage]", error);
  }

  return (
    <DashboardHome
      userName={userName}
      projects={projects}
      stats={stats}
      workspaceId={workspaceId}
      showAdminOverview={showAdminOverview}
      adminMembers={adminMembers}
      canCreateProject={canCreateProject}
    />
  );
}
