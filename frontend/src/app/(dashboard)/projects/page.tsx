import { Suspense } from "react";
import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { ProjectsGridSkeleton } from "@/components/loading/page-skeletons";
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

async function ProjectsContent({
  searchParams,
}: {
  searchParams: Promise<{ workspaceId?: string }>;
}) {
  const params = await searchParams;
  const workspaceId = await resolveActiveWorkspaceId(params.workspaceId ?? null);

  // Üçü de birbirinden bağımsız — tek Promise.all ile paralel (önceden stats,
  // projects'in sonucunu (projectIds) beklediği için 2 aşamalı bir waterfall'du).
  const [{ userName, projects }, auth, stats] = await Promise.all([
    getCurrentUserProjects(workspaceId),
    getAuthenticatedUser(),
    getDashboardTaskStats(workspaceId),
  ]);

  const roleCtx =
    workspaceId && auth
      ? await resolveWorkspaceRole(auth.supabase, workspaceId, auth.user.id)
      : null;

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

export default function ProjectsPage({ searchParams }: ProjectsPageProps) {
  return (
    <Suspense fallback={<ProjectsGridSkeleton />}>
      <ProjectsContent searchParams={searchParams} />
    </Suspense>
  );
}
