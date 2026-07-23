"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getTaskAttachments } from "@/app/actions/attachments";
import { getTaskComments } from "@/app/actions/comments";
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
import { TaskActivityFeed } from "@/components/task/task-activity-feed";
import { TaskAttachments } from "@/components/task/task-attachments";
import { TaskComments } from "@/components/task/task-comments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getCachedTask,
  getCachedWorkspaceMembers,
  invalidateCachedTask,
  setCachedTask,
  setCachedWorkspaceMembers,
} from "@/lib/client-cache";
import { createAuthedRealtimeClient } from "@/lib/supabase/client";
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
  type TaskAttachment,
  type TaskComment,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type TaskDetailSheetProps = {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Karttan gelen anlık seed — sheet veriyi beklemeden açılsın */
  initialTask?: ProjectTask | null;
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
  initialTask = null,
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
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activityKey, setActivityKey] = useState(0);

  const applyTaskToForm = useCallback((next: ProjectTask) => {
    setTask(next);
    setTitle(next.title);
    setDescription(next.description ?? "");
    setDueDate(toDateInputValue(next.due_date));
    setPriority(next.priority);
    setAssigneeId(next.assignee_id ?? "");
  }, []);

  const loadAll = useCallback(
    async (id: string) => {
      setError(null);

      const cached = getCachedTask(id);
      const seed = cached ?? initialTask;
      if (seed && seed.id === id) {
        applyTaskToForm(seed);
      }
      setLoading(true);

      const wsHint =
        (seed?.workspace_id && seed.workspace_id.trim()) ||
        null;
      const cachedMembers = wsHint
        ? getCachedWorkspaceMembers(wsHint)
        : null;
      if (cachedMembers) {
        setMembers(cachedMembers.members);
        setIsAdmin(cachedMembers.isAdmin);
      }

      const membersPromise =
        wsHint && !cachedMembers
          ? getWorkspaceMembers(wsHint)
          : Promise.resolve(null);

      const [details, subResult, commentResult, attachmentResult, membersResult] =
        await Promise.all([
          getTaskDetails(id),
          getSubtasks(id),
          getTaskComments(id),
          getTaskAttachments(id),
          membersPromise,
        ]);

      if (!details.success) {
        if (!seed) setTask(null);
        setError(details.error);
        setLoading(false);
        return;
      }

      setCachedTask(details.task);
      applyTaskToForm(details.task);
      setSubtasks(subResult.success ? subResult.subtasks : []);
      setComments(commentResult.success ? commentResult.comments : []);
      setAttachments(
        attachmentResult.success ? attachmentResult.attachments : [],
      );
      setLoading(false);

      if (
        membersResult &&
        typeof membersResult === "object" &&
        "success" in membersResult &&
        membersResult.success
      ) {
        const payload = {
          members: membersResult.members,
          isAdmin: membersResult.isAdmin,
        };
        if (wsHint) setCachedWorkspaceMembers(wsHint, payload);
        setMembers(payload.members);
        setIsAdmin(payload.isAdmin);
      }

      const wsId = details.task.workspace_id?.trim() || wsHint;
      if (wsId && !getCachedWorkspaceMembers(wsId) && wsId !== wsHint) {
        void getWorkspaceMembers(wsId).then((result) => {
          if (!result.success) return;
          const payload = {
            members: result.members,
            isAdmin: result.isAdmin,
          };
          setCachedWorkspaceMembers(wsId, payload);
          setMembers(payload.members);
          setIsAdmin(payload.isAdmin);
        });
      }

      if (!subResult.success) {
        console.error("[TaskDetailSheet] getSubtasks:", subResult.error);
      }
      if (!commentResult.success) {
        console.error("[TaskDetailSheet] getTaskComments:", commentResult.error);
      }
      if (!attachmentResult.success) {
        console.error(
          "[TaskDetailSheet] getTaskAttachments:",
          attachmentResult.error,
        );
      }
    },
    [applyTaskToForm, initialTask],
  );

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

  // Realtime: yorumlar + dosyalar
  useEffect(() => {
    if (!open || !taskId) return;
    const client = createAuthedRealtimeClient();
    if (!client) return;

    const applyCommentRow = (
      eventType: string,
      row: Record<string, unknown>,
      oldRow: Record<string, unknown>,
    ) => {
      if (eventType === "DELETE") {
        const id = typeof oldRow.id === "string" ? oldRow.id : null;
        if (!id) return;
        setComments((prev) => prev.filter((c) => c.id !== id));
        setActivityKey((k) => k + 1);
        return;
      }
      if (!row.id) return;
      const content =
        (typeof row.content === "string" && row.content) ||
        (typeof row.body === "string" && row.body) ||
        "";
      const mapped: TaskComment = {
        id: String(row.id),
        task_id: taskId,
        content,
        user_id: (row.user_id as string | null) ?? null,
        author_name: "Bir kullanıcı",
        author_avatar_url: null,
        is_own: false,
        created_at: (row.created_at as string | null) ?? null,
      };
      setComments((prev) => {
        if (prev.some((c) => c.id === mapped.id)) {
          return prev.map((c) =>
            c.id === mapped.id ? { ...c, content: mapped.content } : c,
          );
        }
        return [...prev, mapped];
      });
      setActivityKey((k) => k + 1);
    };

    const applyAttachmentRow = (
      eventType: string,
      row: Record<string, unknown>,
      oldRow: Record<string, unknown>,
    ) => {
      if (eventType === "DELETE") {
        const id = typeof oldRow.id === "string" ? oldRow.id : null;
        if (!id) return;
        setAttachments((prev) => prev.filter((a) => a.id !== id));
        setActivityKey((k) => k + 1);
        return;
      }
      if (!row.id) return;
      const mapped: TaskAttachment = {
        id: String(row.id),
        task_id: taskId,
        user_id: (row.user_id as string | null) ?? null,
        file_name: (row.file_name as string) ?? "dosya",
        file_url: (row.file_url as string) ?? "",
        file_size:
          row.file_size === null || row.file_size === undefined
            ? null
            : String(row.file_size),
        storage_path: (row.storage_path as string | null) ?? null,
        uploader_name: "Bir kullanıcı",
        is_own: false,
        created_at: (row.created_at as string | null) ?? null,
      };
      setAttachments((prev) => {
        if (prev.some((a) => a.id === mapped.id)) {
          return prev.map((a) => (a.id === mapped.id ? mapped : a));
        }
        return [mapped, ...prev];
      });
      setActivityKey((k) => k + 1);
    };

    const channel = client
      .channel(`task-detail:${taskId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_comments",
          filter: `task_id=eq.${taskId}`,
        },
        (payload) =>
          applyCommentRow(
            payload.eventType,
            (payload.new ?? {}) as Record<string, unknown>,
            (payload.old ?? {}) as Record<string, unknown>,
          ),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `task_id=eq.${taskId}`,
        },
        (payload) =>
          applyCommentRow(
            payload.eventType,
            (payload.new ?? {}) as Record<string, unknown>,
            (payload.old ?? {}) as Record<string, unknown>,
          ),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_attachments",
          filter: `task_id=eq.${taskId}`,
        },
        (payload) =>
          applyAttachmentRow(
            payload.eventType,
            (payload.new ?? {}) as Record<string, unknown>,
            (payload.old ?? {}) as Record<string, unknown>,
          ),
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [open, taskId]);

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
    setActivityKey((k) => k + 1);
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

    setCachedTask(result.task);
    applyTaskToForm(result.task);
    toast.success("Görev kaydedildi");
    setActivityKey((k) => k + 1);
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

  const doneCount = subtasks.filter((s) => s.done).length;
  const showSkeleton = loading && !task;

  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="gap-0 overflow-y-auto p-0 duration-150 data-[state=open]:duration-150 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Görev detayı
            {loading && task ? (
              <span className="ml-2 font-normal normal-case tracking-normal text-muted-foreground/70">
                güncelleniyor…
              </span>
            ) : null}
          </p>
          {showSkeleton ? (
            <>
              <SheetTitle className="sr-only">Yükleniyor</SheetTitle>
              <SheetDescription className="sr-only">
                Görev bilgileri getiriliyor
              </SheetDescription>
              <div className="mt-2 space-y-3 animate-pulse">
                <div className="h-7 w-3/4 rounded-md bg-muted" />
                <div className="h-9 w-full rounded-md bg-muted" />
                <div className="h-9 w-full rounded-md bg-muted" />
              </div>
            </>
          ) : error && !task ? (
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

        {task && !error ? (
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

              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                <p className="mb-2 text-xs text-muted-foreground">
                  Görevi kalıcı olarak kaldırmak için silme işlemini kullanın.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setDeleteOpen(true)}
                  className="rounded-lg border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
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
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <TaskAttachments
              taskId={task.id}
              attachments={attachments}
              onChange={(next) => {
                setAttachments(next);
                setActivityKey((k) => k + 1);
              }}
            />

            <TaskComments
              taskId={task.id}
              comments={comments}
              onChange={(next) => {
                setComments(next);
                setActivityKey((k) => k + 1);
              }}
            />

            <TaskActivityFeed taskId={task.id} refreshKey={activityKey} />
          </div>
        ) : null}
      </SheetContent>

      <DeleteTaskModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        task={task ? { id: task.id, title: task.title } : null}
        onDeleted={(deletedId) => {
          invalidateCachedTask(deletedId);
          onOpenChange(false);
          onTaskDeleted?.(deletedId);
          router.refresh();
        }}
      />
    </Sheet>
  );
}
