"use client";

import { useState } from "react";
import { ListTodo } from "lucide-react";
import { TaskDetailSheet } from "@/components/project/task-detail-sheet";
import {
  Card,
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
  TODO: "border-t-slate-300",
  IN_PROGRESS: "border-t-sky-500",
  DONE: "border-t-emerald-500",
};

function priorityClass(priority: ProjectTask["priority"]): string {
  switch (priority) {
    case "HIGH":
      return "bg-red-100 text-red-700";
    case "LOW":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-amber-100 text-amber-800";
  }
}

export function ProjectTaskBoard({ tasks }: ProjectTaskBoardProps) {
  const [selected, setSelected] = useState<ProjectTask | null>(null);

  if (tasks.length === 0) {
    return (
      <Card className="rounded-lg border-dashed border-slate-200 bg-white">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <ListTodo className="size-6" />
          </div>
          <CardTitle className="text-lg text-slate-900">
            Henüz görev yok
          </CardTitle>
          <CardDescription className="max-w-md text-slate-500">
            Bu projeye ilk görevini eklemek için &quot;Yeni Görev Ekle&quot;
            butonunu kullan.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {TASK_STATUSES.map((status) => {
          const columnTasks = tasks.filter((task) => task.status === status);

          return (
            <section
              key={status}
              className={cn(
                "flex min-h-[280px] flex-col rounded-lg border border-slate-200 border-t-4 bg-slate-100/70 p-3",
                columnAccent[status],
              )}
            >
              <div className="mb-3 flex items-center justify-between gap-2 px-1">
                <h3 className="text-sm font-semibold text-slate-900">
                  {TASK_STATUS_LABELS[status]}
                </h3>
                <span className="rounded-md bg-white px-2 py-0.5 text-xs font-medium text-slate-500 shadow-sm">
                  {columnTasks.length}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-3">
                {columnTasks.length === 0 ? (
                  <p className="px-1 py-8 text-center text-xs text-slate-400">
                    Bu kolonda görev yok
                  </p>
                ) : (
                  columnTasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => setSelected(task)}
                      className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition-shadow duration-150 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                    >
                      <p className="text-sm font-semibold leading-snug text-slate-900">
                        {task.title}
                      </p>
                      {task.description?.trim() ? (
                        <p className="mt-2 line-clamp-3 text-sm text-slate-600">
                          {task.description}
                        </p>
                      ) : null}
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "rounded-md px-2 py-0.5 text-xs font-medium",
                            priorityClass(task.priority),
                          )}
                        >
                          {TASK_PRIORITY_LABELS[task.priority] ??
                            TASK_PRIORITY_LABELS.MEDIUM}
                        </span>
                        {task.created_at ? (
                          <span className="text-xs text-slate-400">
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
