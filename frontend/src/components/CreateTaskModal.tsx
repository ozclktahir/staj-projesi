"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { createTask } from "@/app/actions/create-task";
import { getWorkspaceMembers } from "@/app/actions/workspace-members";
import type { WorkspaceMemberOption } from "@/lib/workspace-permissions";
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

type CreateTaskModalProps = {
  projectId: string;
  workspaceId?: string | null;
};

const fieldClassName =
  "flex h-9 w-full rounded-lg border border-border bg-background px-3 py-1 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50";

const textareaClassName =
  "flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50";

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
  const [members, setMembers] = useState<WorkspaceMemberOption[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !workspaceId) return;
    void getWorkspaceMembers(workspaceId).then((result) => {
      if (!result.success) {
        console.error("[CreateTaskModal] members:", result.error);
        return;
      }
      setMembers(result.members);
      setIsAdmin(result.isAdmin);
      if (!result.isAdmin && result.members[0]) {
        setAssigneeId(result.members[0].id);
      }
    });
  }, [open, workspaceId]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStatus("TODO");
    setPriority("MEDIUM");
    setAssigneeId("");
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
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
      resetForm();
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Görev oluşturulurken bir hata oluştu.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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

      <DialogContent className="rounded-lg border border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Yeni Görev</DialogTitle>
          <DialogDescription>
            Başlık zorunludur. İsterseniz bir üyeye atayın.
          </DialogDescription>
        </DialogHeader>

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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
              className={textareaClassName}
            />
          </div>

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

          <div className="space-y-2">
            <Label htmlFor="task-assignee">Atanan Kişi</Label>
            <select
              id="task-assignee"
              value={assigneeId}
              onChange={(event) => setAssigneeId(event.target.value)}
              disabled={isSubmitting || (!isAdmin && members.length <= 1)}
              className={fieldClassName}
            >
              <option value="">Atanmamış</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.displayName}
                  {member.email ? ` (${member.email})` : ""}
                </option>
              ))}
            </select>
          </div>

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
              disabled={isSubmitting || !title.trim()}
              className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? "Oluşturuluyor..." : "Oluştur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
