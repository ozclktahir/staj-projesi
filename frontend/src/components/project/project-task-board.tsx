"use client";

import { useState } from "react";
import { ListTodo } from "lucide-react";
import { TaskDetailSheet } from "@/components/project/task-detail-sheet";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type ProjectTask,
  type TaskStatus,
} from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type ProjectTaskBoardProps = {
  tasks: ProjectTask[];
};

const columnAccent: Record<TaskStatus, string> = {
  TODO: "border-t-muted-foreground/40",
  IN_PROGRESS: "border-t-primary",
  DONE: "border-t-emerald-500",
};

function priorityClass(priority: ProjectTask["priority"]): string {
  switch (priority) {
    case "HIGH":
      return "text-red-500";
    case "LOW":
      return "text-muted-foreground";
    default:
      return "text-primary";
  }
}

export function ProjectTaskBoard({ tasks }: ProjectTaskBoardProps) {
  const [selected, setSelected] = useState<ProjectTask | null>(null);

  if (tasks.length === 0) {
    return (
      <Card className="rounded-[var(--radius)] border-dashed border-border bg-card/60">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-[var(--radius)] bg-primary/15 text-primary">
            <ListTodo className="size-6" />
          </div>
          <CardTitle className="text-lg text-foreground">
            Henüz görev yok
          </CardTitle>
          <CardDescription className="max-w-md">
            Bu projeye ilk görevini eklemek için &quot;Yeni Görev Ekle&quot;
            butonunu kullan.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-3 lg:overflow-visible">
        {TASK_STATUSES.map((status) => {
          const columnTasks = tasks.filter((task) => task.status === status);

          return (
            <section
              key={status}
              className={cn(
                "flex min-w-[260px] flex-1 flex-col rounded-[var(--radius)] border border-border border-t-4 bg-card/40 p-3",
                columnAccent[status],
              )}
            >
              <div className="mb-3 flex items-center justify-between gap-2 px-1">
                <h3 className="text-sm font-semibold text-foreground">
                  {TASK_STATUS_LABELS[status]}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {columnTasks.length}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-3">
                {columnTasks.length === 0 ? (
                  <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                    Bu kolonda görev yok
                  </p>
                ) : (
                  columnTasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => setSelected(task)}
                      className="rounded-[var(--radius)] border border-border bg-card p-4 text-left shadow-sm transition-shadow hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <p className="text-base font-medium leading-snug text-foreground">
                        {task.title}
                      </p>
                      {task.description?.trim() ? (
                        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                          {task.description}
                        </p>
                      ) : null}
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "text-xs font-medium",
                            priorityClass(task.priority),
                          )}
                        >
                          {TASK_PRIORITY_LABELS[task.priority] ??
                            TASK_PRIORITY_LABELS.MEDIUM}
                        </span>
                        {task.created_at ? (
                          <span className="text-xs text-muted-foreground">
                            {new Date(task.created_at).toLocaleDateString(
                              "tr-TR",
                            )}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      <TaskDetailSheet
        task={selected}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
