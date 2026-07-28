"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type DragEvent,
} from "react";
import {
  CalendarDays,
  Check,
  CheckSquare,
  Download,
  Flag,
  ImageIcon,
  ListTodo,
  Loader2,
  NotebookPen,
  Plus,
  RotateCcw,
  StickyNote,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import {
  createPersonalNote,
  createPersonalTodo,
  deletePersonalFile,
  deletePersonalNote,
  deletePersonalTodo,
  toggleNoteCompletion,
  togglePersonalTodo,
  updatePersonalNote,
  uploadPersonalFile,
} from "@/app/actions/personal";
import { TaskDetailSheet } from "@/components/task-detail-sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslation } from "@/i18n/use-translation";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type ProjectTask,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/supabase/types";
import type {
  AssignedTaskWithSubtasks,
  PersonalFile,
  PersonalNote,
  PersonalTodo,
} from "@/types/personal-workspace";
import { cn } from "@/lib/utils";

type TabId = "assigned" | "notes" | "todos" | "files";

const TABS: { id: TabId; label: string; icon: typeof StickyNote }[] = [
  { id: "assigned", label: "Atanan Görevler", icon: ListTodo },
  { id: "notes", label: "Not Defteri", icon: NotebookPen },
  { id: "todos", label: "Yapılacaklar", icon: CheckSquare },
  { id: "files", label: "Dosyalar", icon: Upload },
];

const PROJECT_BADGE_COLORS = [
  "border-violet-300 bg-violet-100 text-violet-800 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-300",
  "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300",
  "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300",
  "border-pink-300 bg-pink-100 text-pink-800 dark:border-pink-500/40 dark:bg-pink-500/15 dark:text-pink-300",
  "border-sky-300 bg-sky-100 text-sky-800 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-300",
  "border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-300",
];

function projectBadgeClass(projectId: string | null | undefined): string {
  if (!projectId) return PROJECT_BADGE_COLORS[0];
  let hash = 0;
  for (let i = 0; i < projectId.length; i += 1) {
    hash =
      (hash + projectId.charCodeAt(i) * (i + 1)) % PROJECT_BADGE_COLORS.length;
  }
  return PROJECT_BADGE_COLORS[hash] ?? PROJECT_BADGE_COLORS[0];
}

function statusClass(status: TaskStatus): string {
  switch (status) {
    case "DONE":
      return "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300";
    case "IN_PROGRESS":
      return "border-indigo-300 bg-indigo-100 text-indigo-800 dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-300";
    default:
      return "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300";
  }
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

function formatNoteDateTime(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const pad = (n: number) => String(n).padStart(2, "0");
  // gg.aa.yyyy ss:dd
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatTaskDue(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatBytes(size: number | null): string {
  if (size == null || Number.isNaN(size)) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function dueTone(dueDate: string | null, completed: boolean): {
  label: string;
  className: string;
} | null {
  if (!dueDate || completed) return null;
  const due = new Date(`${dueDate}T12:00:00`);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const diff = Math.ceil(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff < 0) {
    return {
      label: `${Math.abs(diff)} gün gecikmiş`,
      className:
        "border-red-300 bg-red-100 text-red-700 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-300",
    };
  }
  if (diff === 0) {
    return {
      label: "Bugün",
      className:
        "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300",
    };
  }
  if (diff <= 2) {
    return {
      label: `${diff} gün kaldı`,
      className:
        "border-orange-300 bg-orange-100 text-orange-800 dark:border-orange-500/40 dark:bg-orange-500/15 dark:text-orange-300",
    };
  }
  return {
    label: due.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
    }),
    className:
      "border-border bg-muted/50 text-muted-foreground",
  };
}

function isImageName(name: string): boolean {
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name);
}

export function PersonalWorkspace({
  initialAssignedTasks,
  initialNotes,
  initialTodos,
  initialFiles,
}: {
  initialAssignedTasks: AssignedTaskWithSubtasks[];
  initialNotes: PersonalNote[];
  initialTodos: PersonalTodo[];
  initialFiles: PersonalFile[];
}) {
  const { t } = useTranslation();
  const [, startTransition] = useTransition();
  const [tab, setTab] = useState<TabId>("assigned");
  const [assignedTasks, setAssignedTasks] = useState(initialAssignedTasks);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [notes, setNotes] = useState(initialNotes);
  const [todos, setTodos] = useState(initialTodos);
  const [files, setFiles] = useState(initialFiles);

  useEffect(() => {
    setAssignedTasks(initialAssignedTasks);
  }, [initialAssignedTasks]);
  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);
  useEffect(() => {
    setTodos(initialTodos);
  }, [initialTodos]);
  useEffect(() => {
    setFiles(initialFiles);
  }, [initialFiles]);

  type NoteOptimisticAction =
    | { type: "delete"; id: string }
    | { type: "toggle"; id: string; isCompleted: boolean };

  type TodoOptimisticAction =
    | { type: "delete"; id: string }
    | { type: "toggle"; id: string; isCompleted: boolean };

  const [optimisticNotes, applyNoteOptimistic] = useOptimistic(
    notes,
    (state, action: NoteOptimisticAction) => {
      if (action.type === "delete") {
        return state.filter((n) => n.id !== action.id);
      }
      return state.map((n) =>
        n.id === action.id ? { ...n, isCompleted: action.isCompleted } : n,
      );
    },
  );

  const [optimisticTodos, applyTodoOptimistic] = useOptimistic(
    todos,
    (state, action: TodoOptimisticAction) => {
      if (action.type === "delete") {
        return state.filter((item) => item.id !== action.id);
      }
      return state.map((item) =>
        item.id === action.id
          ? { ...item, isCompleted: action.isCompleted }
          : item,
      );
    },
  );

  const [priorityFilter, setPriorityFilter] = useState<"all" | TaskPriority>(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [dateFilter, setDateFilter] = useState<
    "all" | "hasDue" | "noDue" | "overdue"
  >("all");

  const selectedTask = useMemo(
    () =>
      assignedTasks.find(
        (t) => t.id === selectedTaskId && !t.id.startsWith("todo:"),
      ) ?? null,
    [assignedTasks, selectedTaskId],
  );

  const activeTasksForNotes = useMemo(
    () =>
      assignedTasks.filter(
        (task) =>
          !task.id.startsWith("todo:") &&
          task.status !== "DONE" &&
          task.assignment_status !== "rejected",
      ),
    [assignedTasks],
  );

  const filteredAssigned = useMemo(() => {
    const now = Date.now();
    return assignedTasks.filter((task) => {
      if (priorityFilter !== "all" && task.priority !== priorityFilter) {
        return false;
      }
      if (statusFilter !== "all" && task.status !== statusFilter) {
        return false;
      }
      if (dateFilter === "hasDue" && !task.due_date) return false;
      if (dateFilter === "noDue" && task.due_date) return false;
      if (dateFilter === "overdue") {
        if (!task.due_date || task.status === "DONE") return false;
        const due = new Date(task.due_date).getTime();
        if (Number.isNaN(due) || due >= now) return false;
      }
      return true;
    });
  }, [assignedTasks, priorityFilter, statusFilter, dateFilter]);

  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteTaskId, setNoteTaskId] = useState<string>("none");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteBusy, setNoteBusy] = useState(false);
  const [notePendingId, setNotePendingId] = useState<string | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<PersonalNote | null>(null);

  const [todoText, setTodoText] = useState("");
  const [todoDue, setTodoDue] = useState("");
  const [todoBusy, setTodoBusy] = useState(false);
  const [todoActionId, setTodoActionId] = useState<string | null>(null);

  const [fileBusy, setFileBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sortedTodos = useMemo(() => {
    return [...optimisticTodos].sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }
      return 0;
    });
  }, [optimisticTodos]);

  const resetNoteForm = useCallback(() => {
    setEditingNoteId(null);
    setNoteTitle("");
    setNoteContent("");
    setNoteTaskId("none");
  }, []);

  async function handleSaveNote() {
    if (noteBusy) return;
    setNoteBusy(true);
    const linkedTaskId = noteTaskId === "none" ? null : noteTaskId;
    const linkedTaskTitle =
      activeTasksForNotes.find((task) => task.id === linkedTaskId)?.title ??
      null;
    try {
      if (editingNoteId) {
        const result = await updatePersonalNote({
          id: editingNoteId,
          title: noteTitle,
          content: noteContent,
          taskId: linkedTaskId,
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        setNotes((prev) =>
          prev.map((n) =>
            n.id === editingNoteId
              ? {
                  ...n,
                  title: noteTitle.trim() || t("notes.untitled"),
                  content: noteContent.trim(),
                  taskId: linkedTaskId,
                  taskTitle: linkedTaskTitle,
                  updatedAt: new Date().toISOString(),
                }
              : n,
          ),
        );
        toast.success(t("notes.updated"));
        resetNoteForm();
        return;
      }

      const result = await createPersonalNote({
        title: noteTitle,
        content: noteContent,
        taskId: linkedTaskId,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setNotes((prev) => [result.note, ...prev]);
      toast.success(t("notes.saved"));
      resetNoteForm();
    } catch (error) {
      console.error("[PersonalWorkspace] note save:", error);
      toast.error(t("notes.saveError"));
    } finally {
      setNoteBusy(false);
    }
  }

  function onSaveNoteClick() {
    startTransition(() => {
      void handleSaveNote();
    });
  }

  function onDeleteNoteClick(id: string) {
    const note = optimisticNotes.find((n) => n.id === id) ?? null;
    setNoteToDelete(note);
  }

  function onConfirmDeleteNote() {
    if (!noteToDelete) return;
    const id = noteToDelete.id;
    setNoteToDelete(null);
    startTransition(() => {
      applyNoteOptimistic({ type: "delete", id });
      void (async () => {
        try {
          const result = await deletePersonalNote(id);
          if (!result.success) {
            toast.error(result.error);
            return;
          }
          setNotes((prev) => prev.filter((n) => n.id !== id));
          if (editingNoteId === id) resetNoteForm();
          toast.success(t("notes.deleted"));
        } catch (error) {
          console.error("[PersonalWorkspace] note delete:", error);
          toast.error(t("notes.saveError"));
        }
      })();
    });
  }

  function handleToggleNoteCompletion(note: PersonalNote) {
    if (notePendingId) return;
    const next = !note.isCompleted;
    setNotePendingId(note.id);
    startTransition(() => {
      applyNoteOptimistic({
        type: "toggle",
        id: note.id,
        isCompleted: next,
      });
      void (async () => {
        try {
          const result = await toggleNoteCompletion(note.id, next);
          if (!result.success) {
            toast.error(result.error);
            return;
          }
          setNotes((prev) =>
            prev.map((n) =>
              n.id === note.id ? { ...n, isCompleted: next } : n,
            ),
          );
        } catch (error) {
          console.error("[PersonalWorkspace] note toggle:", error);
          toast.error(t("notes.saveError"));
        } finally {
          setNotePendingId(null);
        }
      })();
    });
  }

  async function handleAddTodo() {
    if (!todoText.trim() || todoBusy) return;
    setTodoBusy(true);
    try {
      const result = await createPersonalTodo({
        task: todoText,
        dueDate: todoDue || null,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setTodos((prev) => [result.todo, ...prev]);
      setTodoText("");
      setTodoDue("");
      toast.success("Görev eklendi");
    } catch (error) {
      console.error("[PersonalWorkspace] todo create:", error);
      toast.error("Görev eklenirken bir hata oluştu.");
    } finally {
      setTodoBusy(false);
    }
  }

  function handleToggleTodo(todo: PersonalTodo) {
    if (todoActionId) return;
    const next = !todo.isCompleted;
    setTodoActionId(todo.id);
    startTransition(() => {
      applyTodoOptimistic({
        type: "toggle",
        id: todo.id,
        isCompleted: next,
      });
      void (async () => {
        try {
          const result = await togglePersonalTodo(todo.id, next);
          if (!result.success) {
            toast.error(result.error);
            return;
          }
          setTodos((prev) =>
            prev.map((item) =>
              item.id === todo.id ? { ...item, isCompleted: next } : item,
            ),
          );
        } catch (error) {
          console.error("[PersonalWorkspace] todo toggle:", error);
          toast.error("Görev güncellenirken bir hata oluştu.");
        } finally {
          setTodoActionId(null);
        }
      })();
    });
  }

  function handleDeleteTodo(id: string) {
    if (todoActionId) return;
    setTodoActionId(id);
    startTransition(() => {
      applyTodoOptimistic({ type: "delete", id });
      void (async () => {
        try {
          const result = await deletePersonalTodo(id);
          if (!result.success) {
            toast.error(result.error);
            return;
          }
          setTodos((prev) => prev.filter((item) => item.id !== id));
          toast.success("Görev silindi");
        } catch (error) {
          console.error("[PersonalWorkspace] todo delete:", error);
          toast.error("Görev silinirken bir hata oluştu.");
        } finally {
          setTodoActionId(null);
        }
      })();
    });
  }

  const uploadFiles = useCallback(
    async (list: FileList | File[] | null) => {
      if (!list || fileBusy) return;
      const items = Array.from(list);
      if (!items.length) return;

      setFileBusy(true);
      try {
        for (const file of items) {
          const formData = new FormData();
          formData.append("file", file);
          const result = await uploadPersonalFile(formData);
          if (!result.success) {
            toast.error(result.error);
            continue;
          }
          setFiles((prev) => [result.file, ...prev]);
        }
        toast.success("Dosya yüklendi");
      } catch (error) {
        console.error("[PersonalWorkspace] upload:", error);
        toast.error("Dosya yüklenirken bir hata oluştu.");
      } finally {
        setFileBusy(false);
      }
    },
    [fileBusy],
  );

  function handleDeleteFile(id: string) {
    const previous = files;
    setFiles((prev) => prev.filter((f) => f.id !== id));
    startTransition(() => {
      void (async () => {
        try {
          const result = await deletePersonalFile(id);
          if (!result.success) {
            setFiles(previous);
            toast.error(result.error);
            return;
          }
          toast.success("Dosya silindi");
        } catch (error) {
          console.error("[PersonalWorkspace] file delete:", error);
          setFiles(previous);
          toast.error("Dosya silinirken bir hata oluştu.");
        }
      })();
    });
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragOver(false);
    void uploadFiles(event.dataTransfer.files);
  }

  return (
    <div className="flex flex-col gap-5">
      <div
        className="flex flex-wrap gap-2 rounded-lg border border-border bg-card p-1.5 shadow-sm"
        role="tablist"
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors sm:flex-none",
              tab === id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "assigned" ? (
        <div className="space-y-3">
          <Card className="rounded-lg border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ListTodo className="size-4 text-primary" />
                {t("assigned.title")}
              </CardTitle>
              <CardDescription>{t("assigned.description")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Select
                value={priorityFilter}
                onValueChange={(v) =>
                  setPriorityFilter(v as "all" | TaskPriority)
                }
              >
                <SelectTrigger className="w-[160px]" size="sm">
                  <SelectValue placeholder={t("assigned.filterPriority")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("assigned.allPriorities")}</SelectItem>
                  <SelectItem value="HIGH">{TASK_PRIORITY_LABELS.HIGH}</SelectItem>
                  <SelectItem value="MEDIUM">
                    {TASK_PRIORITY_LABELS.MEDIUM}
                  </SelectItem>
                  <SelectItem value="LOW">{TASK_PRIORITY_LABELS.LOW}</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={statusFilter}
                onValueChange={(v) =>
                  setStatusFilter(v as "all" | TaskStatus)
                }
              >
                <SelectTrigger className="w-[160px]" size="sm">
                  <SelectValue placeholder={t("assigned.filterStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("assigned.allStatuses")}</SelectItem>
                  <SelectItem value="TODO">{TASK_STATUS_LABELS.TODO}</SelectItem>
                  <SelectItem value="IN_PROGRESS">
                    {TASK_STATUS_LABELS.IN_PROGRESS}
                  </SelectItem>
                  <SelectItem value="DONE">{TASK_STATUS_LABELS.DONE}</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={dateFilter}
                onValueChange={(v) =>
                  setDateFilter(
                    v as "all" | "hasDue" | "noDue" | "overdue",
                  )
                }
              >
                <SelectTrigger className="w-[160px]" size="sm">
                  <SelectValue placeholder={t("assigned.filterDate")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("assigned.allDates")}</SelectItem>
                  <SelectItem value="hasDue">{t("assigned.hasDue")}</SelectItem>
                  <SelectItem value="noDue">{t("assigned.noDueFilter")}</SelectItem>
                  <SelectItem value="overdue">{t("assigned.overdue")}</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {filteredAssigned.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card/60 px-4 py-12 text-center text-sm text-muted-foreground">
              {t("assigned.empty")}
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {filteredAssigned.map((task) => {
                const projectLabel =
                  task.project_name?.trim() || t("common.project");
                const dueLabel = formatTaskDue(task.due_date);
                const isTodoItem = task.id.startsWith("todo:");
                return (
                  <AccordionItem
                    key={task.id}
                    value={task.id}
                    className="rounded-lg border border-border bg-card px-3 shadow-sm"
                  >
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex min-w-0 flex-1 flex-col gap-2 pr-2 text-left">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <span
                              className={cn(
                                "mb-1.5 inline-flex max-w-full truncate rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                                projectBadgeClass(task.project_id),
                              )}
                            >
                              {projectLabel}
                            </span>
                            <p className="text-sm font-semibold text-foreground">
                              {task.title}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium",
                              statusClass(task.status),
                            )}
                          >
                            {TASK_STATUS_LABELS[task.status]}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 font-medium",
                              priorityClass(task.priority),
                            )}
                          >
                            <Flag className="size-3.5" />
                            {TASK_PRIORITY_LABELS[task.priority] ??
                              TASK_PRIORITY_LABELS.MEDIUM}
                          </span>
                          {dueLabel ? (
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="size-3.5" />
                              {dueLabel}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/70">
                              {t("assigned.noDue")}
                            </span>
                          )}
                          {!isTodoItem && task.subtasks?.length ? (
                            <Badge variant="outline" className="text-[10px]">
                              {task.subtasks.length} {t("assigned.subtasks")}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        {!isTodoItem ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedTaskId(task.id)}
                          >
                            Detay
                          </Button>
                        ) : null}
                        {!isTodoItem ? (
                          task.subtasks?.length ? (
                            <ul className="space-y-1.5 rounded-md border border-border bg-muted/30 p-2">
                              {task.subtasks.map((sub) => (
                                <li
                                  key={sub.id}
                                  className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm"
                                >
                                  <span className="truncate">{sub.title}</span>
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px]"
                                    >
                                      {TASK_PRIORITY_LABELS[sub.priority]}
                                    </Badge>
                                    <Badge
                                      variant="outline"
                                      className="text-[10px]"
                                    >
                                      {TASK_STATUS_LABELS[sub.status]}
                                    </Badge>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {t("assigned.noSubtasks")}
                            </p>
                          )
                        ) : null}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}

          {selectedTaskId && selectedTask ? (
            <TaskDetailSheet
              taskId={selectedTaskId}
              initialTask={selectedTask}
              open
              onOpenChange={(next) => {
                if (!next) setSelectedTaskId(null);
              }}
              onTaskUpdated={(partial) => {
                setAssignedTasks((prev) =>
                  prev.map((t) =>
                    t.id === partial.id
                      ? {
                          ...t,
                          ...partial,
                          project_name: t.project_name,
                          workspace_name: t.workspace_name,
                          subtasks: t.subtasks,
                        }
                      : t,
                  ),
                );
              }}
              onTaskDeleted={(taskId) => {
                setAssignedTasks((prev) =>
                  prev.filter((t) => t.id !== taskId),
                );
                setSelectedTaskId(null);
              }}
            />
          ) : null}
        </div>
      ) : null}

      {tab === "notes" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <Card className="rounded-lg border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <StickyNote className="size-4 text-primary" />
                {editingNoteId ? t("notes.editNote") : t("notes.newNote")}
              </CardTitle>
              <CardDescription>{t("notes.privateDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="note-title">{t("notes.title")}</Label>
                <Input
                  id="note-title"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder={t("notes.titlePlaceholder")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="note-content">{t("notes.content")}</Label>
                <textarea
                  id="note-content"
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={8}
                  placeholder={t("notes.contentPlaceholder")}
                  className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("notes.linkTask")}</Label>
                <Select value={noteTaskId} onValueChange={setNoteTaskId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("notes.independent")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("notes.independent")}</SelectItem>
                    {activeTasksForNotes.map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title}
                        {task.project_name ? ` · ${task.project_name}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={noteBusy || (!noteTitle.trim() && !noteContent.trim())}
                  onClick={() => onSaveNoteClick()}
                  className="gap-2"
                >
                  {noteBusy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  {editingNoteId ? t("notes.update") : t("notes.add")}
                </Button>
                {editingNoteId ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={noteBusy}
                    onClick={resetNoteForm}
                  >
                    {t("notes.cancel")}
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {optimisticNotes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card/60 px-4 py-12 text-center text-sm text-muted-foreground">
                {t("notes.empty")}
              </div>
            ) : (
              optimisticNotes.map((note) => (
                <Card
                  key={note.id}
                  className={cn(
                    "rounded-lg border-border shadow-sm",
                    note.isCompleted && "opacity-80",
                  )}
                >
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {note.taskId && note.taskTitle ? (
                          <Badge
                            variant="secondary"
                            className="max-w-full truncate text-[11px]"
                          >
                            {t("notes.linkedBadge", { task: note.taskTitle })}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[11px]">
                            {t("notes.independent")}
                          </Badge>
                        )}
                      </div>
                      <time className="shrink-0 text-xs text-muted-foreground">
                        {formatNoteDateTime(
                          note.updatedAt ?? note.createdAt,
                        )}
                      </time>
                    </div>

                    <button
                      type="button"
                      className={cn(
                        "w-full space-y-1 text-left",
                        note.isCompleted && "line-through opacity-60",
                      )}
                      onClick={() => {
                        setEditingNoteId(note.id);
                        setNoteTitle(note.title);
                        setNoteContent(note.content);
                        setNoteTaskId(note.taskId ?? "none");
                      }}
                    >
                      <p className="truncate text-sm font-semibold text-foreground">
                        {note.title || t("notes.untitled")}
                      </p>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {note.content || "—"}
                      </p>
                    </button>

                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={notePendingId === note.id || noteBusy}
                        onClick={() => {
                          startTransition(() => {
                            void handleToggleNoteCompletion(note);
                          });
                        }}
                        className="gap-1.5"
                        aria-label={
                          note.isCompleted ? "Geri Al" : "Tamamla"
                        }
                      >
                        {notePendingId === note.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : note.isCompleted ? (
                          <RotateCcw className="size-3.5" />
                        ) : (
                          <Check className="size-3.5" />
                        )}
                        {note.isCompleted ? "Geri Al" : "Tamamla"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={noteBusy}
                        onClick={() => onDeleteNoteClick(note.id)}
                        className="gap-1.5 text-destructive hover:text-destructive"
                        aria-label="Sil"
                      >
                        <Trash2 className="size-3.5" />
                        Sil
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      ) : null}

      <Dialog
        open={Boolean(noteToDelete)}
        onOpenChange={(open) => {
          if (!open) setNoteToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notu sil</DialogTitle>
            <DialogDescription>
              “{noteToDelete?.title || t("notes.untitled")}” notunu silmek
              istediğine emin misin? Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setNoteToDelete(null)}
            >
              İptal
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={noteBusy}
              onClick={() => onConfirmDeleteNote()}
            >
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {tab === "todos" ? (
        <div className="space-y-2">
          <Card className="rounded-lg border-border shadow-sm">
            <CardHeader className="space-y-1 p-3 pb-1">
              <CardTitle className="flex items-center gap-1.5 text-sm">
                <CalendarDays className="size-3.5 text-primary" />
                Akıllı yapılacaklar
              </CardTitle>
              <CardDescription className="text-xs">
                Teslim tarihi yaklaşan veya geçmiş görevler vurgulanır
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 p-3 pt-2 sm:flex-row sm:items-center">
              <Input
                value={todoText}
                onChange={(e) => setTodoText(e.target.value)}
                placeholder="Yeni kişisel görev…"
                className="h-8 flex-1 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleAddTodo();
                  }
                }}
              />
              <Input
                type="date"
                value={todoDue}
                onChange={(e) => setTodoDue(e.target.value)}
                className="h-8 w-full text-sm sm:w-36"
              />
              <Button
                type="button"
                size="sm"
                disabled={todoBusy || !todoText.trim()}
                onClick={() => {
                  startTransition(() => {
                    void handleAddTodo();
                  });
                }}
                className="h-8 gap-1.5"
              >
                {todoBusy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Plus className="size-3.5" />
                )}
                Ekle
              </Button>
            </CardContent>
          </Card>

          {sortedTodos.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card/60 px-3 py-6 text-center text-xs text-muted-foreground">
              Henüz kişisel görev yok.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {sortedTodos.map((todo) => {
                const tone = dueTone(todo.dueDate, todo.isCompleted);
                return (
                  <li
                    key={todo.id}
                    className={cn(
                      "flex items-start gap-2 rounded-md border border-border bg-card px-2.5 py-2 shadow-sm",
                      todo.isCompleted && "opacity-70",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={todo.isCompleted}
                      disabled={todoActionId === todo.id}
                      onChange={() => {
                        startTransition(() => {
                          void handleToggleTodo(todo);
                        });
                      }}
                      className="mt-0.5 size-3.5 rounded border-border accent-primary"
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-xs font-medium text-foreground",
                          todo.isCompleted &&
                            "text-muted-foreground line-through",
                        )}
                      >
                        {todo.task}
                      </p>
                      {tone ? (
                        <span
                          className={cn(
                            "mt-1 inline-flex rounded border px-1.5 py-0.5 text-[10px] font-medium",
                            tone.className,
                          )}
                        >
                          {tone.label}
                        </span>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      disabled={todoActionId === todo.id}
                      onClick={() => {
                        startTransition(() => {
                          void handleDeleteTodo(todo.id);
                        });
                      }}
                      className="size-7 text-destructive hover:text-destructive"
                      aria-label="Görevi sil"
                    >
                      {todoActionId === todo.id ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Trash2 className="size-3" />
                      )}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}

      {tab === "files" ? (
        <div className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors",
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border bg-card/60",
              fileBusy && "opacity-70",
            )}
          >
            <Upload className="size-8 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Dosya veya fotoğraf sürükle-bırak
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Maks. 25 MB · yalnızca senin hesabına özel
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                void uploadFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={fileBusy}
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              {fileBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Dosya seç
            </Button>
          </div>

          {files.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              Henüz yüklenmiş dosya yok.
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {files.map((file) => (
                <li
                  key={file.id}
                  className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
                >
                  <div className="flex h-32 items-center justify-center bg-muted/40">
                    {isImageName(file.fileName) && file.fileUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={file.fileUrl}
                        alt={file.fileName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="size-10 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="space-y-2 p-3">
                    <p className="truncate text-sm font-medium text-foreground">
                      {file.fileName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[
                        formatBytes(file.fileSize),
                        file.createdAt
                          ? new Date(file.createdAt).toLocaleDateString("tr-TR")
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1.5"
                        asChild
                      >
                        <a
                          href={file.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          download={file.fileName}
                        >
                          <Download className="size-3.5" />
                          İndir
                        </a>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={fileBusy}
                        onClick={() => {
                          startTransition(() => {
                            void handleDeleteFile(file.id);
                          });
                        }}
                        className="text-destructive hover:text-destructive"
                        aria-label="Dosyayı sil"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
