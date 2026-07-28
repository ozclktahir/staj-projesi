"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArchiveRestore, Plus } from "lucide-react";
import { createTask } from "@/app/actions/create-task";
import {
  getRejectedTasks,
  reassignRejectedTask,
  type RejectedTaskItem,
} from "@/app/actions/reassign-rejected-task";
import { getWorkspaceMembers } from "@/app/actions/workspace-members";
import type { WorkspaceMemberOption } from "@/lib/member-labels";
import {
  getCachedWorkspaceMembers,
  setCachedWorkspaceMembers,
} from "@/lib/client-cache";
import { cleanText, emailLocalPart } from "@/lib/member-labels";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type CreateTaskModalProps = {
  projectId: string;
  workspaceId?: string | null;
};

const fieldClassName =
  "flex h-9 w-full rounded-lg border-2 border-border bg-background px-3 py-1 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border dark:shadow-none";

const textareaClassName =
  "flex w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border dark:shadow-none";

function normalizePriority(value: string | null | undefined): TaskPriority {
  const key = String(value ?? "MEDIUM").toUpperCase();
  if (key === "LOW" || key === "MEDIUM" || key === "HIGH") return key;
  return "MEDIUM";
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export function CreateTaskModal({
  projectId,
  workspaceId = null,
}: CreateTaskModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [members, setMembers] = useState<WorkspaceMemberOption[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [rejectedTasks, setRejectedTasks] = useState<RejectedTaskItem[]>([]);
  const [selectedRejectedId, setSelectedRejectedId] = useState("");
  const [showRejectedPicker, setShowRejectedPicker] = useState(false);
  const [rejectedNote, setRejectedNote] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !workspaceId) return;

    const cached = getCachedWorkspaceMembers(workspaceId);
    if (cached) {
      setMembers(cached.members);
      setIsAdmin(cached.isAdmin);
      if (!cached.isAdmin && cached.members[0]) {
        setAssigneeId(cached.members[0].id);
      }
      return;
    }

    void getWorkspaceMembers(workspaceId).then((result) => {
      if (!result.success) {
        console.error("[CreateTaskModal] members:", result.error);
        return;
      }
      setCachedWorkspaceMembers(workspaceId, {
        members: result.members,
        isAdmin: result.isAdmin,
      });
      setMembers(result.members);
      setIsAdmin(result.isAdmin);
      if (!result.isAdmin && result.members[0]) {
        setAssigneeId(result.members[0].id);
      }
    });
  }, [open, workspaceId]);

  useEffect(() => {
    if (!open || !isAdmin) {
      setRejectedTasks([]);
      return;
    }
    void getRejectedTasks(projectId).then((result) => {
      if (result.success) setRejectedTasks(result.tasks);
      else setRejectedTasks([]);
    });
  }, [open, isAdmin, projectId]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStatus("TODO");
    setPriority("MEDIUM");
    setAssigneeId("");
    setDueDate("");
    setSelectedRejectedId("");
    setRejectedNote(null);
    setShowRejectedPicker(false);
  };

  const applyRejectedTemplate = (taskId: string) => {
    setSelectedRejectedId(taskId);
    if (!taskId) {
      setRejectedNote(null);
      return;
    }
    const task = rejectedTasks.find((t) => t.id === taskId);
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description ?? "");
    setPriority(normalizePriority(task.priority));
    setDueDate(toDateInputValue(task.due_date));
    setAssigneeId("");
    setRejectedNote(
      `Bu görev daha önce ${task.rejected_by_name} tarafından reddedildi`,
    );
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      if (selectedRejectedId) {
        if (!assigneeId) {
          toast.error("Yeniden atama için yeni bir kişi seçin.");
          return;
        }
        const result = await reassignRejectedTask({
          taskId: selectedRejectedId,
          projectId,
          assigneeId,
          dueDate: dueDate || null,
        });
        if (!result.success) {
          toast.error(result.error ?? "Yeniden atama başarısız");
          return;
        }
        toast.success(result.message ?? "Görev yeniden atandı");
      } else {
        const result = await createTask({
          projectId,
          title,
          description,
          status,
          priority,
          assigneeId: assigneeId || null,
        });

        if (!result.success) {
          toast.error(result.error);
          return;
        }

        toast.success("Görev oluşturuldu");
      }

      resetForm();
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Görev işlemi sırasında bir hata oluştu.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReassignMode = Boolean(selectedRejectedId);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          className="rounded-lg bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <Plus className="size-4" />
          Yeni Görev Ekle
        </Button>
      </DialogTrigger>

      {open ? (
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {isReassignMode ? "Görevi Yeniden Ata" : "Yeni Görev"}
            </DialogTitle>
            <DialogDescription>
              {isReassignMode
                ? "Başlık ve öncelik dolduruldu. Yeni atanan kişi ve bitiş tarihini seçin."
                : "Başlık zorunludur. İsterseniz bir üyeye atayın."}
            </DialogDescription>
          </DialogHeader>

          {isAdmin && rejectedTasks.length > 0 ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 text-left text-sm font-medium text-foreground"
                onClick={() => setShowRejectedPicker((v) => !v)}
              >
                <span className="inline-flex items-center gap-2">
                  <ArchiveRestore className="size-4 text-primary" />
                  Reddedilen Görevlerden Seç
                </span>
                <span className="text-xs text-muted-foreground">
                  {showRejectedPicker ? "Gizle" : `${rejectedTasks.length} adet`}
                </span>
              </button>

              {showRejectedPicker ? (
                <div className="mt-3 space-y-2">
                  <Label htmlFor="rejected-task-pick">Arşivlenmiş görev</Label>
                  <select
                    id="rejected-task-pick"
                    value={selectedRejectedId}
                    onChange={(e) => applyRejectedTemplate(e.target.value)}
                    disabled={isSubmitting}
                    className={fieldClassName}
                  >
                    <option value="">— Yeni boş görev —</option>
                    {rejectedTasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.title}
                      </option>
                    ))}
                  </select>
                  {rejectedNote ? (
                    <p
                      className={cn(
                        "rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-[11px] leading-relaxed text-amber-800 dark:text-amber-200",
                      )}
                    >
                      {rejectedNote}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="task-title">Başlık</Label>
              <Input
                id="task-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Örn: API entegrasyonunu tamamla"
                required
                className={fieldClassName}
                disabled={isSubmitting || isReassignMode}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-description">Açıklama</Label>
              <textarea
                id="task-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="İsteğe bağlı açıklama"
                rows={3}
                disabled={isSubmitting || isReassignMode}
                className={textareaClassName}
              />
            </div>

            {!isReassignMode ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="task-status">Durum</Label>
                  <select
                    id="task-status"
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value as TaskStatus)
                    }
                    disabled={isSubmitting}
                    className={fieldClassName}
                  >
                    {TASK_STATUSES.map((value) => (
                      <option key={value} value={value}>
                        {TASK_STATUS_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="task-priority">Öncelik</Label>
                  <select
                    id="task-priority"
                    value={priority}
                    onChange={(event) =>
                      setPriority(event.target.value as TaskPriority)
                    }
                    disabled={isSubmitting}
                    className={fieldClassName}
                  >
                    {TASK_PRIORITIES.map((value) => (
                      <option key={value} value={value}>
                        {TASK_PRIORITY_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Öncelik</Label>
                <p className="text-sm text-muted-foreground">
                  {TASK_PRIORITY_LABELS[priority]}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="task-assignee">
                {isReassignMode ? "Yeni Atanan Kişi" : "Atanan Kişi"}
              </Label>
              <select
                id="task-assignee"
                value={assigneeId}
                onChange={(event) => setAssigneeId(event.target.value)}
                disabled={isSubmitting || (!isAdmin && members.length <= 1)}
                className={fieldClassName}
                required={isReassignMode}
              >
                <option value="">
                  {isReassignMode ? "Kişi seçin…" : "Atanmamış"}
                </option>
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

            {isReassignMode ? (
              <div className="space-y-2">
                <Label htmlFor="task-due-date">Yeni Bitiş Tarihi</Label>
                <Input
                  id="task-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={isSubmitting}
                  className={fieldClassName}
                />
              </div>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-lg border-border"
                disabled={isSubmitting}
                onClick={() => setOpen(false)}
              >
                İptal
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  !title.trim() ||
                  (isReassignMode && !assigneeId)
                }
                className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSubmitting
                  ? "İşleniyor..."
                  : isReassignMode
                    ? "Yeniden Atayarak Oluştur"
                    : "Oluştur"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
