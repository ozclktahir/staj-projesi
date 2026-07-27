"use client";

import { useState } from "react";
import { toast } from "sonner";
import { deleteTask } from "@/app/actions/delete-task";
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
  onApprovalRequested?: (taskId: string, deletionStatus: TaskDeletionStatus) => void;
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

  const pending =
    task?.deletion_status === "pending_admin_approval" ||
    task?.deletion_status === "pending_user_approval";

  const onConfirm = async () => {
    if (!task?.id || pending) return;
    setIsDeleting(true);

    try {
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
            {isAdmin ? "Görevi Sil / Kapat" : "Silme İsteği"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {pending ? (
              <>Bu görev için zaten bir silme onayı bekleniyor.</>
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
              : isAdmin
                ? "Sil / Onay İste"
                : "Silme İsteği Gönder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
