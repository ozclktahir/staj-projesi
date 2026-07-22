"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { resolveWorkspaceRole } from "@/lib/workspace-permissions";

export type DeleteTaskResult =
  | { success: true; taskId: string; projectId: string | null }
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
    return "Görev silinemedi.";
  }
}

/**
 * Görevi siler (önce soft-delete / deleted_at; sütun yoksa hard delete).
 * Admin: tüm görevler. Member: yalnızca kendisine atananlar.
 */
export async function deleteTask(taskId: string): Promise<DeleteTaskResult> {
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

    const { data: existing, error: fetchError } = await supabase
      .from("tasks")
      .select("id, workspace_id, project_id, assignee_id, assigned_to, created_by")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !existing) {
      return {
        success: false,
        error: toPlainErrorMessage(fetchError ?? "Görev bulunamadı."),
      };
    }

    const workspaceId =
      typeof existing.workspace_id === "string" ? existing.workspace_id : null;
    const projectId =
      typeof existing.project_id === "string" ? existing.project_id : null;

    if (workspaceId) {
      const roleCtx = await resolveWorkspaceRole(
        supabase,
        workspaceId,
        user.id,
      );

      if (!roleCtx.isAdmin) {
        const assignee =
          (typeof existing.assignee_id === "string" && existing.assignee_id) ||
          (typeof existing.assigned_to === "string" && existing.assigned_to) ||
          null;
        const isCreator =
          typeof existing.created_by === "string" &&
          existing.created_by === user.id;

        if (assignee !== user.id && !isCreator) {
          return {
            success: false,
            error: "Bu görevi silme yetkiniz yok.",
          };
        }
      }
    }

    const deletedAt = new Date().toISOString();
    let { error } = await supabase
      .from("tasks")
      .update({ deleted_at: deletedAt })
      .eq("id", id);

    if (error?.message?.includes("deleted_at")) {
      ({ error } = await supabase.from("tasks").delete().eq("id", id));
    }

    if (error) {
      console.error("[deleteTask]", error);
      return { success: false, error: toPlainErrorMessage(error) };
    }

    if (projectId) {
      revalidatePath(`/project/${projectId}`);
    }
    revalidatePath("/");
    revalidatePath("/projects");

    return { success: true, taskId: id, projectId };
  } catch (error) {
    console.error("[deleteTask] catch:", toPlainErrorMessage(error));
    return { success: false, error: toPlainErrorMessage(error) };
  }
}
