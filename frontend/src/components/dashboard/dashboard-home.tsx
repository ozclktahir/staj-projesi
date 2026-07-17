"use client";

import { FolderKanban } from "lucide-react";
import { CreateProjectModal } from "@/components/dashboard/create-project-modal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DashboardProject } from "@/lib/supabase/types";

type DashboardHomeProps = {
  userName: string;
  projects: DashboardProject[];
};

export function DashboardHome({ userName, projects }: DashboardHomeProps) {
  const hasProjects = projects.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <Card className="overflow-hidden rounded-[var(--radius)] border-border bg-gradient-to-br from-card via-card to-primary/10 shadow-sm">
        <CardHeader className="gap-2">
          <CardDescription className="text-sm text-muted-foreground">
            Dashboard
          </CardDescription>
          <CardTitle className="text-3xl font-semibold tracking-tight text-foreground">
            Hoş geldin, <span className="text-primary">{userName}</span>
          </CardTitle>
          <p className="max-w-xl text-sm text-muted-foreground">
            Projelerini buradan yönet, ilerlemeyi takip et ve ekibinle
            senkron kal.
          </p>
        </CardHeader>
      </Card>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Projelerim
            </h2>
            <p className="text-sm text-muted-foreground">
              Aktif çalışma alanların ve projelerin
            </p>
          </div>
          <CreateProjectModal triggerLabel="Yeni Proje" />
        </div>

        {hasProjects ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="rounded-[var(--radius)] border-border bg-card transition-colors hover:border-primary/40"
              >
                <CardHeader className="space-y-3">
                  <div className="flex size-10 items-center justify-center rounded-[var(--radius)] bg-primary/15 text-primary">
                    <FolderKanban className="size-5" />
                  </div>
                  <CardTitle className="text-lg text-foreground">
                    {project.name}
                  </CardTitle>
                  <CardDescription>
                    {project.description?.trim()
                      ? project.description
                      : "Açıklama eklenmemiş"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {project.created_at
                      ? new Date(project.created_at).toLocaleDateString("tr-TR")
                      : "Tarih yok"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="rounded-[var(--radius)] border-dashed border-border bg-card/60">
            <CardHeader className="items-center text-center">
              <div className="mb-2 flex size-12 items-center justify-center rounded-[var(--radius)] bg-primary/15 text-primary">
                <FolderKanban className="size-6" />
              </div>
              <CardTitle className="text-xl text-foreground">
                Henüz bir proje yok
              </CardTitle>
              <CardDescription className="max-w-md">
                Henüz bir proje yok, bir tane oluştur
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
