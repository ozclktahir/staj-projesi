"use client";

import { useState } from "react";
import { ChartColumn, LayoutGrid } from "lucide-react";
import type { AnalyticsData } from "@/app/actions/analytics";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { CreateTaskModal } from "@/components/CreateTaskModal";
import { ProjectActivityDrawer } from "@/components/project/project-activity-panel";
import { ProjectTaskBoard } from "@/components/project/project-task-board";
import type { ProjectTask } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type TabId = "board" | "analytics";

type ProjectDetailViewsProps = {
  projectId: string;
  workspaceId: string | null;
  tasks: ProjectTask[];
  analytics: AnalyticsData;
};

export function ProjectDetailViews({
  projectId,
  workspaceId,
  tasks,
  analytics,
}: ProjectDetailViewsProps) {
  const [tab, setTab] = useState<TabId>("board");

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {tab === "board" ? "Görevler" : "Proje Analizi"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {tab === "board"
                ? "Kartlara tıklayarak detay panelini aç. Durumu hızlıca değiştir."
                : "Bu projeye özel KPI’lar, grafikler ve teslim tarihleri."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ProjectActivityDrawer
              projectId={projectId}
              workspaceId={workspaceId}
            />
            {tab === "board" ? (
              <CreateTaskModal
                projectId={projectId}
                workspaceId={workspaceId}
              />
            ) : null}
          </div>
        </div>

        <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setTab("board")}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors sm:flex-none",
              tab === "board"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LayoutGrid className="size-4" />
            Kanban
          </button>
          <button
            type="button"
            onClick={() => setTab("analytics")}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors sm:flex-none",
              tab === "analytics"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <ChartColumn className="size-4" />
            Analiz
          </button>
        </div>
      </div>

      {tab === "board" ? (
        <div className="w-full flex-1 overflow-x-auto">
          <ProjectTaskBoard projectId={projectId} tasks={tasks} />
        </div>
      ) : (
        <AnalyticsDashboard
          data={analytics}
          title="Proje Analitiği"
          description="Seçili projedeki görev durumu, öncelik ve üye iş yükü."
        />
      )}
    </section>
  );
}
