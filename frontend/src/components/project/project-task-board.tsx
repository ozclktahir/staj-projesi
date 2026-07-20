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

const columnMeta: Record<
  TaskStatus,
  { dot: string; header: string }
> = {
  TODO: { dot: "bg-slate-400", header: "text-slate-600" },
  IN_PROGRESS: { dot: "bg-sky-500", header: "text-sky-700" },
  DONE: { dot: "bg-emerald-500", header: "text-emerald-700" },
};

const priorityBadge: Record<ProjectTask["priority"], string> = {
  HIGH: "bg-red-100 text-red-700",
  MEDIUM: "bg-amber-100 text-amber-800",
  LOW: "bg-emerald-100 text-emerald-700",
};

export function ProjectTaskBoard({ tasks }: ProjectTaskBoardProps) {
  const [selected, setSelected] = useState<ProjectTask | null>(null);

  if (tasks.length === 0) {
    return (
      <Card className="rounded-lg border border-dashed border-slate-200 bg-white">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-11 items-center justify-center rounded-md bg-slate-100 text-slate-600">
            <ListTodo className="size-5" />
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
      <div className="flex gap-4 overflow-x-auto pb-2">
        {TASK_STATUSES.map((status) => {
          const columnTasks = tasks.filter((task) => task.status === status);
          const meta = columnMeta[status];

          return (
            <section
              key={status}
              className="flex min-w-[280px] flex-1 flex-col rounded-lg border border-slate-200 bg-slate-100/70 p-3"
            >
              <div className="mb-3 flex items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <span className={cn("size-2 rounded-full", meta.dot)} />
                  <h3
                    className={cn(
                      "text-sm font-semibold",
                      meta.header,
                    )}
                  >
                    {TASK_STATUS_LABELS[status]}
                  </h3>
                </div>
                <span className="rounded-md bg-white px-1.5 py-0.5 text-xs text-slate-500 ring-1 ring-slate-200">
                  {columnTasks.length}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-2.5">
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
                      className="rounded-lg border border-slate-200 bg-white p-3.5 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                    >
                      <p className="text-sm font-medium leading-snug text-slate-900">
                        {task.title}
                      </p>
                      {task.description?.trim() ? (
                        <p className="mt-1.5 line-clamp-2 text-xs text-slate-500">
                          {task.description}
                        </p>
                      ) : null}
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                            priorityBadge[task.priority],
                          )}
                        >
                          {TASK_PRIORITY_LABELS[task.priority] ??
                            TASK_PRIORITY_LABELS.MEDIUM}
                        </span>
                        {task.created_at ? (
                          <span className="text-[11px] text-slate-400">
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
