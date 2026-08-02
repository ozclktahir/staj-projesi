"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createWorkspace } from "@/app/actions/workspaces";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { writeActiveWorkspaceId } from "@/hooks/use-workspaces";
import { useTranslation } from "@/i18n/use-translation";

type CreateWorkspaceModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (workspace: {
    id: string;
    name: string;
    description: string | null;
    owner_id: string | null;
    role?: string | null;
    created_at: string | null;
    updated_at: string | null;
  }) => void;
};

export function CreateWorkspaceModal({
  open,
  onOpenChange,
  onCreated,
}: CreateWorkspaceModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName("");
    setDescription("");
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await createWorkspace({ name, description });
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      writeActiveWorkspaceId(result.workspace.id);
      toast.success(t("workspaceModal.created"));
      resetForm();
      onOpenChange(false);
      onCreated?.(result.workspace);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("workspaceModal.createFailed"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) resetForm();
      }}
    >
      <DialogContent className="rounded-lg border border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {t("workspaceModal.createTitle")}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t("workspaceModal.createDesc")}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="workspace-name" className="text-foreground">
              {t("workspaceModal.nameLabel")}
            </Label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("workspaceModal.namePlaceholder")}
              required
              disabled={isSubmitting}
              className="rounded-lg border-border bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="workspace-description"
              className="text-foreground"
            >
              {t("workspaceModal.descriptionLabel")}
            </Label>
            <textarea
              id="workspace-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("workspaceModal.descriptionPlaceholder")}
              rows={3}
              disabled={isSubmitting}
              className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-lg border-border"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              {t("workspaceModal.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting
                ? t("workspaceModal.creating")
                : t("workspaceModal.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
