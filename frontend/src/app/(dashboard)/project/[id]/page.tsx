import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CreateTaskModal } from "@/components/CreateTaskModal";
import { ProjectTaskBoard } from "@/components/project/project-task-board";
import { withWorkspaceQuery } from "@/lib/active-workspace";
import { resolveActiveWorkspaceId } from "@/lib/active-workspace-server";
import { getProjectById, getProjectTasks } from "@/lib/supabase/server";

type ProjectDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ workspaceId?: string }>;
};

export default async function ProjectDetailPage({
  params,
  searchParams,
}: ProjectDetailPageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const workspaceId = await resolveActiveWorkspaceId(sp.workspaceId ?? null);
  const project = await getProjectById(id);

  if (!project) {
    notFound();
  }

  // Proje başka workspace'e aitse görevleri filtrele / boş göster
  const effectiveWorkspaceId = workspaceId ?? project.workspace_id ?? null;
  if (
    workspaceId &&
    project.workspace_id &&
    project.workspace_id !== workspaceId
  ) {
    notFound();
  }

  const tasks = await getProjectTasks(project.id, effectiveWorkspaceId);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div className="space-y-3 rounded-lg border border-border bg-card p-5 shadow-sm">
        <Link
          href={withWorkspaceQuery("/projects", effectiveWorkspaceId)}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Projelere dön
        </Link>

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
          <CreateTaskModal projectId={project.id} />
        </div>

        <ProjectTaskBoard tasks={tasks} />
      </section>
    </div>
  );
}
