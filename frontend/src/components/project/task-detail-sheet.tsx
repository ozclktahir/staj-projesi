"use client";

import { useEffect, useState } from "react";
import { X, CheckSquare, MessageSquare, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type ProjectTask,
} from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type TaskDetailSheetProps = {
  task: ProjectTask | null;
  open: boolean;
  onClose: () => void;
};

export function TaskDetailSheet({ task, open, onClose }: TaskDetailSheetProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !open || !task) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Paneli kapat"
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-sheet-title"
        className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Görev detayı
            </p>
            <h2
              id="task-sheet-title"
              className="text-lg font-semibold tracking-tight text-foreground"
            >
              {task.title}
            </h2>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-[var(--radius)] bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                {TASK_STATUS_LABELS[task.status]}
              </span>
              <span
                className={cn(
                  "rounded-[var(--radius)] bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground",
                  task.priority === "HIGH" && "text-red-500",
                  task.priority === "MEDIUM" && "text-primary",
                )}
              >
                {TASK_PRIORITY_LABELS[task.priority]}
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={onClose}
            aria-label="Kapat"
          >
            <X className="size-4" />
          </Button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Açıklama
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {task.description?.trim()
                ? task.description
                : "Bu görev için henüz açıklama yok."}
            </p>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-foreground">
              <CheckSquare className="size-4 text-primary" />
              <h3 className="text-sm font-semibold">Checklist</h3>
            </div>
            <div className="rounded-[var(--radius)] border border-dashed border-border bg-muted/40 px-3 py-4 text-xs text-muted-foreground">
              Checklist öğeleri bir sonraki iterasyonda eklenecek.
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-foreground">
              <MessageSquare className="size-4 text-primary" />
              <h3 className="text-sm font-semibold">Yorumlar</h3>
            </div>
            <div className="rounded-[var(--radius)] border border-dashed border-border bg-muted/40 px-3 py-4 text-xs text-muted-foreground">
              Yorumlar burada listelenecek.
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-foreground">
              <Paperclip className="size-4 text-primary" />
              <h3 className="text-sm font-semibold">Ekler</h3>
            </div>
            <div className="rounded-[var(--radius)] border border-dashed border-border bg-muted/40 px-3 py-4 text-xs text-muted-foreground">
              Dosya ekleri burada görünecek.
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
