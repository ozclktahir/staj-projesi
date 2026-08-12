"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type MouseEvent,
} from "react";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpDown,
  Check,
  ListTodo,
  MoreHorizontal,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { loadMoreProjectTasks } from "@/app/actions/tasks";
import { updateTaskStatus } from "@/app/actions/update-task-status";
import { DeleteTaskModal } from "@/components/delete-task-modal";
import { TaskDetailSheet } from "@/components/task-detail-sheet";
import { onTaskAssignmentChange } from "@/lib/client-cache";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { PAGE_SIZE } from "@/lib/query-limits";
import {
  TASK_STATUSES,
  type ProjectTask,
  type TaskAssignee,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/supabase/types";
import { localizedPriority, localizedStatus } from "@/lib/localized-labels";
import { useTranslation } from "@/i18n/use-translation";
import { cleanText, emailLocalPart } from "@/lib/member-labels";
import {
  isTaskSoftDeleted,
  mapRealtimeTaskRow,
} from "@/lib/supabase/realtime";
import { createAuthedRealtimeClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { isAssignmentClaimOverdue } from "@/lib/utils";

type ProjectTaskBoardProps = {
  tasks: ProjectTask[];
  projectId: string;
  workspaceId?: string | null;
  initialHasMore?: boolean;
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

const SORT_OPTIONS: { value: ColumnSort; labelKey: string }[] = [
  { value: "priority_desc", labelKey: "projectBoard.sortPriorityDesc" },
  { value: "priority_asc", labelKey: "projectBoard.sortPriorityAsc" },
  { value: "date_newest", labelKey: "projectBoard.sortDateNewest" },
  { value: "date_oldest", labelKey: "projectBoard.sortDateOldest" },
];

const FILTER_OPTIONS: { value: ColumnFilter; labelKey: string }[] = [
  { value: "ALL", labelKey: "projectBoard.filterAll" },
  { value: "HIGH", labelKey: "projectBoard.filterHighOnly" },
  { value: "MEDIUM", labelKey: "projectBoard.filterMediumOnly" },
  { value: "LOW", labelKey: "projectBoard.filterLowOnly" },
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
  const { t } = useTranslation();
  if (!assignee) {
    return (
      <span
        className="inline-flex max-w-[120px] items-center gap-1.5 truncate text-xs text-muted-foreground/70"
        title={t("projectBoard.unassigned")}
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
          <UserRound className="size-3.5 text-muted-foreground/60" />
        </span>
        <span className="truncate">{t("projectBoard.unassigned")}</span>
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
        {t("projectBoard.unassigned")}
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
  const { t } = useTranslation();
  const isDefault =
    prefs.sort === DEFAULT_COLUMN_PREFS.sort &&
    prefs.filter === DEFAULT_COLUMN_PREFS.filter;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("projectBoard.sortFilter")}
          title={t("projectBoard.sortFilter")}
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-card hover:text-foreground",
            !isDefault && "bg-primary/10 text-primary",
          )}
        >
          <ArrowUpDown className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t("projectBoard.sort")}</DropdownMenuLabel>
        {SORT_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={(event) => {
              event.preventDefault();
              onChange({ ...prefs, sort: option.value });
            }}
          >
            <span className="flex-1">{t(option.labelKey)}</span>
            {prefs.sort === option.value ? (
              <Check className="size-3.5 text-primary" />
            ) : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t("projectBoard.filterPriority")}</DropdownMenuLabel>
        {FILTER_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={(event) => {
              event.preventDefault();
              onChange({ ...prefs, filter: option.value });
            }}
          >
            <span className="flex-1">{t(option.labelKey)}</span>
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
  const { t } = useTranslation();
  const claimPending = task.assignment_status === "pending";
  const claimOverdue =
    claimPending &&
    isAssignmentClaimOverdue(
      task.assignment_pending_at,
      task.created_at,
    );
  const deletionPending =
    task.deletion_status === "pending_admin_approval" ||
    task.deletion_status === "pending_user_approval";

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
      disabled: updating || claimPending,
    });

  const dragStyle: CSSProperties = {
    touchAction: "none",
    ...(transform
      ? {
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
          zIndex: 10,
        }
      : undefined),
  };

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(task.id)}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        onOpen(task.id);
      }}
      className={cn(
        "rounded-lg border-2 border-border bg-card p-4 shadow-sm transition-shadow duration-150 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border dark:hover:border-primary/40",
        !updating && !claimPending && "cursor-grab active:cursor-grabbing",
        claimPending && "opacity-60",
        claimOverdue && "border-red-400/80 opacity-100 ring-1 ring-red-400/40",
        isDragging && "opacity-40 shadow-lg",
      )}
    >
      <div className="mb-2 flex flex-wrap gap-1.5">
        {claimPending ? (
          <span
            className={cn(
              "rounded-md border px-2 py-0.5 text-[10px] font-semibold",
              claimOverdue
                ? "border-red-300 bg-red-100 text-red-700 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-300"
                : "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300",
            )}
          >
            {claimOverdue
              ? t("projectBoard.claimSla")
              : t("projectBoard.claimPending")}
          </span>
        ) : null}
        {deletionPending ? (
          <span className="rounded-md border border-orange-300 bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-800 dark:border-orange-500/40 dark:bg-orange-500/15 dark:text-orange-300">
            {t("projectBoard.deletionPending")}
          </span>
        ) : null}
      </div>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
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
              {t("projectBoard.subtasks", {
                done: task.subtask_done ?? 0,
                total: task.subtask_total ?? 0,
              })}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-start gap-1 pt-0.5">
          <AssigneeBadge assignee={task.assignee} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={t("projectBoard.taskMenu")}
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
                {t("projectBoard.deleteTask")}
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
          {localizedPriority(t, task.priority ?? "MEDIUM")}
        </span>
        <select
          aria-label={t("projectBoard.taskStatus")}
          value={task.status}
          disabled={updating || claimPending}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            onStatusChange(task.id, event.target.value as TaskStatus);
          }}
          className="h-8 max-w-[140px] rounded-md border border-border bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
        >
          {TASK_STATUSES.map((value) => (
            <option key={value} value={value}>
              {localizedStatus(t, value)}
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
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex min-h-[280px] flex-col rounded-lg border-2 border-border border-t-4 bg-muted/40 p-3 shadow-sm transition-colors dark:border dark:shadow-none",
        columnAccent[status],
        isOver && "bg-primary/5 ring-2 ring-primary/40",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <h3 className="text-sm font-semibold text-foreground">
          {localizedStatus(t, status)}
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
              ? t("projectBoard.emptyColumn")
              : t("projectBoard.emptyFilter")}
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
  workspaceId = null,
  initialHasMore = false,
}: ProjectTaskBoardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [tasks, setTasks] = useState(initialTasks);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 500);
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
  const pendingDeletesRef = useRef<Map<string, ProjectTask>>(new Map());

  type TaskOptimisticAction =
    | { type: "remove"; id: string }
    | { type: "restore"; task: ProjectTask }
    | { type: "status"; id: string; status: TaskStatus };

  const [optimisticTasks, applyTaskOptimistic] = useOptimistic(
    tasks,
    (state, action: TaskOptimisticAction) => {
      switch (action.type) {
        case "remove":
          return state.filter((t) => t.id !== action.id);
        case "restore":
          if (state.some((t) => t.id === action.task.id)) return state;
          return [action.task, ...state];
        case "status":
          return state.map((t) =>
            t.id === action.id ? { ...t, status: action.status } : t,
          );
        default:
          return state;
      }
    },
  );

  useEffect(() => {
    setTasks(initialTasks);
    setHasMore(initialHasMore);
  }, [initialTasks, initialHasMore]);

  useEffect(() => {
    const taskId = searchParams.get("taskId")?.trim() || null;
    if (!taskId) return;
    setSelectedTaskId(taskId);
  }, [searchParams]);

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
            if (
              String(nextRow.assignment_status ?? "").toLowerCase() ===
              "rejected"
            ) {
              return;
            }
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

            const assignmentStatus = String(
              nextRow.assignment_status ?? "",
            ).toLowerCase();
            if (assignmentStatus === "rejected") {
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

  // Task claim kabul/red bildirim menüsünden geldiğinde board'u anında güncelle
  // (router.refresh()/realtime beklemeden — bkz. client-cache.ts).
  useEffect(() => {
    return onTaskAssignmentChange((event) => {
      if (event.kind === "accepted") {
        setTasks((prev) =>
          prev.map((task) =>
            task.id === event.taskId
              ? {
                  ...task,
                  assignment_status: "accepted",
                  assignment_pending_at: null,
                }
              : task,
          ),
        );
      } else {
        setTasks((prev) => prev.filter((task) => task.id !== event.taskId));
        setSelectedTaskId((cur) => (cur === event.taskId ? null : cur));
      }
    });
  }, []);

  const columns = useMemo(() => {
    const q = debouncedSearch.trim().toLocaleLowerCase("tr-TR");
    const source = q
      ? optimisticTasks.filter((task) =>
          task.title.toLocaleLowerCase("tr-TR").includes(q),
        )
      : optimisticTasks;
    return TASK_STATUSES.map((status) => {
      const raw = source.filter((task) => task.status === status);
      const prefs = columnPrefs[status];
      const visible = applyColumnPrefs(raw, prefs);
      return { status, rawCount: raw.length, visible };
    });
  }, [optimisticTasks, columnPrefs, debouncedSearch]);

  const selectedTask = useMemo(
    () => optimisticTasks.find((task) => task.id === selectedTaskId) ?? null,
    [optimisticTasks, selectedTaskId],
  );

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    startTransition(() => {
      void (async () => {
        try {
          const result = await loadMoreProjectTasks(
            projectId,
            workspaceId,
            tasks.length,
          );
          if (!result.success) {
            toast.error(result.error ?? t("projectBoard.loadMoreFailed"));
            return;
          }
          setTasks((prev) => {
            const seen = new Set(prev.map((t) => t.id));
            const merged = [...prev];
            for (const task of result.tasks) {
              if (!seen.has(task.id)) merged.push(task);
            }
            return merged;
          });
          setHasMore(result.hasMore);
        } finally {
          setLoadingMore(false);
        }
      })();
    });
  }, [
    hasMore,
    loadingMore,
    projectId,
    tasks.length,
    workspaceId,
  ]);

  const removeTaskFromBoard = useCallback(
    (taskId: string) => {
      setTasks((prev) => {
        const found = prev.find((task) => task.id === taskId);
        if (found) pendingDeletesRef.current.set(taskId, found);
        return prev.filter((task) => task.id !== taskId);
      });
      startTransition(() => {
        applyTaskOptimistic({ type: "remove", id: taskId });
      });
      if (selectedTaskId === taskId) {
        setSelectedTaskId(null);
      }
    },
    [selectedTaskId],
  );

  const restoreTaskToBoard = useCallback(
    (task: { id: string; title: string }) => {
      const restored =
        pendingDeletesRef.current.get(task.id) ??
        ({
          id: task.id,
          title: task.title,
          status: "TODO",
          priority: "MEDIUM",
          project_id: projectId,
        } as ProjectTask);
      pendingDeletesRef.current.delete(task.id);

      setTasks((prev) => {
        if (prev.some((t) => t.id === restored.id)) return prev;
        return [restored, ...prev];
      });
      startTransition(() => {
        applyTaskOptimistic({ type: "restore", task: restored });
      });
    },
    [projectId],
  );

  const handleStatusChange = useCallback(
    (taskId: string, status: TaskStatus) => {
      setUpdatingId(taskId);
      startTransition(() => {
        applyTaskOptimistic({ type: "status", id: taskId, status });
        void (async () => {
          const result = await updateTaskStatus(taskId, status);
          setUpdatingId(null);

          if (!result.success) {
            console.error(
              "[ProjectTaskBoard] updateTaskStatus failed:",
              result.error,
            );
            toast.error(result.error);
            return;
          }

          setTasks((prev) =>
            prev.map((task) =>
              task.id === taskId ? { ...task, status } : task,
            ),
          );
          toast.success(t("projectBoard.statusUpdated"));
        })();
      });
    },
    [],
  );

  const handleOpenTask = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
  }, []);

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const taskId = String(active.id);
      const nextStatus = String(over.id) as TaskStatus;
      const currentTask = optimisticTasks.find((task) => task.id === taskId);
      if (!currentTask || currentTask.status === nextStatus) return;

      handleStatusChange(taskId, nextStatus);
    },
    [optimisticTasks, handleStatusChange],
  );

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

  if (optimisticTasks.length === 0) {
    return (
      <>
        <Card className="rounded-lg border-dashed border-border bg-card/60">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex size-12 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <ListTodo className="size-6" />
            </div>
            <CardTitle className="text-lg text-foreground">
              {t("projectBoard.emptyTitle")}
            </CardTitle>
            <CardDescription className="max-w-md">
              {t("projectBoard.emptyHint")}
            </CardDescription>
          </CardHeader>
        </Card>
      </>
    );
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("projectBoard.searchPlaceholder")}
          className="h-9 max-w-sm"
          aria-label={t("projectBoard.searchAria")}
        />
        {hasMore ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loadingMore}
            onClick={handleLoadMore}
          >
            {loadingMore
              ? t("projectBoard.loadingMore")
              : t("projectBoard.loadMore")}
          </Button>
        ) : null}
        <span className="text-xs text-muted-foreground">
          {t("projectBoard.taskCount", { n: optimisticTasks.length })}
        </span>
      </div>
      <DndContext sensors={dndSensors} onDragEnd={handleDragEnd}>
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
      </DndContext>

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
          onDeleteFailed={restoreTaskToBoard}
        />
      ) : null}
    </>
  );
}
