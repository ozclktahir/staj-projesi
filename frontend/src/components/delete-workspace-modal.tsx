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
      <DialogContent className="rounded-lg border border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">
            Workspace&apos;i Sil
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            <span className="font-medium text-foreground">
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
            className="rounded-lg border-border"
            disabled={isDeleting}
            onClick={() => onOpenChange(false)}
          >
            İptal
          </Button>
          <Button
            type="button"
            disabled={isDeleting || !workspace?.id}
            onClick={() => void onConfirm()}
            className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Siliniyor..." : "Evet, Sil"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
