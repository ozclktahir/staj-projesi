"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-logger";
import type { TaskComment } from "@/lib/supabase/types";
import {
  formatAuthUserLabel,
  formatPersonName,
  loadProfilesByIds,
  resolveMemberDisplayFields,
} from "@/lib/member-labels";

export type GetCommentsResult =
  | { success: true; comments: TaskComment[]; currentUserId: string }
  | { success: false; error: string };

export type CreateCommentResult =
  | { success: true; comment: TaskComment }
  | { success: false; error: string };

export type DeleteCommentResult =
  | { success: true }
  | { success: false; error: string };

const COMMENT_TABLES = ["task_comments", "comments"] as const;

function toPlainErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "Yorum işlemi başarısız.";
  }
}

function isMissingRelation(message: string | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("does not exist") ||
    m.includes("schema cache") ||
    m.includes("could not find the table")
  );
}

function mapComment(
  row: Record<string, unknown>,
  author: {
    name: string;
    avatarUrl: string | null;
    email: string | null;
  },
  currentUserId: string | null,
): TaskComment {
  const content =
    (typeof row.content === "string" && row.content) ||
    (typeof row.body === "string" && row.body) ||
    "";
  const userId = (row.user_id as string | null) ?? null;
  return {
    id: row.id as string,
    task_id: row.task_id as string,
    content,
    user_id: userId,
    author_name: author.name,
    author_avatar_url: author.avatarUrl,
    author_email: author.email,
    is_own: Boolean(userId && currentUserId && userId === currentUserId),
    created_at: (row.created_at as string | null) ?? null,
  };
}

async function enrichComments(
  supabase: SupabaseClient,
  rows: Record<string, unknown>[],
  currentUserId: string | null,
): Promise<TaskComment[]> {
  if (!rows.length) return [];

  const userIds = [
    ...new Set(
      rows
        .map((r) => r.user_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  ];

  const profileById =
    userIds.length > 0
      ? await loadProfilesByIds(supabase, userIds)
      : new Map<string, Record<string, unknown>>();

  return rows.map((row) => {
    const uid = typeof row.user_id === "string" ? row.user_id : null;
    const profile = uid ? profileById.get(uid) ?? null : null;
    const fields = resolveMemberDisplayFields(profile, null);
    const name = formatPersonName(profile, fields.email) || fields.displayName;
    return mapComment(
      row,
      {
        name,
        avatarUrl: fields.avatarUrl,
        email: fields.email,
      },
      currentUserId,
    );
  });
}

async function fetchCommentRows(
  supabase: SupabaseClient,
  taskId: string,
): Promise<{ rows: Record<string, unknown>[]; table: string } | { error: string }> {
  for (const table of COMMENT_TABLES) {
    const withJoin = await supabase
      .from(table)
      .select(
        "id, task_id, user_id, content, created_at, profiles(full_name, avatar_url, email)",
      )
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    if (!withJoin.error) {
      return {
        rows: (withJoin.data ?? []) as Record<string, unknown>[],
        table,
      };
    }

    const plain = await supabase
      .from(table)
      .select("id, task_id, user_id, content, created_at")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    if (!plain.error) {
      return {
        rows: (plain.data ?? []) as Record<string, unknown>[],
        table,
      };
    }

    if (plain.error.message?.includes("content")) {
      const bodyFallback = await supabase
        .from(table)
        .select("id, task_id, user_id, body, created_at")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });
      if (!bodyFallback.error) {
        return {
          rows: (bodyFallback.data ?? []) as Record<string, unknown>[],
          table,
        };
      }
    }

    if (!isMissingRelation(plain.error.message)) {
      return { error: toPlainErrorMessage(plain.error) };
    }
  }

  return { error: "Yorum tablosu bulunamadı. SQL migration'ı çalıştırın." };
}

export async function getTaskComments(
  taskId: string,
): Promise<GetCommentsResult> {
  try {
    const id = taskId?.trim() ?? "";
    if (!id) {
      return { success: false, error: "Görev kimliği zorunludur." };
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return {
        success: false,
        error: "Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.",
      };
    }

    const { supabase, user } = auth;
    const fetched = await fetchCommentRows(supabase, id);
    if ("error" in fetched) {
      console.error("[getTaskComments]", fetched.error);
      return { success: false, error: fetched.error };
    }

    // Join'den gelen profil varsa kullan; yoksa enrich
    const comments = await enrichComments(
      supabase,
      fetched.rows.map((row) => {
        const nested = row.profiles;
        if (nested && typeof nested === "object" && !Array.isArray(nested)) {
          return row;
        }
        if (Array.isArray(nested) && nested[0]) {
          return { ...row, profiles: nested[0] };
        }
        return row;
      }),
      user.id,
    );

    // Nested profiles join başarılıysa author alanlarını bir kez daha düzelt
    const withJoinAuthors = comments.map((comment, index) => {
      const row = fetched.rows[index];
      const nested = row?.profiles;
      const profile =
        nested && typeof nested === "object" && !Array.isArray(nested)
          ? (nested as Record<string, unknown>)
          : Array.isArray(nested) && nested[0]
            ? (nested[0] as Record<string, unknown>)
            : null;
      if (!profile) return comment;
      const fields = resolveMemberDisplayFields(profile, null);
      const name = formatPersonName(profile, fields.email) || comment.author_name;
      return {
        ...comment,
        author_name: name,
        author_avatar_url: fields.avatarUrl ?? comment.author_avatar_url,
        author_email: fields.email ?? comment.author_email,
      };
    });

    return {
      success: true,
      comments: withJoinAuthors,
      currentUserId: user.id,
    };
  } catch (error) {
    console.error("[getTaskComments] catch:", toPlainErrorMessage(error));
    return { success: false, error: toPlainErrorMessage(error) };
  }
}

export async function createComment(
  taskId: string,
  content: string,
): Promise<CreateCommentResult> {
  try {
    const id = taskId?.trim() ?? "";
    const body = content?.trim() ?? "";
    if (!id) {
      return { success: false, error: "Görev kimliği zorunludur." };
    }
    if (!body) {
      return { success: false, error: "Yorum boş olamaz." };
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return {
        success: false,
        error: "Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.",
      };
    }

    const { supabase, user } = auth;

    const { data: task } = await supabase
      .from("tasks")
      .select("id, title, project_id, workspace_id")
      .eq("id", id)
      .maybeSingle();

    let data: Record<string, unknown> | null = null;
    let lastError: unknown = null;

    for (const table of COMMENT_TABLES) {
      const attempt = await supabase
        .from(table)
        .insert({
          task_id: id,
          user_id: user.id,
          content: body,
        })
        .select("id, task_id, user_id, content, created_at")
        .single();

      if (!attempt.error && attempt.data) {
        data = attempt.data as Record<string, unknown>;
        break;
      }

      if (attempt.error?.message?.includes("content")) {
        const bodyAttempt = await supabase
          .from(table)
          .insert({
            task_id: id,
            user_id: user.id,
            body,
          })
          .select("id, task_id, user_id, body, created_at")
          .single();
        if (!bodyAttempt.error && bodyAttempt.data) {
          data = bodyAttempt.data as Record<string, unknown>;
          break;
        }
        lastError = bodyAttempt.error;
        continue;
      }

      if (!isMissingRelation(attempt.error?.message)) {
        lastError = attempt.error;
        break;
      }
      lastError = attempt.error;
    }

    if (!data) {
      console.error("[createComment]", lastError);
      return {
        success: false,
        error: toPlainErrorMessage(lastError ?? "Yorum eklenemedi."),
      };
    }

    const workspaceId =
      typeof task?.workspace_id === "string" ? task.workspace_id : null;
    const projectId =
      typeof task?.project_id === "string" ? task.project_id : null;

    if (workspaceId) {
      await logActivity(supabase, {
        workspaceId,
        projectId,
        taskId: id,
        userId: user.id,
        actionType: "comment_added",
        details: {
          task_title:
            typeof task?.title === "string" ? task.title : "görev",
          preview: body.slice(0, 120),
        },
      });
    }

    if (projectId) {
      revalidatePath(`/project/${projectId}`);
    }

    const authorName = formatAuthUserLabel({
      email: user.email,
      user_metadata: user.user_metadata as {
        first_name?: string;
        last_name?: string;
        full_name?: string;
        display_name?: string;
      },
    });

    const profile =
      (await loadProfilesByIds(supabase, [user.id])).get(user.id) ?? null;
    const fields = resolveMemberDisplayFields(profile, user.email ?? null);
    const resolvedAuthor =
      formatPersonName(profile, user.email ?? null) || authorName;

    return {
      success: true,
      comment: mapComment(
        data,
        {
          name: resolvedAuthor || authorName,
          avatarUrl: fields.avatarUrl,
          email: fields.email,
        },
        user.id,
      ),
    };
  } catch (error) {
    console.error("[createComment] catch:", toPlainErrorMessage(error));
    return { success: false, error: toPlainErrorMessage(error) };
  }
}

export async function deleteComment(
  commentId: string,
): Promise<DeleteCommentResult> {
  try {
    const id = commentId?.trim() ?? "";
    if (!id) {
      return { success: false, error: "Yorum kimliği zorunludur." };
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return {
        success: false,
        error: "Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.",
      };
    }

    const { supabase, user } = auth;
    let deleted = false;
    let lastError: unknown = null;

    for (const table of COMMENT_TABLES) {
      const result = await supabase
        .from(table)
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id");

      if (!result.error) {
        deleted = (result.data?.length ?? 0) > 0;
        if (deleted) break;
        // satır yok / başka tablo — devam
        continue;
      }

      if (!isMissingRelation(result.error.message)) {
        lastError = result.error;
        break;
      }
      lastError = result.error;
    }

    if (!deleted) {
      return {
        success: false,
        error: toPlainErrorMessage(
          lastError ?? "Yorum silinemedi veya yetkiniz yok.",
        ),
      };
    }

    return { success: true };
  } catch (error) {
    console.error("[deleteComment] catch:", toPlainErrorMessage(error));
    return { success: false, error: toPlainErrorMessage(error) };
  }
}
