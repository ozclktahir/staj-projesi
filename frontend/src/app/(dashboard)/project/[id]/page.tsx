import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CreateTaskModal } from "@/components/CreateTaskModal";
import { DeleteProjectButton } from "@/components/delete-project-button";
import { ProjectActivityDrawer } from "@/components/project/project-activity-panel";
import { ProjectTaskBoard } from "@/components/project/project-task-board";
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

  const [tasks, roleCtx] = await Promise.all([
    getProjectTasks(project.id, effectiveWorkspaceId),
    effectiveWorkspaceId && auth
      ? resolveWorkspaceRole(
          auth.supabase,
          effectiveWorkspaceId,
          auth.user.id,
        )
      : Promise.resolve(null),
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

      <section className="space-y-4">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Görevler</h2>
            <p className="text-sm text-muted-foreground">
              Kartlara tıklayarak detay panelini aç. Durumu hızlıca değiştir.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ProjectActivityDrawer
              projectId={project.id}
              workspaceId={effectiveWorkspaceId}
            />
            <CreateTaskModal
              projectId={project.id}
              workspaceId={effectiveWorkspaceId}
            />
          </div>
        </div>

        <div className="w-full flex-1 overflow-x-auto">
          <ProjectTaskBoard projectId={project.id} tasks={tasks} />
        </div>
      </section>
    </div>
  );
}
