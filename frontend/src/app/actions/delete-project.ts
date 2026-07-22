"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { resolveWorkspaceRole } from "@/lib/workspace-permissions";

export type DeleteProjectResult =
  | {
      success: true;
      projectId: string;
      workspaceId: string | null;
    }
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
    return "Proje silinemedi.";
  }
}

/**
 * Projeyi siler (Admin / sahip).
 * Önce bağlı görevleri, sonra projeyi soft-delete eder; sütun yoksa hard delete.
 */
export async function deleteProject(
  projectId: string,
): Promise<DeleteProjectResult> {
  try {
    const id = projectId?.trim() ?? "";
    if (!id) {
      return { success: false, error: "Proje kimliği zorunludur." };
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return {
        success: false,
        error: "Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.",
      };
    }

    const { supabase, user } = auth;

    const { data: project, error: fetchError } = await supabase
      .from("projects")
      .select("id, workspace_id, user_id, created_by, name")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !project) {
      return {
        success: false,
        error: toPlainErrorMessage(fetchError ?? "Proje bulunamadı."),
      };
    }

    const workspaceId =
      typeof project.workspace_id === "string" ? project.workspace_id : null;

    let allowed = false;
    if (workspaceId) {
      const roleCtx = await resolveWorkspaceRole(
        supabase,
        workspaceId,
        user.id,
      );
      allowed = roleCtx.isAdmin;
    }

    const isOwner =
      (typeof project.user_id === "string" && project.user_id === user.id) ||
      (typeof project.created_by === "string" &&
        project.created_by === user.id);

    if (!allowed && !isOwner) {
      return {
        success: false,
        error: "Bu projeyi silme yetkiniz yok (yalnızca Admin veya sahip).",
      };
    }

    const deletedAt = new Date().toISOString();

    // Bağlı görevleri temizle
    let { error: tasksError } = await supabase
      .from("tasks")
      .update({ deleted_at: deletedAt })
      .eq("project_id", id);

    if (tasksError?.message?.includes("deleted_at")) {
      ({ error: tasksError } = await supabase
        .from("tasks")
        .delete()
        .eq("project_id", id));
    }

    if (tasksError) {
      console.warn("[deleteProject] tasks cleanup:", tasksError.message);
    }

    let { error: projectError } = await supabase
      .from("projects")
      .update({ deleted_at: deletedAt })
      .eq("id", id);

    if (projectError?.message?.includes("deleted_at")) {
      ({ error: projectError } = await supabase
        .from("projects")
        .delete()
        .eq("id", id));
    }

    if (projectError) {
      console.error("[deleteProject]", projectError);
      return { success: false, error: toPlainErrorMessage(projectError) };
    }

    revalidatePath(`/project/${id}`);
    revalidatePath("/");
    revalidatePath("/projects");

    return { success: true, projectId: id, workspaceId };
  } catch (error) {
    console.error("[deleteProject] catch:", toPlainErrorMessage(error));
    return { success: false, error: toPlainErrorMessage(error) };
  }
}
