"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  Check,
  ListTodo,
  MoreHorizontal,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { updateTaskStatus } from "@/app/actions/update-task-status";
import { DeleteTaskModal } from "@/components/delete-task-modal";
import { TaskDetailSheet } from "@/components/task-detail-sheet";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type ProjectTask,
  type TaskAssignee,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/supabase/types";
import { cleanText, emailLocalPart } from "@/lib/member-labels";
import {
  isTaskSoftDeleted,
  mapRealtimeTaskRow,
} from "@/lib/supabase/realtime";
import { createAuthedRealtimeClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type ProjectTaskBoardProps = {
  tasks: ProjectTask[];
  projectId: string;
};

type ColumnSort =
  | "priority_desc"
  | "priority_asc"
  | "date_newest"
  | "date_oldest";

type ColumnFilter = "ALL" | TaskPriority;

type ColumnPrefs = {
  sort: ColumnSort;
  filter: ColumnFilter;
};

const DEFAULT_COLUMN_PREFS: ColumnPrefs = {
  sort: "priority_desc",
  filter: "ALL",
};

const columnAccent: Record<TaskStatus, string> = {
  TODO: "border-t-muted-foreground/50",
  IN_PROGRESS: "border-t-primary",
  DONE: "border-t-emerald-500",
};

const SORT_OPTIONS: { value: ColumnSort; label: string }[] = [
  { value: "priority_desc", label: "Öncelik: Yüksek → Düşük" },
  { value: "priority_asc", label: "Öncelik: Düşük → Yüksek" },
  { value: "date_newest", label: "Tarih: En Yeni" },
  { value: "date_oldest", label: "Tarih: En Eski" },
];

const FILTER_OPTIONS: { value: ColumnFilter; label: string }[] = [
  { value: "ALL", label: "Tümü" },
  { value: "HIGH", label: "Sadece Yüksek" },
  { value: "MEDIUM", label: "Sadece Orta" },
  { value: "LOW", label: "Sadece Düşük" },
];

/** Yüksek=3, Orta=2, Düşük=1, Önceliksiz=0 */
export function getPriorityWeight(
  priority: ProjectTask["priority"] | string | null | undefined,
): number {
  if (!priority) return 0;
  const p = String(priority).trim().toUpperCase();
  if (
    p === "HIGH" ||
    p === "YUKSEK" ||
    p === "YÜKSEK" ||
    p === "URGENT" ||
    p === "ACIL"
  ) {
    return 3;
  }
  if (p === "MEDIUM" || p === "ORTA" || p === "NORMAL") {
    return 2;
  }
  if (p === "LOW" || p === "DUSUK" || p === "DÜŞÜK") {
    return 1;
  }
  if (p === "NONE" || p === "ONCELIKSIZ" || p === "ÖNCELİKSİZ") {
    return 0;
  }
  return 0;
}

function taskDateMs(task: ProjectTask): number {
  if (!task.created_at) return 0;
  const ms = new Date(task.created_at).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

function applyColumnPrefs(
  columnTasks: ProjectTask[],
  prefs: ColumnPrefs,
): ProjectTask[] {
  const filtered =
    prefs.filter === "ALL"
      ? columnTasks
      : columnTasks.filter((task) => task.priority === prefs.filter);

  const sorted = [...filtered];
  sorted.sort((a, b) => {
    switch (prefs.sort) {
      case "priority_asc":
        return getPriorityWeight(a.priority) - getPriorityWeight(b.priority);
      case "date_newest":
        return taskDateMs(b) - taskDateMs(a);
      case "date_oldest":
        return taskDateMs(a) - taskDateMs(b);
      case "priority_desc":
      default:
        return getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
    }
  });
  return sorted;
}

function priorityClass(priority: ProjectTask["priority"]): string {
  switch (priority) {
    case "HIGH":
      return "border border-red-300 bg-red-100 text-red-700 dark:border-transparent dark:bg-red-500/15 dark:text-red-400";
    case "LOW":
      return "border border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-transparent dark:bg-emerald-500/15 dark:text-emerald-400";
    default:
      return "border border-amber-300 bg-amber-100 text-amber-700 dark:border-transparent dark:bg-amber-500/15 dark:text-amber-400";
  }
}

const AssigneeBadge = memo(function AssigneeBadge({
  assignee,
}: {
  assignee?: TaskAssignee | null;
}) {
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

  const label =
    cleanText(assignee.displayName) ||
    emailLocalPart(assignee.email) ||
    cleanText(assignee.email) ||
    "";

  if (!label) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
          <UserRound className="size-3.5 text-muted-foreground/60" />
        </span>
        Atanmadı
      </span>
    );
  }

  return (
    <span
      className="inline-flex max-w-[130px] items-center gap-1.5"
      title={assignee.email ?? label}
    >
      {assignee.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={assignee.avatarUrl}
          alt={label}
          className="size-6 shrink-0 rounded-full object-cover ring-1 ring-border"
        />
      ) : (
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
          {assignee.initials && assignee.initials !== "?"
            ? assignee.initials
            : label.slice(0, 2).toUpperCase()}
        </span>
      )}
      <span className="truncate text-xs font-medium text-foreground">
        {label}
      </span>
    </span>
  );
});

const ColumnSortFilterMenu = memo(function ColumnSortFilterMenu({
  prefs,
  onChange,
}: {
  prefs: ColumnPrefs;
  onChange: (next: ColumnPrefs) => void;
}) {
  const isDefault =
    prefs.sort === DEFAULT_COLUMN_PREFS.sort &&
    prefs.filter === DEFAULT_COLUMN_PREFS.filter;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Sıralama ve filtre"
          title="Sıralama / Filtre"
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-card hover:text-foreground",
            !isDefault && "bg-primary/10 text-primary",
          )}
        >
          <ArrowUpDown className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Sıralama</DropdownMenuLabel>
        {SORT_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={(event) => {
              event.preventDefault();
              onChange({ ...prefs, sort: option.value });
            }}
          >
            <span className="flex-1">{option.label}</span>
            {prefs.sort === option.value ? (
              <Check className="size-3.5 text-primary" />
            ) : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Filtre (öncelik)</DropdownMenuLabel>
        {FILTER_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={(event) => {
              event.preventDefault();
              onChange({ ...prefs, filter: option.value });
            }}
          >
            <span className="flex-1">{option.label}</span>
            {prefs.filter === option.value ? (
              <Check className="size-3.5 text-primary" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

type TaskCardProps = {
  task: ProjectTask;
  updating: boolean;
  onOpen: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onDeleteRequest: (task: { id: string; title: string }) => void;
};

const TaskCard = memo(function TaskCard({
  task,
  updating,
  onOpen,
  onStatusChange,
  onDeleteRequest,
}: TaskCardProps) {
  return (
    <div className="rounded-lg border-2 border-border bg-card p-4 shadow-sm transition-shadow duration-150 hover:border-primary/50 hover:shadow-md dark:border dark:hover:border-primary/40">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => onOpen(task.id)}
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
              {task.subtask_done ?? 0}/{task.subtask_total} Alt Görev
            </p>
          ) : null}
        </button>
        <div className="flex shrink-0 items-start gap-1 pt-0.5">
          <AssigneeBadge assignee={task.assignee} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Görev menüsü"
                onClick={(event: MouseEvent) => event.stopPropagation()}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                onSelect={(event) => {
                  event.preventDefault();
                  onDeleteRequest({ id: task.id, title: task.title });
                }}
              >
                <Trash2 className="size-3.5" />
                Görevi Sil
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-xs font-medium",
            priorityClass(task.priority),
          )}
        >
          {TASK_PRIORITY_LABELS[task.priority] ?? TASK_PRIORITY_LABELS.MEDIUM}
        </span>
        <select
          aria-label="Görev durumu"
          value={task.status}
          disabled={updating}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            onStatusChange(task.id, event.target.value as TaskStatus);
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
  );
});

type KanbanColumnProps = {
  status: TaskStatus;
  rawCount: number;
  visible: ProjectTask[];
  prefs: ColumnPrefs;
  updatingId: string | null;
  onPrefsChange: (status: TaskStatus, next: ColumnPrefs) => void;
  onOpenTask: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onDeleteRequest: (task: { id: string; title: string }) => void;
};

const KanbanColumn = memo(function KanbanColumn({
  status,
  rawCount,
  visible,
  prefs,
  updatingId,
  onPrefsChange,
  onOpenTask,
  onStatusChange,
  onDeleteRequest,
}: KanbanColumnProps) {
  return (
    <section
      className={cn(
        "flex min-h-[280px] flex-col rounded-lg border-2 border-border border-t-4 bg-muted/40 p-3 shadow-sm dark:border dark:shadow-none",
        columnAccent[status],
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <h3 className="text-sm font-semibold text-foreground">
          {TASK_STATUS_LABELS[status]}
        </h3>
        <div className="flex items-center gap-1">
          <span className="rounded-md bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground shadow-sm">
            {prefs.filter === "ALL"
              ? rawCount
              : `${visible.length}/${rawCount}`}
          </span>
          <ColumnSortFilterMenu
            prefs={prefs}
            onChange={(next) => onPrefsChange(status, next)}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3">
        {visible.length === 0 ? (
          <p className="px-1 py-8 text-center text-xs text-muted-foreground">
            {rawCount === 0
              ? "Bu kolonda görev yok"
              : "Filtreye uyan görev yok"}
          </p>
        ) : (
          visible.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              updating={updatingId === task.id}
              onOpen={onOpenTask}
              onStatusChange={onStatusChange}
              onDeleteRequest={onDeleteRequest}
            />
          ))
        )}
      </div>
    </section>
  );
});

export function ProjectTaskBoard({
  tasks: initialTasks,
  projectId,
}: ProjectTaskBoardProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [columnPrefs, setColumnPrefs] = useState<
    Record<TaskStatus, ColumnPrefs>
  >({
    TODO: { ...DEFAULT_COLUMN_PREFS },
    IN_PROGRESS: { ...DEFAULT_COLUMN_PREFS },
    DONE: { ...DEFAULT_COLUMN_PREFS },
  });

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Realtime: project tasks
  useEffect(() => {
    const client = createAuthedRealtimeClient();
    if (!client || !projectId) return;

    const channel = client
      .channel(`project-tasks:${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `project_id=eq.${projectId}`,
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

          // Alt görevleri panoda gösterme
          if (nextRow.parent_task_id != null && nextRow.parent_task_id !== "") {
            return;
          }

          if (eventType === "INSERT") {
            if (isTaskSoftDeleted(nextRow)) return;
            const mapped = mapRealtimeTaskRow(nextRow);
            setTasks((prev) => {
              if (prev.some((t) => t.id === mapped.id)) return prev;
              return [mapped, ...prev];
            });
            return;
          }

          if (eventType === "UPDATE") {
            if (isTaskSoftDeleted(nextRow)) {
              const id = String(nextRow.id);
              setTasks((prev) => prev.filter((t) => t.id !== id));
              setSelectedTaskId((cur) => (cur === id ? null : cur));
              return;
            }

            setTasks((prev) => {
              const existing = prev.find((t) => t.id === nextRow.id);
              const mapped = mapRealtimeTaskRow(nextRow, existing ?? null);
              if (!existing) return [mapped, ...prev];
              return prev.map((t) => (t.id === mapped.id ? mapped : t));
            });
          }
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [projectId]);

  const columns = useMemo(() => {
    return TASK_STATUSES.map((status) => {
      const raw = tasks.filter((task) => task.status === status);
      const prefs = columnPrefs[status];
      const visible = applyColumnPrefs(raw, prefs);
      return { status, rawCount: raw.length, visible };
    });
  }, [tasks, columnPrefs]);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId],
  );

  const removeTaskFromBoard = useCallback(
    (taskId: string) => {
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
      if (selectedTaskId === taskId) {
        setSelectedTaskId(null);
      }
      router.refresh();
    },
    [router, selectedTaskId],
  );

  const handleStatusChange = useCallback(
    async (taskId: string, status: TaskStatus) => {
      let previous: ProjectTask[] = [];
      setTasks((prev) => {
        previous = prev;
        return prev.map((task) =>
          task.id === taskId ? { ...task, status } : task,
        );
      });
      setUpdatingId(taskId);

      const result = await updateTaskStatus(taskId, status);
      setUpdatingId(null);

      if (!result.success) {
        setTasks(previous);
        console.error(
          "[ProjectTaskBoard] updateTaskStatus failed:",
          result.error,
        );
        toast.error(result.error);
        return;
      }

      toast.success("Durum güncellendi");
      router.refresh();
    },
    [router],
  );

  const handleOpenTask = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
  }, []);

  const handleDeleteRequest = useCallback(
    (task: { id: string; title: string }) => {
      setTaskToDelete(task);
    },
    [],
  );

  const handlePrefsChange = useCallback(
    (status: TaskStatus, next: ColumnPrefs) => {
      setColumnPrefs((prev) => ({ ...prev, [status]: next }));
    },
    [],
  );

  const handleTaskUpdated = useCallback(
    (partial: Partial<ProjectTask> & { id: string }) => {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === partial.id ? { ...task, ...partial } : task,
        ),
      );
      router.refresh();
    },
    [router],
  );

  if (tasks.length === 0) {
    return (
      <>
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
              butonunu kullan. Başka bir kullanıcı eklerse kart burada anında
              görünür.
            </CardDescription>
          </CardHeader>
        </Card>
      </>
    );
  }

  return (
    <>
      <div className="grid min-w-[720px] grid-cols-1 gap-4 md:grid-cols-3">
        {columns.map(({ status, rawCount, visible }) => (
          <KanbanColumn
            key={status}
            status={status}
            rawCount={rawCount}
            visible={visible}
            prefs={columnPrefs[status]}
            updatingId={updatingId}
            onPrefsChange={handlePrefsChange}
            onOpenTask={handleOpenTask}
            onStatusChange={handleStatusChange}
            onDeleteRequest={handleDeleteRequest}
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
          onTaskUpdated={handleTaskUpdated}
          onTaskDeleted={removeTaskFromBoard}
        />
      ) : null}

      {taskToDelete ? (
        <DeleteTaskModal
          open
          onOpenChange={(next) => {
            if (!next) setTaskToDelete(null);
          }}
          task={taskToDelete}
          onDeleted={removeTaskFromBoard}
        />
      ) : null}
    </>
  );
}
