"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { createProject } from "@/app/actions/create-project";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readActiveWorkspaceId } from "@/hooks/use-workspaces";
import { useTranslation } from "@/i18n/use-translation";

type CreateProjectModalProps = {
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "secondary" | "ghost";
  triggerClassName?: string;
  trigger?: ReactNode;
  workspaceId?: string | null;
};

export function CreateProjectModal({
  triggerLabel,
  triggerVariant = "default",
  triggerClassName,
  trigger,
  workspaceId: workspaceIdProp = null,
}: CreateProjectModalProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const resolvedTriggerLabel = triggerLabel ?? t("projectModal.newProject");

  const resolveWorkspaceId = (): string | null => {
    const fromProp =
      typeof workspaceIdProp === "string" ? workspaceIdProp.trim() : "";
    if (fromProp) return fromProp;
    const fromStore = readActiveWorkspaceId();
    return fromStore?.trim() || null;
  };

  const resetForm = () => {
    setName("");
    setDescription("");
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const activeWorkspaceId = resolveWorkspaceId();

      if (
        activeWorkspaceId == null ||
        activeWorkspaceId === "" ||
        activeWorkspaceId === "undefined" ||
        activeWorkspaceId === "null"
      ) {
        toast.error(t("projectModal.needWorkspace"));
        return;
      }

      const result = await createProject({
        name,
        description,
        workspaceId: activeWorkspaceId,
      });

      if (!result.success) {
        toast.error(result.error || t("projectModal.createFailed"));
        return;
      }

      toast.success(t("projectModal.created"));
      resetForm();
      setOpen(false);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("projectModal.createFailed");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          resetForm();
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            type="button"
            variant={triggerVariant}
            className={
              triggerClassName ??
              "rounded-[var(--radius)] bg-primary text-primary-foreground hover:bg-primary/90"
            }
          >
            <Plus className="size-4" />
            {resolvedTriggerLabel}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="rounded-[var(--radius)] border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("projectModal.createTitle")}</DialogTitle>
          <DialogDescription>{t("projectModal.createDesc")}</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="project-name">{t("projectModal.nameLabel")}</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("projectModal.namePlaceholder")}
              required
              className="rounded-[var(--radius)]"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-description">
              {t("projectModal.descriptionLabel")}
            </Label>
            <textarea
              id="project-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("projectModal.descriptionPlaceholder")}
              rows={4}
              disabled={isSubmitting}
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-[var(--radius)] border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-[var(--radius)]"
              disabled={isSubmitting}
              onClick={() => setOpen(false)}
            >
              {t("projectModal.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="rounded-[var(--radius)] bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting
                ? t("projectModal.creating")
                : t("projectModal.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
