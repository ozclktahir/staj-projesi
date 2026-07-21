"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import type { TaskComment } from "@/lib/supabase/types";

export type GetCommentsResult =
  | { success: true; comments: TaskComment[] }
  | { success: false; error: string };

export type CreateCommentResult =
  | { success: true; comment: TaskComment }
  | { success: false; error: string };

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

function authorFromProfile(
  profile: Record<string, unknown> | null | undefined,
  fallback: string,
): string {
  if (!profile) return fallback;
  const name =
    (typeof profile.full_name === "string" && profile.full_name) ||
    (typeof profile.name === "string" && profile.name) ||
    (typeof profile.username === "string" && profile.username) ||
    (typeof profile.email === "string" && profile.email);
  return name || fallback;
}

function mapComment(
  row: Record<string, unknown>,
  authorName: string,
): TaskComment {
  const content =
    (typeof row.content === "string" && row.content) ||
    (typeof row.body === "string" && row.body) ||
    "";
  return {
    id: row.id as string,
    task_id: row.task_id as string,
    content,
    user_id: (row.user_id as string | null) ?? null,
    author_name: authorName,
    created_at: (row.created_at as string | null) ?? null,
  };
}

async function enrichComments(
  supabase: SupabaseClient,
  rows: Record<string, unknown>[],
): Promise<TaskComment[]> {
  if (!rows.length) return [];

  const userIds = [
    ...new Set(
      rows
        .map((r) => r.user_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  ];

  const profileById = new Map<string, Record<string, unknown>>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("id", userIds);

    for (const profile of profiles ?? []) {
      if (profile && typeof profile === "object" && "id" in profile) {
        profileById.set(
          String((profile as { id: string }).id),
          profile as Record<string, unknown>,
        );
      }
    }
  }

  return rows.map((row) => {
    const uid = typeof row.user_id === "string" ? row.user_id : null;
    const author = authorFromProfile(
      uid ? profileById.get(uid) : null,
      "Kullanıcı",
    );
    return mapComment(row, author);
  });
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

    const { supabase } = auth;

    const { data: comments, error } = await supabase
      .from("comments")
      .select("id, task_id, user_id, content, created_at")
      .eq("task_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      if (error.message?.includes("content")) {
        const fallback = await supabase
          .from("comments")
          .select("id, task_id, user_id, body, created_at")
          .eq("task_id", id)
          .order("created_at", { ascending: true });

        if (fallback.error) {
          console.error("[getTaskComments]", fallback.error);
          return {
            success: false,
            error: toPlainErrorMessage(fallback.error),
          };
        }

        return {
          success: true,
          comments: await enrichComments(
            supabase,
            (fallback.data ?? []) as Record<string, unknown>[],
          ),
        };
      }

      console.error("[getTaskComments]", error);
      return { success: false, error: toPlainErrorMessage(error) };
    }

    return {
      success: true,
      comments: await enrichComments(
        supabase,
        (comments ?? []) as Record<string, unknown>[],
      ),
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
      .select("id, project_id")
      .eq("id", id)
      .maybeSingle();

    let { data, error } = await supabase
      .from("comments")
      .insert({
        task_id: id,
        user_id: user.id,
        content: body,
      })
      .select("id, task_id, user_id, content, created_at")
      .single();

    if (error?.message?.includes("content")) {
      ({ data, error } = await supabase
        .from("comments")
        .insert({
          task_id: id,
          user_id: user.id,
          body,
        })
        .select("id, task_id, user_id, body, created_at")
        .single());
    }

    if (error || !data) {
      console.error("[createComment]", error);
      return {
        success: false,
        error: toPlainErrorMessage(error ?? "Yorum eklenemedi."),
      };
    }

    if (typeof task?.project_id === "string") {
      revalidatePath(`/project/${task.project_id}`);
    }

    const authorName =
      (typeof user.user_metadata?.full_name === "string" &&
        user.user_metadata.full_name) ||
      user.email ||
      "Sen";

    return {
      success: true,
      comment: mapComment(data as Record<string, unknown>, authorName),
    };
  } catch (error) {
    console.error("[createComment] catch:", toPlainErrorMessage(error));
    return { success: false, error: toPlainErrorMessage(error) };
  }
}
