"use client";

import { useState } from "react";
import { toast } from "sonner";
import { deleteWorkspace } from "@/app/actions/workspaces";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DeleteWorkspaceModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: {
    id: string;
    name: string;
  } | null;
  onDeleted?: (payload: {
    deletedId: string;
    nextWorkspaceId: string | null;
  }) => void;
};

export function DeleteWorkspaceModal({
  open,
  onOpenChange,
  workspace,
  onDeleted,
}: DeleteWorkspaceModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const onConfirm = async () => {
    if (!workspace?.id) return;
    setIsDeleting(true);

    try {
      const result = await deleteWorkspace(workspace.id);
      if (!result.success) {
        console.error("[DeleteWorkspaceModal]", result.error);
        toast.error(result.error);
        return;
      }

      toast.success(`"${workspace.name}" silindi`);
      onOpenChange(false);
      onDeleted?.({
        deletedId: workspace.id,
        nextWorkspaceId: result.nextWorkspaceId,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Workspace silinirken bir hata oluştu.";
      console.error("[DeleteWorkspaceModal] catch:", error);
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-lg border border-slate-200 bg-slate-50 sm:max-w-md dark:border-slate-700 dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="text-red-600 dark:text-red-400">
            Workspace&apos;i Sil
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {workspace?.name ?? "Bu workspace"}
            </span>{" "}
            kalıcı olarak silinecek. İlişkili projeler ve görevler de
            kaldırılabilir. Bu işlem geri alınamaz.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="rounded-lg border-slate-200 dark:border-slate-700"
            disabled={isDeleting}
            onClick={() => onOpenChange(false)}
          >
            İptal
          </Button>
          <Button
            type="button"
            disabled={isDeleting || !workspace?.id}
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
