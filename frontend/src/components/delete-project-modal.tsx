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
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const onConfirm = async () => {
    if (!project?.id) return;
    setIsDeleting(true);

    try {
      const result = await deleteProject(project.id);
      if (!result.success) {
        console.error("[DeleteProjectModal] deleteProject failed:", result.error);
        toast.error(result.error);
        return;
      }

      toast.success(`"${project.name}" silindi`);
      onOpenChange(false);

      const workspaceId = result.workspaceId ?? project.workspaceId ?? null;
      const target = withWorkspaceQuery("/", workspaceId);

      // Liste/sidebar anında yenilensin
      router.refresh();
      window.location.assign(target);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Proje silinirken bir hata oluştu.";
      console.error("[DeleteProjectModal] catch:", error);
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
            Projeyi Sil
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Bu projeyi sildiğinizde projeye ait tüm görevler ve veriler kalıcı
            olarak silinecektir. Devam etmek istiyor musunuz?
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
            İptal
          </Button>
          <Button
            type="button"
            disabled={isDeleting || !project?.id}
            onClick={() => void onConfirm()}
            className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Siliniyor..." : "Evet, Projeyi Sil"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
