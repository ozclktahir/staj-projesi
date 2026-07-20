"use client";

import { useEffect, useState } from "react";
import { CheckSquare, MessageSquare } from "lucide-react";
import { getTaskDetails } from "@/app/actions/get-task-details";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type ProjectTask,
} from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

type CommentItem = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
};

type TaskDetailSheetProps = {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const CHECKLIST_SKELETON: ChecklistItem[] = [
  { id: "c1", label: "Gereksinimleri gözden geçir", done: true },
  { id: "c2", label: "İlk taslağı hazırla", done: false },
  { id: "c3", label: "Gözden geçirme için paylaş", done: false },
];

export function TaskDetailSheet({
  taskId,
  open,
  onOpenChange,
}: TaskDetailSheetProps) {
  const [task, setTask] = useState<ProjectTask | null>(null);
  const [description, setDescription] = useState("");
  const [checklist, setChecklist] = useState<ChecklistItem[]>(CHECKLIST_SKELETON);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !taskId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void getTaskDetails(taskId).then((result) => {
      if (cancelled) return;
      if (!result.success) {
        setTask(null);
        setError(result.error);
        setLoading(false);
        return;
      }
      setTask(result.task);
      setDescription(result.task.description ?? "");
      setChecklist(CHECKLIST_SKELETON);
      setComments([]);
      setCommentDraft("");
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, taskId]);

  function toggleChecklistItem(id: string) {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item,
      ),
    );
  }

  function addComment() {
    const body = commentDraft.trim();
    if (!body) return;
    setComments((prev) => [
      {
        id: `local-${Date.now()}`,
        author: "Sen",
        body,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setCommentDraft("");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="gap-0 overflow-y-auto p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Görev detayı
          </p>
          {loading ? (
            <>
              <SheetTitle className="text-foreground">Yükleniyor…</SheetTitle>
              <SheetDescription>Görev bilgileri getiriliyor.</SheetDescription>
            </>
          ) : error ? (
            <>
              <SheetTitle className="text-foreground">Hata</SheetTitle>
              <SheetDescription>{error}</SheetDescription>
            </>
          ) : task ? (
            <>
              <SheetTitle className="text-left leading-snug text-foreground">
                {task.title}
              </SheetTitle>
              <SheetDescription className="sr-only">
                Görev durumu, öncelik, açıklama, checklist ve yorumlar
              </SheetDescription>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-lg bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                  {TASK_STATUS_LABELS[task.status]}
                </span>
                <span
                  className={cn(
                    "rounded-lg bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground",
                    task.priority === "HIGH" && "bg-red-500/15 text-red-400",
                    task.priority === "MEDIUM" && "bg-primary/15 text-primary",
                    task.priority === "LOW" &&
                      "bg-emerald-500/15 text-emerald-400",
                  )}
                >
                  {TASK_PRIORITY_LABELS[task.priority]}
                </span>
              </div>
            </>
          ) : (
            <>
              <SheetTitle>Görev</SheetTitle>
              <SheetDescription>Detay bulunamadı.</SheetDescription>
            </>
          )}
        </SheetHeader>

        {!loading && !error && task ? (
          <div className="flex flex-1 flex-col gap-6 px-4 py-5">
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Açıklama
              </h3>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                placeholder="Açıklama ekle…"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              <p className="text-xs text-muted-foreground">
                Düzenleme UI hazır; kaydetme bir sonraki iterasyonda bağlanacak.
              </p>
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2 text-foreground">
                <CheckSquare className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">Checklist</h3>
                <span className="text-xs text-muted-foreground">
                  {checklist.filter((i) => i.done).length}/{checklist.length}
                </span>
              </div>
              <ul className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                {checklist.map((item) => (
                  <li key={item.id} className="flex items-start gap-2">
                    <input
                      id={`check-${item.id}`}
                      type="checkbox"
                      checked={item.done}
                      onChange={() => toggleChecklistItem(item.id)}
                      className="mt-0.5 size-4 rounded border-border accent-primary"
                    />
                    <label
                      htmlFor={`check-${item.id}`}
                      className={cn(
                        "text-sm text-foreground",
                        item.done && "text-muted-foreground line-through",
                      )}
                    >
                      {item.label}
                    </label>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                Checklist iskeleti — CRUD henüz yok.
              </p>
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2 text-foreground">
                <MessageSquare className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">Yorumlar</h3>
              </div>

              <div className="space-y-2">
                <textarea
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                  rows={2}
                  placeholder="Yorum yaz…"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
                <Button
                  type="button"
                  size="sm"
                  className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={!commentDraft.trim()}
                  onClick={addComment}
                >
                  Yorum ekle
                </Button>
              </div>

              {comments.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-4 text-xs text-muted-foreground">
                  Henüz yorum yok. İlk yorumunu ekle.
                </div>
              ) : (
                <ul className="space-y-3">
                  {comments.map((comment) => (
                    <li
                      key={comment.id}
                      className="rounded-lg border border-border bg-card px-3 py-2"
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-primary">
                          {comment.author}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleString("tr-TR")}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{comment.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
