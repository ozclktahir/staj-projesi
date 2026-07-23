import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getProjectAnalytics } from "@/app/actions/analytics";
import { DeleteProjectButton } from "@/components/delete-project-button";
import { ProjectDetailViews } from "@/components/project/project-detail-views";
import { withWorkspaceQuery } from "@/lib/active-workspace";
import { resolveActiveWorkspaceId } from "@/lib/active-workspace-server";
import {
  getAuthenticatedUser,
  getProjectById,
  getProjectTasks,
} from "@/lib/supabase/server";
import { resolveWorkspaceRole } from "@/lib/workspace-permissions";

type ProjectDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ workspaceId?: string }>;
};

export default async function ProjectDetailPage({
  params,
  searchParams,
}: ProjectDetailPageProps) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const workspaceId = await resolveActiveWorkspaceId(sp.workspaceId ?? null);

  const [project, auth] = await Promise.all([
    getProjectById(id),
    getAuthenticatedUser(),
  ]);

  if (!project) {
    notFound();
  }

  const effectiveWorkspaceId = workspaceId ?? project.workspace_id ?? null;
  if (
    workspaceId &&
    project.workspace_id &&
    project.workspace_id !== workspaceId
  ) {
    notFound();
  }

  const [tasks, roleCtx, analyticsResult] = await Promise.all([
    getProjectTasks(project.id, effectiveWorkspaceId),
    effectiveWorkspaceId && auth
      ? resolveWorkspaceRole(
          auth.supabase,
          effectiveWorkspaceId,
          auth.user.id,
        )
      : Promise.resolve(null),
    getProjectAnalytics(project.id, effectiveWorkspaceId),
  ]);

  const canDeleteProject = Boolean(roleCtx?.isAdmin);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div className="space-y-3 rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={withWorkspaceQuery("/projects", effectiveWorkspaceId)}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-4" />
            Projelere dön
          </Link>
          {canDeleteProject ? (
            <DeleteProjectButton
              project={{
                id: project.id,
                name: project.name,
                workspaceId: effectiveWorkspaceId,
              }}
            />
          ) : null}
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Proje detayı</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {project.name}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {project.description?.trim()
              ? project.description
              : "Bu proje için henüz bir açıklama eklenmemiş."}
          </p>
          {project.created_at ? (
            <p className="text-xs text-muted-foreground">
              Oluşturulma:{" "}
              {new Date(project.created_at).toLocaleDateString("tr-TR")}
            </p>
          ) : null}
        </div>
      </div>

      <ProjectDetailViews
        projectId={project.id}
        workspaceId={effectiveWorkspaceId}
        tasks={tasks}
        analytics={analyticsResult.data}
      />
    </div>
  );
}
