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

  // getAuthenticatedUser() React cache()'li — burada bir kez await etmek
  // internal çağrıları (getCurrentUserProjects/getDashboardTaskStats'ın
  // kendi içindeki auth okumaları) YAVAŞLATMAZ, hepsi aynı cache'lenmiş
  // promise'i paylaşır. Asıl kazanç: resolveWorkspaceRole artık projects/
  // stats'la AYNI Promise.all'da paralel — önceden bu üçü bitene kadar
  // beklenip SONRA sıralı çalıştırılıyordu (23 Ağustos 2026 canlı
  // profillemesinde /projects en yavaş SSR sayfası olarak bulundu).
  const auth = await getAuthenticatedUser();
  const [{ userName, projects }, stats, roleCtx] = await Promise.all([
    getCurrentUserProjects(workspaceId),
    getDashboardTaskStats(workspaceId),
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

export default function ProjectsPage({ searchParams }: ProjectsPageProps) {
  return (
    <Suspense fallback={<ProjectsGridSkeleton />}>
      <ProjectsContent searchParams={searchParams} />
    </Suspense>
  );
}
