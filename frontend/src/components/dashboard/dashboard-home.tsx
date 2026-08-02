"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { CheckCircle2, CircleDashed, FolderKanban, ListTodo } from "lucide-react";
import type { AdminMemberOverview } from "@/app/actions/admin-overview";
import { AdminOverviewPanel } from "@/components/dashboard/admin-overview-panel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslation } from "@/i18n/use-translation";
import { formatAppDate } from "@/lib/date-locale";
import type { DashboardProject, DashboardTaskStats } from "@/lib/supabase/types";
import { withWorkspaceQuery } from "@/lib/active-workspace";

const CreateProjectModal = dynamic(
  () =>
    import("@/components/CreateProjectModal").then((m) => m.CreateProjectModal),
  { ssr: false },
);

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
  const { t, locale } = useTranslation();
  const hasProjects = projects.length > 0;
  const welcomeName = userName?.trim() || "";

  const summary = [
    {
      label: t("projectsHome.totalTasks"),
      value: stats.total,
      icon: ListTodo,
      accent:
        "border border-primary/40 bg-primary/10 text-primary dark:border-transparent dark:bg-primary/15",
    },
    {
      label: t("projectsHome.inProgress"),
      value: stats.inProgress,
      icon: CircleDashed,
      accent:
        "border border-sky-300 bg-sky-100 text-sky-700 dark:border-transparent dark:bg-sky-500/15 dark:text-sky-400",
    },
    {
      label: t("projectsHome.done"),
      value: stats.done,
      icon: CheckCircle2,
      accent:
        "border border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-transparent dark:bg-emerald-500/15 dark:text-emerald-400",
    },
  ] as const;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <Card className="overflow-hidden rounded-[var(--radius)] border-border bg-gradient-to-br from-card via-card to-primary/10 shadow-sm">
        <CardHeader className="gap-2">
          <CardDescription className="text-sm text-muted-foreground">
            {t("projectsHome.eyebrow")}
          </CardDescription>
          <CardTitle className="text-3xl font-semibold tracking-tight text-foreground">
            {t("projectsHome.welcome")}
            {welcomeName ? (
              <>
                , <span className="text-primary">{welcomeName}</span>
              </>
            ) : null}
          </CardTitle>
          <p className="max-w-xl text-sm text-muted-foreground">
            {t("projectsHome.subtitle")}
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
              {t("projectsHome.myProjects")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("projectsHome.myProjectsHint")}
            </p>
          </div>
          {canCreateProject ? (
            <CreateProjectModal
              triggerLabel={t("projectModal.newProject")}
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
                        : t("projectsHome.noDescription")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      {project.created_at
                        ? formatAppDate(project.created_at, locale)
                        : t("projectsHome.noDate")}
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
                {t("projectsHome.emptyTitle")}
              </CardTitle>
              <CardDescription className="max-w-md">
                {t("projectsHome.emptyHint")}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-8">
              {canCreateProject ? (
                <CreateProjectModal
                  triggerLabel={t("projectModal.firstProject")}
                  workspaceId={workspaceId}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("projectsHome.assignedHint")}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
