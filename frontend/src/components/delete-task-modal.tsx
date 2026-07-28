"use client";

import { useEffect, useState, useTransition } from "react";
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
  /** Optimistic silme geri alınırsa */
  onDeleteFailed?: (task: { id: string; title: string }) => void;
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
  onDeleteFailed,
  onApprovalRequested,
}: DeleteTaskModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [, startTransition] = useTransition();

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

  const onConfirm = () => {
    if (!task?.id || pending) return;

    const taskSnapshot = { id: task.id, title: task.title };
    const optimisticDirectDelete = !requiresApproval;

    if (optimisticDirectDelete) {
      onDeleted?.(taskSnapshot.id);
      onOpenChange(false);
    }

    setIsDeleting(true);
    startTransition(() => {
      void (async () => {
        try {
          if (requiresApproval) {
            toast.message(
              isAdmin
                ? "Bu görevde ilerleme olduğu için silme talebi kullanıcıya iletilecektir."
                : "Bu görevde ilerleme olduğu için silme talebi yöneticiye iletilecektir.",
            );
          }

          const result = await deleteTask(taskSnapshot.id);
          if (!result.success) {
            console.error("[DeleteTaskModal]", result.error);
            if (optimisticDirectDelete) onDeleteFailed?.(taskSnapshot);
            toast.error(result.error);
            return;
          }

          if (result.mode === "approval_requested") {
            if (optimisticDirectDelete) onDeleteFailed?.(taskSnapshot);
            toast.success(result.message);
            onApprovalRequested?.(
              taskSnapshot.id,
              result.deletionStatus ??
                (isAdmin ? "pending_user_approval" : "pending_admin_approval"),
            );
            if (!optimisticDirectDelete) onOpenChange(false);
            return;
          }

          toast.success(result.message || "Görev başarıyla silindi");
          if (!optimisticDirectDelete) {
            onOpenChange(false);
            onDeleted?.(taskSnapshot.id);
          }
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Görev silinirken bir hata oluştu.";
          console.error("[DeleteTaskModal] catch:", error);
          if (optimisticDirectDelete) onDeleteFailed?.(taskSnapshot);
          toast.error(message);
        } finally {
          setIsDeleting(false);
        }
      })();
    });
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
            onClick={onConfirm}
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
