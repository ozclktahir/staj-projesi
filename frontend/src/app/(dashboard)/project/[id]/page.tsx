import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CreateTaskModal } from "@/components/CreateTaskModal";
import { ProjectTaskBoard } from "@/components/project/project-task-board";
import { getProjectById, getProjectTasks } from "@/lib/supabase/server";

type ProjectDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project) {
    notFound();
  }

  const tasks = await getProjectTasks(project.id);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          Projelere dön
        </Link>

        <div className="space-y-2">
          <p className="text-sm text-slate-500">Proje detayı</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {project.name}
          </h1>
          <p className="max-w-2xl text-sm text-slate-600">
            {project.description?.trim()
              ? project.description
              : "Bu proje için henüz bir açıklama eklenmemiş."}
          </p>
          {project.created_at ? (
            <p className="text-xs text-slate-400">
              Oluşturulma:{" "}
              {new Date(project.created_at).toLocaleDateString("tr-TR")}
            </p>
          ) : null}
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Görevler</h2>
            <p className="text-sm text-slate-500">
              Kartlara tıklayarak detay panelini aç.
            </p>
          </div>
          <CreateTaskModal projectId={project.id} />
        </div>

        <ProjectTaskBoard tasks={tasks} />
      </section>
    </div>
  );
}
