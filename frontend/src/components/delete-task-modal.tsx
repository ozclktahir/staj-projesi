"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { deleteTask } from "@/app/actions/delete-task";
import { getTaskDeletionPreview } from "@/app/actions/task-workflows";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TaskDeletionStatus } from "@/lib/supabase/types";

type DeleteTaskModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: {
    id: string;
    title: string;
    deletion_status?: TaskDeletionStatus | null;
  } | null;
  /** true ise metinler admin silme onayı diline kayar */
  isAdmin?: boolean;
  onDeleted?: (taskId: string) => void;
  onApprovalRequested?: (
    taskId: string,
    deletionStatus: TaskDeletionStatus,
  ) => void;
};

export function DeleteTaskModal({
  open,
  onOpenChange,
  task,
  isAdmin = false,
  onDeleted,
  onApprovalRequested,
}: DeleteTaskModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const [requiresApproval, setRequiresApproval] = useState(false);

  const pending =
    task?.deletion_status === "pending_admin_approval" ||
    task?.deletion_status === "pending_user_approval";

  useEffect(() => {
    if (!open || !task?.id || pending) {
      setPreviewMessage(null);
      setRequiresApproval(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      const preview = await getTaskDeletionPreview(task.id);
      if (cancelled) return;
      if (!preview.success) {
        setPreviewMessage(null);
        setRequiresApproval(false);
        return;
      }
      setRequiresApproval(preview.requiresApproval);
      setPreviewMessage(preview.message);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, task?.id, pending]);

  const onConfirm = async () => {
    if (!task?.id || pending) return;
    setIsDeleting(true);

    try {
      if (requiresApproval) {
        toast.message(
          isAdmin
            ? "Bu görevde ilerleme olduğu için silme talebi kullanıcıya iletilecektir."
            : "Bu görevde ilerleme olduğu için silme talebi yöneticiye iletilecektir.",
        );
      }

      const result = await deleteTask(task.id);
      if (!result.success) {
        console.error("[DeleteTaskModal]", result.error);
        toast.error(result.error);
        return;
      }

      if (result.mode === "approval_requested") {
        toast.success(result.message);
        onApprovalRequested?.(
          task.id,
          result.deletionStatus ??
            (isAdmin ? "pending_user_approval" : "pending_admin_approval"),
        );
        onOpenChange(false);
        return;
      }

      toast.success(result.message || "Görev başarıyla silindi");
      onOpenChange(false);
      onDeleted?.(task.id);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Görev silinirken bir hata oluştu.";
      console.error("[DeleteTaskModal] catch:", error);
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-lg border border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">
            {pending
              ? "Onay Bekleniyor"
              : requiresApproval
                ? isAdmin
                  ? "Silme Onayı İste"
                  : "Silme İsteği Gönder"
                : "Görevi Sil"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {pending ? (
              <>Bu görev için zaten bir silme onayı bekleniyor.</>
            ) : previewMessage ? (
              <>{previewMessage}</>
            ) : isAdmin ? (
              <>
                Görevde ilerleme varsa atanan kullanıcıdan onay istenir; yoksa
                doğrudan silinir.
              </>
            ) : (
              <>
                Görevde ilerleme varsa yöneticilerden onay istenir; henüz
                dokunulmamış görevler doğrudan silinir.
              </>
            )}
            {task?.title ? (
              <>
                {" "}
                <span className="font-medium text-foreground">
                  ({task.title})
                </span>
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="rounded-lg border-border"
            disabled={isDeleting}
            onClick={() => onOpenChange(false)}
          >
            İptal
          </Button>
          <Button
            type="button"
            disabled={isDeleting || !task?.id || pending}
            onClick={() => void onConfirm()}
            className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting
              ? "İşleniyor..."
              : requiresApproval
                ? isAdmin
                  ? "Kullanıcıdan Onay İste"
                  : "Yöneticiye İstek Gönder"
                : "Sil"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
