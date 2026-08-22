"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare, Loader2, Trash2 } from "lucide-react";
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
import { getTaskAssignees, setTaskAssignees } from "@/app/actions/task-assignees";
import { updateTask } from "@/app/actions/update-task";
import { updateTaskStatus } from "@/app/actions/update-task-status";
import { getWorkspaceMembers } from "@/app/actions/workspace-members";
import type { WorkspaceMemberOption } from "@/lib/member-labels";
import { cleanText, emailLocalPart, formatPersonName } from "@/lib/member-labels";
import { AssigneesField } from "@/components/task/assignees-field";
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
  TASK_STATUSES,
  type ProjectTask,
  type Subtask,
  type TaskAttachment,
  type TaskComment,
  type TaskStatus,
} from "@/lib/supabase/types";
import { localizedPriority, localizedStatus } from "@/lib/localized-labels";
import { useTranslation } from "@/i18n/use-translation";
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
  const { t } = useTranslation();
  const router = useRouter();
  const [task, setTask] = useState<ProjectTask | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [members, setMembers] = useState<WorkspaceMemberOption[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [subtaskDraft, setSubtaskDraft] = useState("");
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [subtaskBusy, setSubtaskBusy] = useState(false);
  const [togglingSubtaskId, setTogglingSubtaskId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activityKey, setActivityKey] = useState(0);
  /** Sıralı: ilk id birincil atanan (assignee_id), geri kalanı ek atanan (task_assignees). */
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [savingAssignees, setSavingAssignees] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(true);
  const [activityOpen, setActivityOpen] = useState(true);

  const applyTaskToForm = useCallback((next: ProjectTask) => {
    setTask(next);
    setTitle(next.title);
    setDescription(next.description ?? "");
    setDueDate(toDateInputValue(next.due_date));
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

      const [
        details,
        subResult,
        commentResult,
        attachmentResult,
        membersResult,
        assigneesResult,
      ] = await Promise.all([
        getTaskDetails(id),
        getSubtasks(id),
        getTaskComments(id),
        getTaskAttachments(id),
        membersPromise,
        getTaskAssignees(id),
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
      const extraIds = (assigneesResult.success ? assigneesResult.assignees : [])
        .map((a) => a.id);
      const primaryId = details.task.assignee_id?.trim() || null;
      setAssigneeIds(
        primaryId
          ? [primaryId, ...extraIds.filter((id) => id !== primaryId)]
          : extraIds,
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
      const userId = (row.user_id as string | null) ?? null;
      const commentId = String(row.id);

      setComments((prev) => {
        const known =
          (userId &&
            prev.find(
              (c) =>
                c.user_id === userId &&
                cleanText(c.author_name) &&
                c.author_name.toLowerCase() !== "bir kullanıcı",
            )?.author_name) ||
          null;
        const mapped: TaskComment = {
          id: commentId,
          task_id: taskId,
          content,
          user_id: userId,
          author_name: known || "Bilinmeyen Kullanıcı",
          author_avatar_url: null,
          is_own: false,
          created_at: (row.created_at as string | null) ?? null,
        };
        if (prev.some((c) => c.id === mapped.id)) {
          return prev.map((c) =>
            c.id === mapped.id ? { ...c, content: mapped.content } : c,
          );
        }
        return [...prev, mapped];
      });
      setActivityKey((k) => k + 1);

      if (userId) {
        void client
          .from("profiles")
          .select("id, email, full_name, first_name, last_name, avatar_url")
          .eq("id", userId)
          .maybeSingle()
          .then(({ data }) => {
            if (!data || typeof data !== "object") return;
            const profile = data as Record<string, unknown>;
            const name =
              formatPersonName(profile, null) ||
              emailLocalPart(
                typeof profile.email === "string" ? profile.email : null,
              ) ||
              "Bilinmeyen Kullanıcı";
            const avatar =
              typeof profile.avatar_url === "string"
                ? profile.avatar_url
                : null;
            setComments((prev) =>
              prev.map((c) =>
                c.id === commentId
                  ? {
                      ...c,
                      author_name: name,
                      author_avatar_url: avatar,
                    }
                  : c,
              ),
            );
          });
      }
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
      const userId = (row.user_id as string | null) ?? null;
      const attachmentId = String(row.id);

      setAttachments((prev) => {
        const known =
          (userId &&
            prev.find((a) => {
              const uploader = a.uploader_name ?? "";
              return (
                a.user_id === userId &&
                Boolean(cleanText(uploader)) &&
                uploader.toLowerCase() !== "bir kullanıcı"
              );
            })?.uploader_name) ||
          null;
        const mapped: TaskAttachment = {
          id: attachmentId,
          task_id: taskId,
          user_id: userId,
          file_name: (row.file_name as string) ?? "dosya",
          file_url: (row.file_url as string) ?? "",
          file_size:
            row.file_size === null || row.file_size === undefined
              ? null
              : String(row.file_size),
          storage_path: (row.storage_path as string | null) ?? null,
          uploader_name: known || "Bilinmeyen Kullanıcı",
          is_own: false,
          created_at: (row.created_at as string | null) ?? null,
        };
        if (prev.some((a) => a.id === mapped.id)) {
          return prev.map((a) => (a.id === mapped.id ? mapped : a));
        }
        return [mapped, ...prev];
      });
      setActivityKey((k) => k + 1);

      if (userId) {
        void client
          .from("profiles")
          .select("id, email, full_name, first_name, last_name")
          .eq("id", userId)
          .maybeSingle()
          .then(({ data }) => {
            if (!data || typeof data !== "object") return;
            const profile = data as Record<string, unknown>;
            const name =
              formatPersonName(profile, null) ||
              emailLocalPart(
                typeof profile.email === "string" ? profile.email : null,
              ) ||
              "Bilinmeyen Kullanıcı";
            setAttachments((prev) =>
              prev.map((a) =>
                a.id === attachmentId ? { ...a, uploader_name: name } : a,
              ),
            );
          });
      }
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

    // priority ve assignee BİLEREK gönderilmiyor — öncelik yalnızca görev
    // oluştururken belirlenir, atanan kişi(ler) artık ayrı "Atananları
    // Kaydet" akışıyla (handleSaveAssignees, AssigneesField) yönetiliyor —
    // tek bileşen / tek kaydetme akışı, iki yerden aynı alanı yazmayı önler.
    const result = await updateTask({
      taskId: task.id,
      title,
      description,
      due_date: dueDate ? new Date(`${dueDate}T12:00:00`).toISOString() : null,
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
    });
    router.refresh();
  }

  async function handleSaveAssignees() {
    if (!task || savingAssignees) return;
    setSavingAssignees(true);
    try {
      const nextPrimary = assigneeIds[0] ?? null;
      const previousPrimary = task.assignee_id ?? null;

      if (nextPrimary !== previousPrimary) {
        const primaryResult = await updateTask({
          taskId: task.id,
          assigneeId: nextPrimary,
        });
        if (!primaryResult.success) {
          toast.error(primaryResult.error);
          return;
        }
        setCachedTask(primaryResult.task);
        applyTaskToForm(primaryResult.task);
        onTaskUpdated?.({
          id: primaryResult.task.id,
          assignee_id: primaryResult.task.assignee_id,
        });
      }

      // Ek atananlar (task_assignees) yalnızca admin tarafından
      // düzenlenebilir — backend/RLS zaten aynı kuralı zorunlu kılıyor,
      // burada gereksiz bir isteği baştan engelliyoruz.
      if (isAdmin) {
        const result = await setTaskAssignees(task.id, assigneeIds.slice(1));
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        const extraIds = result.assignees.map((a) => a.id);
        setAssigneeIds(
          nextPrimary
            ? [nextPrimary, ...extraIds.filter((id) => id !== nextPrimary)]
            : extraIds,
        );
      }

      toast.success("Atananlar güncellendi");
      setActivityKey((k) => k + 1);
      router.refresh();
    } catch (error) {
      console.error("[TaskDetailSheet] handleSaveAssignees:", error);
      toast.error("Atananlar güncellenirken bir hata oluştu.");
    } finally {
      setSavingAssignees(false);
    }
  }

  async function handleAddSubtask() {
    if (!task || !subtaskDraft.trim() || subtaskBusy) return;
    setSubtaskBusy(true);
    try {
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
    } catch (error) {
      console.error("[TaskDetailSheet] createSubtask catch:", error);
      toast.error("Alt görev eklenirken bir hata oluştu.");
    } finally {
      setSubtaskBusy(false);
    }
  }

  async function handleToggleSubtask(id: string) {
    if (togglingSubtaskId) return;
    setTogglingSubtaskId(id);
    try {
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
    } catch (error) {
      console.error("[TaskDetailSheet] toggleSubtask catch:", error);
      toast.error("Alt görev güncellenirken bir hata oluştu.");
    } finally {
      setTogglingSubtaskId(null);
    }
  }

  async function handleDeleteSubtask(id: string) {
    if (togglingSubtaskId) return;
    setTogglingSubtaskId(id);
    try {
      const result = await deleteSubtask(id);
      if (!result.success) {
        console.error("[TaskDetailSheet] deleteSubtask:", result.error);
        toast.error(result.error);
        return;
      }
      setSubtasks((prev) => prev.filter((s) => s.id !== id));
      toast.success("Alt görev silindi");
      router.refresh();
    } catch (error) {
      console.error("[TaskDetailSheet] deleteSubtask catch:", error);
      toast.error("Alt görev silinirken bir hata oluştu.");
    } finally {
      setTogglingSubtaskId(null);
    }
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
                        {localizedStatus(t, value)}
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
                {/*
                  Öncelik yalnızca görev oluşturulurken belirlenir; detayda
                  salt-okunur gösterilir (düzenleme bilinçli olarak kaldırıldı).
                */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Öncelik</Label>
                  <div
                    className="flex h-9 w-full items-center rounded-lg border border-border bg-muted/40 px-3 text-sm text-foreground"
                    title={t("taskDetail.priorityReadOnly")}
                  >
                    {localizedPriority(t, task.priority ?? "MEDIUM")}
                  </div>
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
                <AssigneesField
                  id="task-assignees"
                  label={t("taskModal.assignees")}
                  members={members}
                  selectedIds={assigneeIds}
                  onChange={setAssigneeIds}
                  canMultiSelect={isAdmin}
                  disabled={
                    savingAssignees || (!isAdmin && members.length <= 1)
                  }
                  hint={isAdmin ? t("taskModal.assigneesHint") : undefined}
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={savingAssignees}
                    onClick={() => void handleSaveAssignees()}
                    className="rounded-lg"
                  >
                    {savingAssignees ? "Kaydediliyor…" : "Atananları Kaydet"}
                  </Button>
                </div>
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
                  {task.deletion_status === "pending_admin_approval" ||
                  task.deletion_status === "pending_user_approval"
                    ? "Bu görev için silme onayı bekleniyor."
                    : isAdmin
                      ? "İlerleme varsa silme talebi atanan kullanıcıya iletilir; görev onaylanmadan silinmez."
                      : "İlerleme varsa silme talebi yöneticiye iletilir; görev onaylanmadan silinmez."}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setDeleteOpen(true)}
                  disabled={
                    task.deletion_status === "pending_admin_approval" ||
                    task.deletion_status === "pending_user_approval"
                  }
                  className="rounded-lg border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                  {task.deletion_status === "pending_admin_approval" ||
                  task.deletion_status === "pending_user_approval"
                    ? "Onay Bekleniyor"
                    : isAdmin
                      ? "Sil / Onay İste"
                      : "Silme İsteği Gönder"}
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
                  disabled={!subtaskDraft.trim() || subtaskBusy}
                  onClick={() => void handleAddSubtask()}
                  className="shrink-0 rounded-lg"
                >
                  {subtaskBusy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Ekle"
                  )}
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
                        disabled={togglingSubtaskId === item.id}
                        onChange={() => void handleToggleSubtask(item.id)}
                        className="mt-0.5 size-4 rounded border-border accent-primary disabled:opacity-50"
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
                        disabled={togglingSubtaskId === item.id}
                        onClick={() => void handleDeleteSubtask(item.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                      >
                        {togglingSubtaskId === item.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
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
              open={commentsOpen}
              onToggleOpen={() => setCommentsOpen((v) => !v)}
            />

            <TaskActivityFeed
              taskId={task.id}
              refreshKey={activityKey}
              open={activityOpen}
              onToggleOpen={() => setActivityOpen((v) => !v)}
            />
          </div>
        ) : null}
      </SheetContent>

      <DeleteTaskModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        isAdmin={isAdmin}
        task={
          task
            ? {
                id: task.id,
                title: task.title,
                deletion_status: task.deletion_status,
              }
            : null
        }
        onApprovalRequested={(taskId, deletionStatus) => {
          invalidateCachedTask(taskId);
          setTask((prev) =>
            prev && prev.id === taskId
              ? { ...prev, deletion_status: deletionStatus }
              : prev,
          );
          onTaskUpdated?.({ id: taskId, deletion_status: deletionStatus });
          router.refresh();
        }}
      />
    </Sheet>
  );
}
