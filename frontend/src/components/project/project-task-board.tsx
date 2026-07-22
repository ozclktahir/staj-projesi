"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ListTodo, UserRound } from "lucide-react";
import { toast } from "sonner";
import { updateTaskStatus } from "@/app/actions/update-task-status";
import { TaskDetailSheet } from "@/components/task-detail-sheet";
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
  type TaskAssignee,
  type TaskStatus,
} from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type ProjectTaskBoardProps = {
  tasks: ProjectTask[];
};

const columnAccent: Record<TaskStatus, string> = {
  TODO: "border-t-muted-foreground/50",
  IN_PROGRESS: "border-t-primary",
  DONE: "border-t-emerald-500",
};

function priorityClass(priority: ProjectTask["priority"]): string {
  switch (priority) {
    case "HIGH":
      return "bg-red-500/15 text-red-400";
    case "LOW":
      return "bg-emerald-500/15 text-emerald-400";
    default:
      return "bg-primary/15 text-primary";
  }
}

function AssigneeBadge({ assignee }: { assignee?: TaskAssignee | null }) {
  if (!assignee) {
    return (
      <span
        className="inline-flex max-w-[120px] items-center gap-1.5 truncate text-xs text-muted-foreground/70"
        title="Atanmadı"
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
          <UserRound className="size-3.5 text-muted-foreground/60" />
        </span>
        <span className="truncate">Atanmadı</span>
      </span>
    );
  }

  return (
    <span
      className="inline-flex max-w-[130px] items-center gap-1.5"
      title={assignee.email ?? assignee.displayName}
    >
      {assignee.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={assignee.avatarUrl}
          alt={assignee.displayName}
          className="size-6 shrink-0 rounded-full object-cover ring-1 ring-border"
        />
      ) : (
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
          {assignee.initials}
        </span>
      )}
      <span className="truncate text-xs font-medium text-foreground">
        {assignee.displayName}
        {assignee.email && assignee.displayName !== assignee.email ? (
          <span className="sr-only"> ({assignee.email})</span>
        ) : null}
      </span>
    </span>
  );
}

export function ProjectTaskBoard({ tasks: initialTasks }: ProjectTaskBoardProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  async function handleStatusChange(taskId: string, status: TaskStatus) {
    const previous = tasks;
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, status } : task)),
    );
    setUpdatingId(taskId);

    const result = await updateTaskStatus(taskId, status);
    setUpdatingId(null);

    if (!result.success) {
      setTasks(previous);
      console.error("[ProjectTaskBoard] updateTaskStatus failed:", result.error);
      toast.error(result.error);
      return;
    }

    toast.success("Durum güncellendi");
    router.refresh();
  }

  if (tasks.length === 0) {
    return (
      <Card className="rounded-lg border-dashed border-border bg-card/60">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-lg bg-primary/15 text-primary">
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {TASK_STATUSES.map((status) => {
          const columnTasks = tasks.filter((task) => task.status === status);

          return (
            <section
              key={status}
              className={cn(
                "flex min-h-[280px] flex-col rounded-lg border border-border border-t-4 bg-muted/40 p-3",
                columnAccent[status],
              )}
            >
              <div className="mb-3 flex items-center justify-between gap-2 px-1">
                <h3 className="text-sm font-semibold text-foreground">
                  {TASK_STATUS_LABELS[status]}
                </h3>
                <span className="rounded-md bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground shadow-sm">
                  {columnTasks.length}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-3">
                {columnTasks.length === 0 ? (
                  <p className="px-1 py-8 text-center text-xs text-muted-foreground">
                    Bu kolonda görev yok
                  </p>
                ) : (
                  columnTasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-lg border border-border bg-card p-4 shadow-sm transition-shadow duration-150 hover:border-primary/40 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedTaskId(task.id)}
                          className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <p className="text-sm font-semibold leading-snug text-foreground">
                            {task.title}
                          </p>
                          {task.description?.trim() ? (
                            <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                              {task.description}
                            </p>
                          ) : null}
                          {(task.subtask_total ?? 0) > 0 ? (
                            <p className="mt-2 text-xs font-medium text-muted-foreground">
                              {task.subtask_done ?? 0}/{task.subtask_total} Alt
                              Görev
                            </p>
                          ) : null}
                        </button>
                        <div className="shrink-0 pt-0.5">
                          <AssigneeBadge assignee={task.assignee} />
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={cn(
                            "rounded-md px-2 py-0.5 text-xs font-medium",
                            priorityClass(task.priority),
                          )}
                        >
                          {TASK_PRIORITY_LABELS[task.priority] ??
                            TASK_PRIORITY_LABELS.MEDIUM}
                        </span>
                        <select
                          aria-label="Görev durumu"
                          value={task.status}
                          disabled={updatingId === task.id}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => {
                            void handleStatusChange(
                              task.id,
                              event.target.value as TaskStatus,
                            );
                          }}
                          className="h-8 max-w-[140px] rounded-md border border-border bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                        >
                          {TASK_STATUSES.map((value) => (
                            <option key={value} value={value}>
                              {TASK_STATUS_LABELS[value]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      <TaskDetailSheet
        taskId={selectedTaskId}
        open={Boolean(selectedTaskId)}
        onOpenChange={(next) => {
          if (!next) setSelectedTaskId(null);
        }}
        onTaskUpdated={(partial) => {
          setTasks((prev) =>
            prev.map((task) =>
              task.id === partial.id ? { ...task, ...partial } : task,
            ),
          );
          router.refresh();
        }}
      />
    </>
  );
}
