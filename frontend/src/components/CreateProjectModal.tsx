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

type CreateProjectModalProps = {
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "secondary" | "ghost";
  triggerClassName?: string;
  trigger?: ReactNode;
  /** Aktif workspace — Dashboard'dan geçirilmeli */
  workspaceId?: string | null;
};

export function CreateProjectModal({
  triggerLabel = "Yeni Proje",
  triggerVariant = "default",
  triggerClassName,
  trigger,
  workspaceId: workspaceIdProp = null,
}: CreateProjectModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      console.log("[CreateProjectModal] submit", {
        name,
        workspaceIdProp,
        activeWorkspaceId,
      });

      if (
        activeWorkspaceId == null ||
        activeWorkspaceId === "" ||
        activeWorkspaceId === "undefined" ||
        activeWorkspaceId === "null"
      ) {
        toast.error("Lütfen önce bir çalışma alanı seçin.");
        return;
      }

      const payload = {
        name,
        description,
        workspaceId: activeWorkspaceId,
      };
      console.log("[CreateProjectModal] createProject payload", payload);

      const result = await createProject(payload);

      if (!result.success) {
        console.error("[CreateProjectModal] createProject failed:", result.error);
        toast.error(result.error || "Proje oluşturulamadı.");
        return;
      }

      toast.success("Proje oluşturuldu");
      resetForm();
      setOpen(false);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Proje oluşturulurken bir hata oluştu.";
      console.error("[CreateProjectModal] catch:", error);
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
            {triggerLabel}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="rounded-[var(--radius)] border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni Proje</DialogTitle>
          <DialogDescription>
            Proje adı ve isteğe bağlı bir açıklama girin. Proje aktif çalışma
            alanına kaydedilir.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="project-name">Proje Adı</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Örn: Ürün Lansmanı"
              required
              className="rounded-[var(--radius)]"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-description">Açıklama</Label>
            <textarea
              id="project-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Kısa bir açıklama (opsiyonel)"
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
              İptal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="rounded-[var(--radius)] bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? "Oluşturuluyor..." : "Oluştur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
