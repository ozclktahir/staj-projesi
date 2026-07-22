"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare, MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createComment, getTaskComments } from "@/app/actions/comments";
import { getTaskDetails } from "@/app/actions/get-task-details";
import {
  createSubtask,
  deleteSubtask,
  getSubtasks,
  toggleSubtask,
} from "@/app/actions/subtasks";
import { updateTask } from "@/app/actions/update-task";
import { updateTaskStatus } from "@/app/actions/update-task-status";
import { getWorkspaceMembers } from "@/app/actions/workspace-members";
import type { WorkspaceMemberOption } from "@/lib/workspace-permissions";
import { cleanText, emailLocalPart } from "@/lib/member-labels";
import { DeleteTaskModal } from "@/components/delete-task-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type ProjectTask,
  type Subtask,
  type TaskComment,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type TaskDetailSheetProps = {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated?: (task: Partial<ProjectTask> & { id: string }) => void;
  onTaskDeleted?: (taskId: string) => void;
};

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export function TaskDetailSheet({
  taskId,
  open,
  onOpenChange,
  onTaskUpdated,
  onTaskDeleted,
}: TaskDetailSheetProps) {
  const router = useRouter();
  const [task, setTask] = useState<ProjectTask | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [assigneeId, setAssigneeId] = useState("");
  const [members, setMembers] = useState<WorkspaceMemberOption[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [subtaskDraft, setSubtaskDraft] = useState("");
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const loadAll = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    const [details, subResult, commentResult] = await Promise.all([
      getTaskDetails(id),
      getSubtasks(id),
      getTaskComments(id),
    ]);

    if (!details.success) {
      setTask(null);
      setError(details.error);
      setLoading(false);
      return;
    }

    setTask(details.task);
    setTitle(details.task.title);
    setDescription(details.task.description ?? "");
    setDueDate(toDateInputValue(details.task.due_date));
    setPriority(details.task.priority);
    setAssigneeId(details.task.assignee_id ?? "");
    setSubtasks(subResult.success ? subResult.subtasks : []);
    setComments(commentResult.success ? commentResult.comments : []);
    setSubtaskDraft("");
    setCommentDraft("");
    setLoading(false);

    if (details.task.workspace_id) {
      void getWorkspaceMembers(details.task.workspace_id).then((result) => {
        if (result.success) {
          setMembers(result.members);
          setIsAdmin(result.isAdmin);
        }
      });
    }

    if (!subResult.success) {
      console.error("[TaskDetailSheet] getSubtasks:", subResult.error);
    }
    if (!commentResult.success) {
      console.error("[TaskDetailSheet] getTaskComments:", commentResult.error);
    }
  }, []);

  useEffect(() => {
    if (!open || !taskId) return;
    let cancelled = false;
    void loadAll(taskId).then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [open, taskId, loadAll]);

  async function handleStatusChange(status: TaskStatus) {
    if (!task || task.status === status) return;
    const previous = task.status;
    setTask({ ...task, status });
    setSavingStatus(true);

    const result = await updateTaskStatus(task.id, status);
    setSavingStatus(false);

    if (!result.success) {
      setTask({ ...task, status: previous });
      console.error("[TaskDetailSheet] updateTaskStatus:", result.error);
      toast.error(result.error);
      return;
    }

    toast.success("Durum güncellendi");
    onTaskUpdated?.({ id: task.id, status: result.status });
    router.refresh();
  }

  async function handleSaveFields() {
    if (!task) return;
    setSaving(true);

    const result = await updateTask({
      taskId: task.id,
      title,
      description,
      due_date: dueDate ? new Date(`${dueDate}T12:00:00`).toISOString() : null,
      priority,
      assigneeId: assigneeId || null,
    });

    setSaving(false);

    if (!result.success) {
      console.error("[TaskDetailSheet] updateTask:", result.error);
      toast.error(result.error);
      return;
    }

    setTask(result.task);
    setTitle(result.task.title);
    setDescription(result.task.description ?? "");
    setDueDate(toDateInputValue(result.task.due_date));
    setPriority(result.task.priority);
    setAssigneeId(result.task.assignee_id ?? "");
    toast.success("Görev kaydedildi");
    onTaskUpdated?.({
      id: result.task.id,
      title: result.task.title,
      description: result.task.description,
      priority: result.task.priority,
      due_date: result.task.due_date,
      assignee_id: result.task.assignee_id,
    });
    router.refresh();
  }

  async function handleAddSubtask() {
    if (!task || !subtaskDraft.trim()) return;
    const result = await createSubtask(task.id, subtaskDraft);
    if (!result.success) {
      console.error("[TaskDetailSheet] createSubtask:", result.error);
      toast.error(result.error);
      return;
    }
    setSubtasks((prev) => [...prev, result.subtask]);
    setSubtaskDraft("");
    toast.success("Alt görev eklendi");
    onTaskUpdated?.({
      id: task.id,
      subtask_total: subtasks.length + 1,
      subtask_done: subtasks.filter((s) => s.done).length,
    });
    router.refresh();
  }

  async function handleToggleSubtask(id: string) {
    const result = await toggleSubtask(id);
    if (!result.success) {
      console.error("[TaskDetailSheet] toggleSubtask:", result.error);
      toast.error(result.error);
      return;
    }
    setSubtasks((prev) =>
      prev.map((s) => (s.id === id ? result.subtask : s)),
    );
    router.refresh();
  }

  async function handleDeleteSubtask(id: string) {
    const result = await deleteSubtask(id);
    if (!result.success) {
      console.error("[TaskDetailSheet] deleteSubtask:", result.error);
      toast.error(result.error);
      return;
    }
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
    toast.success("Alt görev silindi");
    router.refresh();
  }

  async function handleAddComment() {
    if (!task || !commentDraft.trim()) return;
    const result = await createComment(task.id, commentDraft);
    if (!result.success) {
      console.error("[TaskDetailSheet] createComment:", result.error);
      toast.error(result.error);
      return;
    }
    setComments((prev) => [...prev, result.comment]);
    setCommentDraft("");
    toast.success("Yorum eklendi");
  }

  const doneCount = subtasks.filter((s) => s.done).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="gap-0 overflow-y-auto p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Görev detayı
          </p>
          {loading ? (
            <>
              <SheetTitle className="text-foreground">Yükleniyor…</SheetTitle>
              <SheetDescription>Görev bilgileri getiriliyor.</SheetDescription>
            </>
          ) : error ? (
            <>
              <SheetTitle className="text-foreground">Hata</SheetTitle>
              <SheetDescription>{error}</SheetDescription>
            </>
          ) : task ? (
            <>
              <SheetTitle className="sr-only">{task.title}</SheetTitle>
              <SheetDescription className="sr-only">
                Görev düzenleme, alt görevler ve yorumlar
              </SheetDescription>
              <div className="mt-1 space-y-3">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-auto border-0 bg-transparent px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
                  placeholder="Görev başlığı"
                />
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Durum</Label>
                  <select
                    value={task.status}
                    disabled={savingStatus}
                    onChange={(event) => {
                      void handleStatusChange(
                        event.target.value as TaskStatus,
                      );
                    }}
                    className="flex h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                  >
                    {TASK_STATUSES.map((value) => (
                      <option key={value} value={value}>
                        {TASK_STATUS_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          ) : (
            <>
              <SheetTitle>Görev</SheetTitle>
              <SheetDescription>Detay bulunamadı.</SheetDescription>
            </>
          )}
        </SheetHeader>

        {!loading && !error && task ? (
          <div className="flex flex-1 flex-col gap-6 px-4 py-5">
            <section className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="task-priority" className="text-xs">
                    Öncelik
                  </Label>
                  <select
                    id="task-priority"
                    value={priority}
                    onChange={(e) =>
                      setPriority(e.target.value as TaskPriority)
                    }
                    className="flex h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  >
                    {TASK_PRIORITIES.map((value) => (
                      <option key={value} value={value}>
                        {TASK_PRIORITY_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="task-due" className="text-xs">
                    Son teslim
                  </Label>
                  <Input
                    id="task-due"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-9 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="task-assignee" className="text-xs">
                  Atanan Kişi
                </Label>
                <select
                  id="task-assignee"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  disabled={!isAdmin && members.length <= 1}
                  className="flex h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
                >
                  <option value="">Atanmamış</option>
                  {members.map((member) => {
                    const label =
                      cleanText(member.fullName) ||
                      cleanText(member.displayName) ||
                      emailLocalPart(member.email) ||
                      cleanText(member.email) ||
                      "";
                    if (!label) return null;
                    return (
                      <option key={member.id} value={member.id}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="task-desc" className="text-xs">
                  Açıklama
                </Label>
                <textarea
                  id="task-desc"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                  placeholder="Açıklama ekle…"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              <Button
                type="button"
                size="sm"
                disabled={saving || !title.trim()}
                onClick={() => void handleSaveFields()}
                className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {saving ? "Kaydediliyor…" : "Kaydet"}
              </Button>

              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                <p className="mb-2 text-xs text-muted-foreground">
                  Görevi kalıcı olarak kaldırmak için silme işlemini kullanın.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setDeleteOpen(true)}
                  className="rounded-lg border-red-500/40 text-red-600 hover:bg-red-500/10 hover:text-red-700"
                >
                  <Trash2 className="size-3.5" />
                  Görevi Sil
                </Button>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2 text-foreground">
                <CheckSquare className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">Alt Görevler</h3>
                <span className="text-xs text-muted-foreground">
                  {doneCount}/{subtasks.length}
                </span>
              </div>

              <div className="flex gap-2">
                <Input
                  value={subtaskDraft}
                  onChange={(e) => setSubtaskDraft(e.target.value)}
                  placeholder="Yeni alt görev…"
                  className="h-9 rounded-lg"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleAddSubtask();
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={!subtaskDraft.trim()}
                  onClick={() => void handleAddSubtask()}
                  className="shrink-0 rounded-lg"
                >
                  Ekle
                </Button>
              </div>

              {subtasks.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-4 text-xs text-muted-foreground">
                  Henüz alt görev yok.
                </div>
              ) : (
                <ul className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                  {subtasks.map((item) => (
                    <li key={item.id} className="flex items-start gap-2">
                      <input
                        id={`sub-${item.id}`}
                        type="checkbox"
                        checked={item.done}
                        onChange={() => void handleToggleSubtask(item.id)}
                        className="mt-0.5 size-4 rounded border-border accent-primary"
                      />
                      <label
                        htmlFor={`sub-${item.id}`}
                        className={cn(
                          "min-w-0 flex-1 text-sm text-foreground",
                          item.done && "text-muted-foreground line-through",
                        )}
                      >
                        {item.title}
                      </label>
                      <button
                        type="button"
                        aria-label="Alt görevi sil"
                        onClick={() => void handleDeleteSubtask(item.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2 text-foreground">
                <MessageSquare className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">Yorumlar</h3>
              </div>

              <div className="space-y-2">
                <textarea
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                  rows={2}
                  placeholder="Yorum yaz…"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
                <Button
                  type="button"
                  size="sm"
                  className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={!commentDraft.trim()}
                  onClick={() => void handleAddComment()}
                >
                  Yorum ekle
                </Button>
              </div>

              {comments.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-4 text-xs text-muted-foreground">
                  Henüz yorum yok. İlk yorumunu ekle.
                </div>
              ) : (
                <ul className="space-y-3">
                  {comments.map((comment) => (
                    <li
                      key={comment.id}
                      className="rounded-lg border border-border bg-card px-3 py-2"
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-primary">
                          {comment.author_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {comment.created_at
                            ? new Date(comment.created_at).toLocaleString(
                                "tr-TR",
                              )
                            : ""}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">
                        {comment.content}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}
      </SheetContent>

      <DeleteTaskModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        task={task ? { id: task.id, title: task.title } : null}
        onDeleted={(deletedId) => {
          onOpenChange(false);
          onTaskDeleted?.(deletedId);
          router.refresh();
        }}
      />
    </Sheet>
  );
}
