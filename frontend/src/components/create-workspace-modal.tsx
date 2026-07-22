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
      toast.success("Workspace oluşturuldu");
      resetForm();
      onOpenChange(false);
      // State tetikleme: parent upsertWorkspace + refresh
      onCreated?.(result.workspace);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Workspace oluşturulurken bir hata oluştu.",
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
            Create New Workspace
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Yeni bir çalışma alanı oluştur. Ad zorunludur.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="workspace-name" className="text-foreground">
              Workspace Name
            </Label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Örn: Pazarlama Ekibi"
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
              Description
            </Label>
            <textarea
              id="workspace-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="İsteğe bağlı açıklama"
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
              İptal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? "Oluşturuluyor..." : "Oluştur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
