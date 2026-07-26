"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Flag } from "lucide-react";
import { toast } from "sonner";
import { updateTaskStatus } from "@/app/actions/update-task-status";
import { TaskDetailSheet } from "@/components/task-detail-sheet";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type ProjectTask,
  type TaskStatus,
} from "@/lib/supabase/types";
import {
  isTaskSoftDeleted,
  mapRealtimeTaskRow,
} from "@/lib/supabase/realtime";
import { createAuthedRealtimeClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const PROJECT_BADGE_COLORS = [
  "border-violet-300 bg-violet-100 text-violet-800 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-300",
  "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300",
  "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300",
  "border-pink-300 bg-pink-100 text-pink-800 dark:border-pink-500/40 dark:bg-pink-500/15 dark:text-pink-300",
  "border-sky-300 bg-sky-100 text-sky-800 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-300",
  "border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-300",
];

const columnAccent: Record<TaskStatus, string> = {
  TODO: "border-t-muted-foreground/50",
  IN_PROGRESS: "border-t-primary",
  DONE: "border-t-emerald-500",
};

function projectBadgeClass(projectId: string | null | undefined): string {
  if (!projectId) return PROJECT_BADGE_COLORS[0];
  let hash = 0;
  for (let i = 0; i < projectId.length; i += 1) {
    hash = (hash + projectId.charCodeAt(i) * (i + 1)) % PROJECT_BADGE_COLORS.length;
  }
  return PROJECT_BADGE_COLORS[hash] ?? PROJECT_BADGE_COLORS[0];
}

function priorityClass(priority: ProjectTask["priority"]): string {
  switch (priority) {
    case "HIGH":
      return "text-red-600 dark:text-red-400";
    case "LOW":
      return "text-emerald-600 dark:text-emerald-400";
    default:
      return "text-amber-600 dark:text-amber-400";
  }
}

function formatDueDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
  });
}

type PersonalTaskCardProps = {
  task: ProjectTask;
  dragging: boolean;
  onOpen: (taskId: string) => void;
  onDragStart: (taskId: string) => void;
  onDragEnd: () => void;
};

const PersonalTaskCard = memo(function PersonalTaskCard({
  task,
  dragging,
  onOpen,
  onDragStart,
  onDragEnd,
}: PersonalTaskCardProps) {
  const dueLabel = formatDueDate(task.due_date);
  const projectLabel = task.project_name?.trim() || "Proje";

  return (
    <article
      draggable
      onDragStart={(event: DragEvent) => {
        event.dataTransfer.setData("text/task-id", task.id);
        event.dataTransfer.setData("text/plain", task.id);
        event.dataTransfer.effectAllowed = "move";
        onDragStart(task.id);
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "cursor-grab rounded-lg border-2 border-border bg-card p-3 shadow-sm transition-shadow active:cursor-grabbing dark:border",
        "hover:border-primary/50 hover:shadow-md",
        dragging && "opacity-50 ring-2 ring-primary/40",
      )}
    >
      <span
        className={cn(
          "mb-2 inline-flex max-w-full truncate rounded-md border px-2 py-0.5 text-[11px] font-semibold",
          projectBadgeClass(task.project_id),
        )}
        title={
          task.workspace_name
            ? `${projectLabel} · ${task.workspace_name}`
            : projectLabel
        }
      >
        {projectLabel}
      </span>

      <button
        type="button"
        onClick={() => onOpen(task.id)}
        className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <p className="text-sm font-semibold leading-snug text-foreground">
          {task.title}
        </p>
      </button>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span
          className={cn(
            "inline-flex items-center gap-1 font-medium",
            priorityClass(task.priority),
          )}
          title="Öncelik"
        >
          <Flag className="size-3.5" />
          {TASK_PRIORITY_LABELS[task.priority] ?? TASK_PRIORITY_LABELS.MEDIUM}
        </span>
        {dueLabel ? (
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3.5" />
            {dueLabel}
          </span>
        ) : null}
      </div>
    </article>
  );
});

type ColumnProps = {
  status: TaskStatus;
  tasks: ProjectTask[];
  dragOver: boolean;
  draggingId: string | null;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDrop: (status: TaskStatus) => void;
  onOpenTask: (taskId: string) => void;
  onCardDragStart: (taskId: string) => void;
  onCardDragEnd: () => void;
};

const KanbanColumn = memo(function KanbanColumn({
  status,
  tasks,
  dragOver,
  draggingId,
  onDragEnter,
  onDragLeave,
  onDrop,
  onOpenTask,
  onCardDragStart,
  onCardDragEnd,
}: ColumnProps) {
  return (
    <section
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDragEnter={(event) => {
        event.preventDefault();
        onDragEnter();
      }}
      onDragLeave={(event) => {
        const related = event.relatedTarget as Node | null;
        if (related && event.currentTarget.contains(related)) return;
        onDragLeave();
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(status);
      }}
      className={cn(
        "flex min-h-[320px] flex-col rounded-lg border-2 border-border border-t-4 bg-muted/40 p-3 shadow-sm transition-colors dark:border dark:shadow-none",
        columnAccent[status],
        dragOver && "border-primary/50 bg-primary/5",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <h3 className="text-sm font-semibold text-foreground">
          {TASK_STATUS_LABELS[status]}
        </h3>
        <span className="rounded-md bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground shadow-sm">
          {tasks.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3">
        {tasks.length === 0 ? (
          <p className="px-1 py-10 text-center text-xs text-muted-foreground">
            Bu kolonda görev yok
          </p>
        ) : (
          tasks.map((task) => (
            <PersonalTaskCard
              key={task.id}
              task={task}
              dragging={draggingId === task.id}
              onOpen={onOpenTask}
              onDragStart={onCardDragStart}
              onDragEnd={onCardDragEnd}
            />
          ))
        )}
      </div>
    </section>
  );
});

export function PersonalKanbanBoard({
  tasks: initialTasks,
  currentUserId,
}: {
  tasks: ProjectTask[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const projectMetaRef = useRef(
    new Map<
      string,
      { project_name: string | null; workspace_name: string | null }
    >(),
  );

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    const map = projectMetaRef.current;
    for (const task of tasks) {
      if (!task.project_id) continue;
      if (!map.has(task.project_id) || task.project_name) {
        map.set(task.project_id, {
          project_name: task.project_name ?? null,
          workspace_name: task.workspace_name ?? null,
        });
      }
    }
  }, [tasks]);

  // Realtime: kullanıcıya atanan görevler
  useEffect(() => {
    if (!currentUserId) return;
    const client = createAuthedRealtimeClient();
    if (!client) return;

    const channel = client
      .channel(`my-tasks:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `assignee_id=eq.${currentUserId}`,
        },
        (payload) => {
          const eventType = payload.eventType;
          const nextRow = (payload.new ?? {}) as Record<string, unknown>;
          const oldRow = (payload.old ?? {}) as Record<string, unknown>;

          if (eventType === "DELETE") {
            const id = typeof oldRow.id === "string" ? oldRow.id : null;
            if (!id) return;
            setTasks((prev) => prev.filter((t) => t.id !== id));
            setSelectedTaskId((cur) => (cur === id ? null : cur));
            return;
          }

          if (!nextRow.id) return;

          if (nextRow.parent_task_id != null && nextRow.parent_task_id !== "") {
            return;
          }

          const assigneeId =
            (typeof nextRow.assignee_id === "string" && nextRow.assignee_id) ||
            (typeof nextRow.assigned_to === "string" && nextRow.assigned_to) ||
            null;

          // Atama kaldırıldıysa panodan çıkar
          if (assigneeId && assigneeId !== currentUserId) {
            const id = String(nextRow.id);
            setTasks((prev) => prev.filter((t) => t.id !== id));
            setSelectedTaskId((cur) => (cur === id ? null : cur));
            return;
          }

          if (eventType === "INSERT") {
            if (isTaskSoftDeleted(nextRow)) return;
            const mapped = mapRealtimeTaskRow(nextRow);
            const projectId = mapped.project_id;
            const meta = projectId
              ? projectMetaRef.current.get(projectId)
              : null;
            const enriched: ProjectTask = {
              ...mapped,
              project_name: meta?.project_name ?? mapped.project_name ?? null,
              workspace_name:
                meta?.workspace_name ?? mapped.workspace_name ?? null,
            };
            setTasks((prev) => {
              if (prev.some((t) => t.id === enriched.id)) return prev;
              return [enriched, ...prev];
            });
            return;
          }

          if (eventType === "UPDATE") {
            if (isTaskSoftDeleted(nextRow) || !assigneeId) {
              const id = String(nextRow.id);
              setTasks((prev) => prev.filter((t) => t.id !== id));
              setSelectedTaskId((cur) => (cur === id ? null : cur));
              return;
            }

            setTasks((prev) => {
              const existing = prev.find((t) => t.id === nextRow.id);
              const mapped = mapRealtimeTaskRow(nextRow, existing ?? null);
              const projectId = mapped.project_id;
              const meta = projectId
                ? projectMetaRef.current.get(projectId)
                : null;
              const enriched: ProjectTask = {
                ...mapped,
                project_name:
                  existing?.project_name ??
                  meta?.project_name ??
                  mapped.project_name ??
                  null,
                workspace_name:
                  existing?.workspace_name ??
                  meta?.workspace_name ??
                  mapped.workspace_name ??
                  null,
              };
              if (!existing) return [enriched, ...prev];
              return prev.map((t) => (t.id === enriched.id ? enriched : t));
            });
          }
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [currentUserId]);

  const tasksByStatus = useMemo(() => {
    const groups: Record<TaskStatus, ProjectTask[]> = {
      TODO: [],
      IN_PROGRESS: [],
      DONE: [],
    };
    for (const task of tasks) {
      groups[task.status]?.push(task);
    }
    return groups;
  }, [tasks]);

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId],
  );

  const handleStatusChange = useCallback(
    async (taskId: string, nextStatus: TaskStatus) => {
      const current = tasks.find((t) => t.id === taskId);
      if (!current || current.status === nextStatus) return;
      if (updatingId === taskId) return;

      const previousStatus = current.status;
      setUpdatingId(taskId);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t)),
      );

      const result = await updateTaskStatus(taskId, nextStatus);
      setUpdatingId(null);

      if (!result.success) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, status: previousStatus } : t,
          ),
        );
        toast.error(result.error || "Durum güncellenemedi");
        return;
      }

      toast.success(`Durum: ${TASK_STATUS_LABELS[result.status]}`);
      router.refresh();
    },
    [tasks, updatingId, router],
  );

  const handleDrop = useCallback(
    (status: TaskStatus) => {
      setDragOverStatus(null);
      if (!draggingId) return;
      void handleStatusChange(draggingId, status);
      setDraggingId(null);
    },
    [draggingId, handleStatusChange],
  );

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-3">
        {TASK_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasksByStatus[status]}
            dragOver={dragOverStatus === status}
            draggingId={draggingId}
            onDragEnter={() => setDragOverStatus(status)}
            onDragLeave={() =>
              setDragOverStatus((cur) => (cur === status ? null : cur))
            }
            onDrop={handleDrop}
            onOpenTask={setSelectedTaskId}
            onCardDragStart={setDraggingId}
            onCardDragEnd={() => {
              setDraggingId(null);
              setDragOverStatus(null);
            }}
          />
        ))}
      </div>

      {selectedTaskId ? (
        <TaskDetailSheet
          taskId={selectedTaskId}
          initialTask={selectedTask}
          open
          onOpenChange={(next) => {
            if (!next) setSelectedTaskId(null);
          }}
          onTaskUpdated={(partial) => {
            setTasks((prev) =>
              prev.map((t) =>
                t.id === partial.id
                  ? {
                      ...t,
                      ...partial,
                      project_name: t.project_name,
                      workspace_name: t.workspace_name,
                    }
                  : t,
              ),
            );
          }}
          onTaskDeleted={(taskId) => {
            setTasks((prev) => prev.filter((t) => t.id !== taskId));
            setSelectedTaskId(null);
          }}
        />
      ) : null}
    </>
  );
}
