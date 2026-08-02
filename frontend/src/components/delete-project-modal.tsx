"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteProject } from "@/app/actions/delete-project";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/i18n/use-translation";
import { withWorkspaceQuery } from "@/lib/active-workspace";

type DeleteProjectModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: {
    id: string;
    name: string;
    workspaceId?: string | null;
  } | null;
};

export function DeleteProjectModal({
  open,
  onOpenChange,
  project,
}: DeleteProjectModalProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const onConfirm = async () => {
    if (!project?.id) return;
    setIsDeleting(true);

    try {
      const result = await deleteProject(project.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(t("projectModal.deleted", { name: project.name }));
      onOpenChange(false);

      const workspaceId = result.workspaceId ?? project.workspaceId ?? null;
      const target = withWorkspaceQuery("/", workspaceId);

      router.refresh();
      window.location.assign(target);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("projectModal.deleteFailed");
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
            {t("projectModal.deleteTitle")}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t("projectModal.deleteDesc")}
            {project?.name ? (
              <>
                {" "}
                <span className="font-medium text-foreground">
                  ({project.name})
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
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            disabled={isDeleting || !project?.id}
            onClick={() => void onConfirm()}
            className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting
              ? t("projectModal.deleting")
              : t("projectModal.deleteConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
