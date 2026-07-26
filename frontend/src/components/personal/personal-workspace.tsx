"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import {
  CalendarDays,
  CheckSquare,
  Download,
  FileText,
  Flag,
  ImageIcon,
  ListTodo,
  Loader2,
  NotebookPen,
  Plus,
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
  togglePersonalTodo,
  updatePersonalNote,
  uploadPersonalFile,
  type PersonalFile,
  type PersonalNote,
  type PersonalTodo,
} from "@/app/actions/personal";
import { TaskDetailSheet } from "@/components/task-detail-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type ProjectTask,
  type TaskStatus,
} from "@/lib/supabase/types";
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
  initialAssignedTasks: ProjectTask[];
  initialNotes: PersonalNote[];
  initialTodos: PersonalTodo[];
  initialFiles: PersonalFile[];
}) {
  const [tab, setTab] = useState<TabId>("assigned");
  const [assignedTasks, setAssignedTasks] = useState(initialAssignedTasks);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [notes, setNotes] = useState(initialNotes);
  const [todos, setTodos] = useState(initialTodos);
  const [files, setFiles] = useState(initialFiles);

  const selectedTask = useMemo(
    () => assignedTasks.find((t) => t.id === selectedTaskId) ?? null,
    [assignedTasks, selectedTaskId],
  );

  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteBusy, setNoteBusy] = useState(false);

  const [todoText, setTodoText] = useState("");
  const [todoDue, setTodoDue] = useState("");
  const [todoBusy, setTodoBusy] = useState(false);
  const [todoActionId, setTodoActionId] = useState<string | null>(null);

  const [fileBusy, setFileBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sortedTodos = useMemo(() => {
    return [...todos].sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }
      return 0;
    });
  }, [todos]);

  const resetNoteForm = useCallback(() => {
    setEditingNoteId(null);
    setNoteTitle("");
    setNoteContent("");
  }, []);

  async function handleSaveNote() {
    if (noteBusy) return;
    setNoteBusy(true);
    try {
      if (editingNoteId) {
        const result = await updatePersonalNote({
          id: editingNoteId,
          title: noteTitle,
          content: noteContent,
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
                  title: noteTitle.trim() || "Başlıksız not",
                  content: noteContent.trim(),
                  updatedAt: new Date().toISOString(),
                }
              : n,
          ),
        );
        toast.success("Not güncellendi");
        resetNoteForm();
        return;
      }

      const result = await createPersonalNote({
        title: noteTitle,
        content: noteContent,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setNotes((prev) => [result.note, ...prev]);
      toast.success("Not eklendi");
      resetNoteForm();
    } catch (error) {
      console.error("[PersonalWorkspace] note save:", error);
      toast.error("Not kaydedilirken bir hata oluştu.");
    } finally {
      setNoteBusy(false);
    }
  }

  async function handleDeleteNote(id: string) {
    setNoteBusy(true);
    try {
      const result = await deletePersonalNote(id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (editingNoteId === id) resetNoteForm();
      toast.success("Not silindi");
    } catch (error) {
      console.error("[PersonalWorkspace] note delete:", error);
      toast.error("Not silinirken bir hata oluştu.");
    } finally {
      setNoteBusy(false);
    }
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

  async function handleToggleTodo(todo: PersonalTodo) {
    if (todoActionId) return;
    setTodoActionId(todo.id);
    const next = !todo.isCompleted;
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, isCompleted: next } : t)),
    );
    try {
      const result = await togglePersonalTodo(todo.id, next);
      if (!result.success) {
        setTodos((prev) =>
          prev.map((t) =>
            t.id === todo.id ? { ...t, isCompleted: todo.isCompleted } : t,
          ),
        );
        toast.error(result.error);
      }
    } catch (error) {
      console.error("[PersonalWorkspace] todo toggle:", error);
      setTodos((prev) =>
        prev.map((t) =>
          t.id === todo.id ? { ...t, isCompleted: todo.isCompleted } : t,
        ),
      );
      toast.error("Görev güncellenirken bir hata oluştu.");
    } finally {
      setTodoActionId(null);
    }
  }

  async function handleDeleteTodo(id: string) {
    if (todoActionId) return;
    setTodoActionId(id);
    try {
      const result = await deletePersonalTodo(id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setTodos((prev) => prev.filter((t) => t.id !== id));
      toast.success("Görev silindi");
    } catch (error) {
      console.error("[PersonalWorkspace] todo delete:", error);
      toast.error("Görev silinirken bir hata oluştu.");
    } finally {
      setTodoActionId(null);
    }
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

  async function handleDeleteFile(id: string) {
    setFileBusy(true);
    try {
      const result = await deletePersonalFile(id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setFiles((prev) => prev.filter((f) => f.id !== id));
      toast.success("Dosya silindi");
    } catch (error) {
      console.error("[PersonalWorkspace] file delete:", error);
      toast.error("Dosya silinirken bir hata oluştu.");
    } finally {
      setFileBusy(false);
    }
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
                Atanan proje görevleri
              </CardTitle>
              <CardDescription>
                Tüm projelerde sana atanmış görevler — tıklayarak detayı aç
              </CardDescription>
            </CardHeader>
          </Card>

          {assignedTasks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card/60 px-4 py-12 text-center text-sm text-muted-foreground">
              Henüz sana atanmış proje görevi yok.
            </div>
          ) : (
            <ul className="space-y-2">
              {assignedTasks.map((task) => {
                const projectLabel = task.project_name?.trim() || "Proje";
                const dueLabel = formatTaskDue(task.due_date);
                return (
                  <li key={task.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedTaskId(task.id)}
                      className="flex w-full flex-col gap-2 rounded-lg border border-border bg-card px-3 py-3 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/30"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "mb-1.5 inline-flex max-w-full truncate rounded-md border px-2 py-0.5 text-[11px] font-semibold",
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
                            Teslim tarihi yok
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {selectedTaskId ? (
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
                {editingNoteId ? "Notu düzenle" : "Yeni not"}
              </CardTitle>
              <CardDescription>
                Sadece senin görebileceğin kişisel notlar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="note-title">Başlık</Label>
                <Input
                  id="note-title"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Not başlığı"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="note-content">İçerik</Label>
                <textarea
                  id="note-content"
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={8}
                  placeholder="Notunu buraya yaz…"
                  className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={noteBusy || (!noteTitle.trim() && !noteContent.trim())}
                  onClick={() => void handleSaveNote()}
                  className="gap-2"
                >
                  {noteBusy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  {editingNoteId ? "Güncelle" : "Ekle"}
                </Button>
                {editingNoteId ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={noteBusy}
                    onClick={resetNoteForm}
                  >
                    İptal
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {notes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card/60 px-4 py-12 text-center text-sm text-muted-foreground">
                Henüz not yok. Soldan ilk notunu ekle.
              </div>
            ) : (
              notes.map((note) => (
                <Card
                  key={note.id}
                  className="rounded-lg border-border shadow-sm"
                >
                  <CardHeader className="flex-row items-start justify-between gap-2 space-y-0 pb-2">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-sm">
                        {note.title || "Başlıksız not"}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {note.updatedAt
                          ? new Date(note.updatedAt).toLocaleString("tr-TR")
                          : ""}
                      </CardDescription>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingNoteId(note.id);
                          setNoteTitle(note.title);
                          setNoteContent(note.content);
                        }}
                        aria-label="Düzenle"
                      >
                        <FileText className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        disabled={noteBusy}
                        onClick={() => void handleDeleteNote(note.id)}
                        className="text-destructive hover:text-destructive"
                        aria-label="Sil"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {note.content || "—"}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      ) : null}

      {tab === "todos" ? (
        <div className="space-y-4">
          <Card className="rounded-lg border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="size-4 text-primary" />
                Akıllı yapılacaklar
              </CardTitle>
              <CardDescription>
                Teslim tarihi yaklaşan veya geçmiş görevler vurgulanır
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={todoText}
                onChange={(e) => setTodoText(e.target.value)}
                placeholder="Yeni kişisel görev…"
                className="flex-1"
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
                className="w-full sm:w-44"
              />
              <Button
                type="button"
                disabled={todoBusy || !todoText.trim()}
                onClick={() => void handleAddTodo()}
                className="gap-2"
              >
                {todoBusy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Ekle
              </Button>
            </CardContent>
          </Card>

          {sortedTodos.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card/60 px-4 py-12 text-center text-sm text-muted-foreground">
              Henüz kişisel görev yok.
            </div>
          ) : (
            <ul className="space-y-2">
              {sortedTodos.map((todo) => {
                const tone = dueTone(todo.dueDate, todo.isCompleted);
                return (
                  <li
                    key={todo.id}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-3 shadow-sm",
                      todo.isCompleted && "opacity-70",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={todo.isCompleted}
                      disabled={todoActionId === todo.id}
                      onChange={() => void handleToggleTodo(todo)}
                      className="mt-1 size-4 rounded border-border accent-primary"
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm font-medium text-foreground",
                          todo.isCompleted &&
                            "text-muted-foreground line-through",
                        )}
                      >
                        {todo.task}
                      </p>
                      {tone ? (
                        <span
                          className={cn(
                            "mt-1.5 inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium",
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
                      onClick={() => void handleDeleteTodo(todo.id)}
                      className="text-destructive hover:text-destructive"
                      aria-label="Görevi sil"
                    >
                      {todoActionId === todo.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
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
                        onClick={() => void handleDeleteFile(file.id)}
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
