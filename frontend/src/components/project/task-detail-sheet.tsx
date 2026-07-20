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

const priorityBadge: Record<ProjectTask["priority"], string> = {
  HIGH: "bg-red-100 text-red-700",
  MEDIUM: "bg-amber-100 text-amber-800",
  LOW: "bg-emerald-100 text-emerald-700",
};

const statusBadge: Record<ProjectTask["status"], string> = {
  TODO: "bg-slate-100 text-slate-600",
  IN_PROGRESS: "bg-sky-100 text-sky-700",
  DONE: "bg-emerald-100 text-emerald-700",
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
        className="absolute inset-0 bg-slate-900/20 transition-opacity"
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-sheet-title"
        className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl animate-in slide-in-from-right duration-200"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0 space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Task detail
            </p>
            <h2
              id="task-sheet-title"
              className="text-lg font-semibold tracking-tight text-slate-900"
            >
              {task.title}
            </h2>
            <div className="flex flex-wrap gap-2">
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-xs font-medium",
                  statusBadge[task.status],
                )}
              >
                {TASK_STATUS_LABELS[task.status]}
              </span>
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-xs font-medium",
                  priorityBadge[task.priority],
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
            className="shrink-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            onClick={onClose}
            aria-label="Kapat"
          >
            <X className="size-4" />
          </Button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Description
            </h3>
            <p className="text-sm leading-relaxed text-slate-600">
              {task.description?.trim()
                ? task.description
                : "Bu görev için henüz açıklama yok."}
            </p>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-700">
              <CheckSquare className="size-4 text-slate-400" />
              <h3 className="text-sm font-semibold">Checklist</h3>
            </div>
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-500">
              Checklist öğeleri bir sonraki iterasyonda eklenecek.
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-700">
              <MessageSquare className="size-4 text-slate-400" />
              <h3 className="text-sm font-semibold">Comments</h3>
            </div>
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-500">
              Yorumlar burada listelenecek.
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-700">
              <Paperclip className="size-4 text-slate-400" />
              <h3 className="text-sm font-semibold">Attachments</h3>
            </div>
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-500">
              Dosya ekleri burada görünecek.
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
