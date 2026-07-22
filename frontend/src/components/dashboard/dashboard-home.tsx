"use client";

import Link from "next/link";
import { CheckCircle2, CircleDashed, FolderKanban, ListTodo } from "lucide-react";
import type { AdminMemberOverview } from "@/app/actions/admin-overview";
import { CreateProjectModal } from "@/components/CreateProjectModal";
import { AdminOverviewPanel } from "@/components/dashboard/admin-overview-panel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DashboardProject, DashboardTaskStats } from "@/lib/supabase/types";
import { withWorkspaceQuery } from "@/lib/active-workspace";

type DashboardHomeProps = {
  userName: string;
  projects: DashboardProject[];
  stats: DashboardTaskStats;
  workspaceId?: string | null;
  showAdminOverview?: boolean;
  adminMembers?: AdminMemberOverview[];
  canCreateProject?: boolean;
};

export function DashboardHome({
  userName,
  projects,
  stats,
  workspaceId = null,
  showAdminOverview = false,
  adminMembers = [],
  canCreateProject = false,
}: DashboardHomeProps) {
  const hasProjects = projects.length > 0;
  const welcomeName = userName?.trim() || "";

  const summary = [
    {
      label: "Toplam Görev",
      value: stats.total,
      icon: ListTodo,
      accent: "bg-primary/15 text-primary",
    },
    {
      label: "Devam Eden",
      value: stats.inProgress,
      icon: CircleDashed,
      accent: "bg-sky-500/15 text-sky-400",
    },
    {
      label: "Tamamlanan",
      value: stats.done,
      icon: CheckCircle2,
      accent: "bg-emerald-500/15 text-emerald-400",
    },
  ] as const;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <Card className="overflow-hidden rounded-[var(--radius)] border-border bg-gradient-to-br from-card via-card to-primary/10 shadow-sm">
        <CardHeader className="gap-2">
          <CardDescription className="text-sm text-muted-foreground">
            Dashboard
          </CardDescription>
          <CardTitle className="text-3xl font-semibold tracking-tight text-foreground">
            Hoş geldin
            {welcomeName ? (
              <>
                , <span className="text-primary">{welcomeName}</span>
              </>
            ) : null}
          </CardTitle>
          <p className="max-w-xl text-sm text-muted-foreground">
            Projelerini buradan yönet, ilerlemeyi takip et ve ekibinle
            senkron kal.
          </p>
        </CardHeader>
      </Card>

      <section className="grid gap-4 sm:grid-cols-3">
        {summary.map(({ label, value, icon: Icon, accent }) => (
          <Card
            key={label}
            className="rounded-[var(--radius)] border-border bg-card shadow-sm"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription className="text-sm text-muted-foreground">
                {label}
              </CardDescription>
              <span
                className={`flex size-9 items-center justify-center rounded-[var(--radius)] ${accent}`}
              >
                <Icon className="size-4" />
              </span>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight text-foreground">
                {value}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      {showAdminOverview ? (
        <AdminOverviewPanel members={adminMembers} />
      ) : null}

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
          {canCreateProject ? (
            <CreateProjectModal
              triggerLabel="Yeni Proje"
              workspaceId={workspaceId}
            />
          ) : null}
        </div>

        {hasProjects ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={withWorkspaceQuery(
                  `/project/${project.id}`,
                  workspaceId ?? project.workspace_id,
                )}
                className="block rounded-[var(--radius)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Card className="h-full rounded-[var(--radius)] border-border bg-card transition-colors hover:border-primary/40">
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
              {canCreateProject ? (
                <CreateProjectModal
                  triggerLabel="İlk Projeyi Oluştur"
                  workspaceId={workspaceId}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Size atanan projeler burada görünecek.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
