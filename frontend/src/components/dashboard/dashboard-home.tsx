"use client";

import Link from "next/link";
import { CheckCircle2, CircleDashed, FolderKanban, ListTodo } from "lucide-react";
import { CreateProjectModal } from "@/components/CreateProjectModal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DashboardProject, DashboardTaskStats } from "@/lib/supabase/types";

type DashboardHomeProps = {
  userName: string;
  projects: DashboardProject[];
  stats: DashboardTaskStats;
};

export function DashboardHome({
  userName,
  projects,
  stats,
}: DashboardHomeProps) {
  const hasProjects = projects.length > 0;

  const summary = [
    {
      label: "Toplam Görev",
      value: stats.total,
      icon: ListTodo,
      accent: "bg-slate-100 text-slate-700",
    },
    {
      label: "Devam Eden",
      value: stats.inProgress,
      icon: CircleDashed,
      accent: "bg-sky-100 text-sky-700",
    },
    {
      label: "Tamamlanan",
      value: stats.done,
      icon: CheckCircle2,
      accent: "bg-emerald-100 text-emerald-700",
    },
  ] as const;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Dashboard
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Merhaba, {userName}
        </h1>
        <p className="text-sm text-slate-500">
          Özet metrikler ve projelerin — Linear × Notion sade görünüm.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        {summary.map(({ label, value, icon: Icon, accent }) => (
          <Card
            key={label}
            className="rounded-lg border border-slate-200 bg-white shadow-sm"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
              <CardDescription className="text-xs font-medium text-slate-500">
                {label}
              </CardDescription>
              <span
                className={`flex size-8 items-center justify-center rounded-md ${accent}`}
              >
                <Icon className="size-4" />
              </span>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-2xl font-semibold tracking-tight text-slate-900">
                {value}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Projects</h2>
            <p className="text-xs text-slate-500">
              Aktif çalışma alanların ve projelerin
            </p>
          </div>
          <CreateProjectModal triggerLabel="Yeni Proje" />
        </div>

        {hasProjects ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/project/${project.id}`}
                className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
              >
                <Card className="h-full rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                  <CardHeader className="space-y-3 p-4">
                    <div className="flex size-9 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                      <FolderKanban className="size-4" />
                    </div>
                    <CardTitle className="text-base text-slate-900">
                      {project.name}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 text-slate-500">
                      {project.description?.trim()
                        ? project.description
                        : "Açıklama eklenmemiş"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-xs text-slate-400">
                      {project.created_at
                        ? new Date(project.created_at).toLocaleDateString(
                            "tr-TR",
                          )
                        : "Tarih yok"}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="rounded-lg border border-dashed border-slate-200 bg-white">
            <CardHeader className="items-center text-center">
              <div className="mb-2 flex size-11 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                <FolderKanban className="size-5" />
              </div>
              <CardTitle className="text-lg text-slate-900">
                Henüz bir proje yok
              </CardTitle>
              <CardDescription className="max-w-md text-slate-500">
                İlk projeni oluşturarak görev yönetimine başla.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-8">
              <CreateProjectModal triggerLabel="İlk Projeyi Oluştur" />
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
