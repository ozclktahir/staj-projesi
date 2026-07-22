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

type DeleteTaskModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: {
    id: string;
    title: string;
  } | null;
  onDeleted?: (taskId: string) => void;
};

export function DeleteTaskModal({
  open,
  onOpenChange,
  task,
  onDeleted,
}: DeleteTaskModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const onConfirm = async () => {
    if (!task?.id) return;
    setIsDeleting(true);

    try {
      const result = await deleteTask(task.id);
      if (!result.success) {
        console.error("[DeleteTaskModal]", result.error);
        toast.error(result.error);
        return;
      }

      toast.success("Görev başarıyla silindi");
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
          <DialogTitle className="text-red-600 dark:text-red-400">
            Görevi Sil
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Bu görevi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
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
            disabled={isDeleting || !task?.id}
            onClick={() => void onConfirm()}
            className="rounded-lg bg-red-600 text-white hover:bg-red-700"
          >
            {isDeleting ? "Siliniyor..." : "Evet, Sil"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
