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
  /**
   * Artık yalnızca çağıranların mevcut API'sini bozmamak için duruyor —
   * silme her zaman onaydan geçtiği için modal metinleri role göre değişmiyor.
   */
  isAdmin?: boolean;
  onApprovalRequested?: (
    taskId: string,
    deletionStatus: TaskDeletionStatus,
  ) => void;
};

export function DeleteTaskModal({
  open,
  onOpenChange,
  task,
  onApprovalRequested,
}: DeleteTaskModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const [approvalTarget, setApprovalTarget] = useState<
    "admin" | "assignee" | null
  >(null);
  const [, startTransition] = useTransition();

  const pending =
    task?.deletion_status === "pending_admin_approval" ||
    task?.deletion_status === "pending_user_approval";

  useEffect(() => {
    if (!open || !task?.id || pending) {
      setPreviewMessage(null);
      setApprovalTarget(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      const preview = await getTaskDeletionPreview(task.id);
      if (cancelled) return;
      if (!preview.success) {
        setPreviewMessage(null);
        setApprovalTarget(null);
        return;
      }
      setApprovalTarget(preview.approvalTarget);
      setPreviewMessage(preview.message);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, task?.id, pending]);

  /**
   * Silme ARTIK hiçbir durumda doğrudan gerçekleşmez — her zaman onay isteği
   * gönderilir (bkz. requestOrDeleteTask). Bu yüzden eskiden burada bulunan
   * "iyimser doğrudan silme" yolu kaldırıldı; görev, onaylanana kadar panoda
   * "onay bekleniyor" rozetiyle durmaya devam eder.
   */
  const onConfirm = () => {
    if (!task?.id || pending) return;

    const taskSnapshot = { id: task.id, title: task.title };
    setIsDeleting(true);
    startTransition(() => {
      void (async () => {
        try {
          const result = await deleteTask(taskSnapshot.id);
          if (!result.success) {
            console.error("[DeleteTaskModal]", result.error);
            toast.error(result.error);
            return;
          }

          toast.success(result.message);
          onApprovalRequested?.(
            taskSnapshot.id,
            result.deletionStatus ??
              (approvalTarget === "assignee"
                ? "pending_user_approval"
                : "pending_admin_approval"),
          );
          onOpenChange(false);
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
      })();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-lg border border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">
            {pending ? "Onay Bekleniyor" : "Silme İsteği Gönder"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {pending ? (
              <>Bu görev için zaten bir silme onayı bekleniyor.</>
            ) : previewMessage ? (
              <>{previewMessage}</>
            ) : (
              <>
                Görevler yalnızca ikinci bir kişinin onayıyla silinir. Bu istek
                onaylanana kadar görev yerinde kalır.
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
              : approvalTarget === "assignee"
                ? "Atanan Kişiden Onay İste"
                : "Yöneticiden Onay İste"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
