"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { createTask } from "@/app/actions/create-task";
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
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/supabase/types";

type CreateTaskModalProps = {
  projectId: string;
};

const fieldClassName =
  "flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50";

const textareaClassName =
  "flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50";

export function CreateTaskModal({ projectId }: CreateTaskModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStatus("TODO");
    setPriority("MEDIUM");
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await createTask({
        projectId,
        title,
        description,
        status,
        priority,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Görev oluşturuldu");
      resetForm();
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Görev oluşturulurken bir hata oluştu.",
      );
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
        <Button
          type="button"
          className="rounded-lg bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <Plus className="size-4" />
          Yeni Görev Ekle
        </Button>
      </DialogTrigger>

      <DialogContent className="rounded-lg border border-slate-200 bg-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Yeni Görev</DialogTitle>
          <DialogDescription className="text-slate-500">
            Başlık zorunludur. Durum ve öncelik varsayılan değerlerle gelir.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="task-title" className="text-slate-700">
              Başlık
            </Label>
            <Input
              id="task-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Örn: API entegrasyonunu tamamla"
              required
              className={fieldClassName}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-description" className="text-slate-700">
              Açıklama
            </Label>
            <textarea
              id="task-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="İsteğe bağlı açıklama"
              rows={3}
              disabled={isSubmitting}
              className={textareaClassName}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="task-status" className="text-slate-700">
                Durum
              </Label>
              <select
                id="task-status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as TaskStatus)
                }
                disabled={isSubmitting}
                className={fieldClassName}
              >
                {TASK_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {TASK_STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-priority" className="text-slate-700">
                Öncelik
              </Label>
              <select
                id="task-priority"
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value as TaskPriority)
                }
                disabled={isSubmitting}
                className={fieldClassName}
              >
                {TASK_PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {TASK_PRIORITY_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50"
              disabled={isSubmitting}
              onClick={() => setOpen(false)}
            >
              İptal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !title.trim()}
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
