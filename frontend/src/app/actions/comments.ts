"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import type { TaskComment } from "@/lib/supabase/types";
import {
  formatAuthUserLabel,
  formatMemberOptionLabel,
  PROFILE_SELECT_FIELDS,
  PROFILE_SELECT_FIELDS_FALLBACK,
} from "@/lib/member-labels";

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
    let { data: profiles, error } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT_FIELDS)
      .in("id", userIds);

    if (error) {
      ({ data: profiles, error } = await supabase
        .from("profiles")
        .select(PROFILE_SELECT_FIELDS_FALLBACK)
        .in("id", userIds));
    }

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
    const profile = uid ? profileById.get(uid) ?? null : null;
    const author = formatMemberOptionLabel(profile, null);
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

    const authorName = formatAuthUserLabel({
      email: user.email,
      user_metadata: user.user_metadata as {
        first_name?: string;
        last_name?: string;
        full_name?: string;
        display_name?: string;
      },
    });

    // Profil varsa onu tercih et
    const { data: profile } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT_FIELDS_FALLBACK)
      .eq("id", user.id)
      .maybeSingle();

    const resolvedAuthor = profile
      ? formatMemberOptionLabel(
          profile as Record<string, unknown>,
          user.email ?? null,
        )
      : authorName;

    return {
      success: true,
      comment: mapComment(
        data as Record<string, unknown>,
        resolvedAuthor === "Hesap" && authorName !== "Hesap"
          ? authorName
          : resolvedAuthor,
      ),
    };
  } catch (error) {
    console.error("[createComment] catch:", toPlainErrorMessage(error));
    return { success: false, error: toPlainErrorMessage(error) };
  }
}
