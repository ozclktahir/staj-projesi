"use client";

import { useState } from "react";
import { MoreHorizontal, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { createComment, deleteComment } from "@/app/actions/comments";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatRelativeTime } from "@/lib/format-relative-time";
import type { TaskComment } from "@/lib/supabase/types";

type TaskCommentsProps = {
  taskId: string;
  comments: TaskComment[];
  onChange: (comments: TaskComment[]) => void;
};

export function TaskComments({
  taskId,
  comments,
  onChange,
}: TaskCommentsProps) {
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAdd() {
    const content = draft.trim();
    if (!content || submitting) return;
    setSubmitting(true);

    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: TaskComment = {
      id: optimisticId,
      task_id: taskId,
      content,
      user_id: null,
      author_name: "Sen",
      is_own: true,
      created_at: new Date().toISOString(),
    };
    onChange([...comments, optimistic]);
    setDraft("");

    const result = await createComment(taskId, content);
    setSubmitting(false);

    if (!result.success) {
      onChange(comments);
      setDraft(content);
      toast.error(result.error);
      return;
    }

    onChange([
      ...comments.filter((c) => c.id !== optimisticId),
      result.comment,
    ]);
    toast.success("Yorum eklendi");
  }

  async function handleDelete(commentId: string) {
    setDeletingId(commentId);
    const previous = comments;
    onChange(comments.filter((c) => c.id !== commentId));

    const result = await deleteComment(commentId);
    setDeletingId(null);

    if (!result.success) {
      onChange(previous);
      toast.error(result.error);
      return;
    }
    toast.success("Yorum silindi");
  }

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Yorumlar</h3>

      <div className="space-y-2">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={2}
          placeholder="Yorum yaz…"
          disabled={submitting}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
        />
        <Button
          type="button"
          size="sm"
          className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={!draft.trim() || submitting}
          onClick={() => void handleAdd()}
        >
          {submitting ? "Gönderiliyor…" : "Yorum Yap"}
        </Button>
      </div>

      {comments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-4 text-xs text-muted-foreground">
          Henüz yorum yok. İlk yorumunu ekle.
        </div>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => {
            const initials =
              comment.author_name?.trim().slice(0, 2).toUpperCase() || "?";

            return (
              <li
                key={comment.id}
                className="rounded-lg border border-border bg-card px-3 py-2"
              >
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {comment.author_avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={comment.author_avatar_url}
                        alt={comment.author_name}
                        className="size-7 shrink-0 rounded-full object-cover ring-1 ring-border"
                      />
                    ) : (
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                        {comment.author_name ? (
                          initials
                        ) : (
                          <UserRound className="size-3.5" />
                        )}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-foreground">
                        {comment.author_name || "Kullanıcı"}
                      </p>
                      <p
                        className="text-[11px] text-muted-foreground"
                        title={
                          comment.created_at
                            ? new Date(comment.created_at).toLocaleString(
                                "tr-TR",
                              )
                            : undefined
                        }
                      >
                        {formatRelativeTime(comment.created_at)}
                      </p>
                    </div>
                  </div>

                  {comment.is_own ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label="Yorum menüsü"
                          disabled={deletingId === comment.id}
                          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                        >
                          <MoreHorizontal className="size-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem
                          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                          onSelect={(event) => {
                            event.preventDefault();
                            void handleDelete(comment.id);
                          }}
                        >
                          <Trash2 className="size-3.5" />
                          Sil
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {comment.content}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
