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
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="space-y-3">
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          Projects
        </Link>

        <div className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Project
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {project.name}
          </h1>
          <p className="max-w-2xl text-sm text-slate-500">
            {project.description?.trim()
              ? project.description
              : "Bu proje için henüz bir açıklama eklenmemiş."}
          </p>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Board</h2>
            <p className="text-xs text-slate-500">
              Kartlara tıklayarak sağ panelde detayları aç.
            </p>
          </div>
          <CreateTaskModal projectId={project.id} />
        </div>

        <ProjectTaskBoard tasks={tasks} />
      </section>
    </div>
  );
}
