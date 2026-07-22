"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
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

function isMissingRelationError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("does not exist") ||
    m.includes("could not find the table") ||
    m.includes("schema cache")
  );
}

/** İlişkili tabloları temizle; tablo yoksa sessizce geç. */
async function cleanupRelated(
  supabase: SupabaseClient,
  table: string,
  column: string,
  projectId: string,
): Promise<string | null> {
  const { error } = await supabase.from(table).delete().eq(column, projectId);
  if (!error) return null;
  if (isMissingRelationError(error.message)) {
    console.info(`[deleteProject] ${table} yok, atlandı`);
    return null;
  }
  console.warn(`[deleteProject] ${table} cleanup:`, error.message);
  return error.message;
}

/**
 * Projeyi kalıcı siler (Admin / sahip).
 * Sıra: ilişkili kayıtlar → tasks → projects.
 * RLS engeli veya 0 satır dönüşü başarısız sayılır.
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
      console.error("[deleteProject] fetch:", fetchError);
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

    console.info("[deleteProject] start", {
      projectId: id,
      workspaceId,
      userId: user.id,
      allowed,
      isOwner,
    });

    // 1) Opsiyonel ilişkili tablolar
    for (const table of [
      "project_members",
      "project_files",
      "files",
      "documents",
    ] as const) {
      await cleanupRelated(supabase, table, "project_id", id);
    }

    // 2) Görevler — hard delete (yorum/alt görev CASCADE beklenir)
    const { data: deletedTasks, error: tasksDeleteError } = await supabase
      .from("tasks")
      .delete()
      .eq("project_id", id)
      .select("id");

    if (tasksDeleteError) {
      console.error("[deleteProject] tasks hard delete:", tasksDeleteError);

      // Soft-delete fallback
      const deletedAt = new Date().toISOString();
      const { error: softTasksError } = await supabase
        .from("tasks")
        .update({ deleted_at: deletedAt })
        .eq("project_id", id);

      if (softTasksError) {
        console.error("[deleteProject] tasks soft delete:", softTasksError);
        return {
          success: false,
          error: `Görevler silinemedi (RLS/FK): ${toPlainErrorMessage(
            softTasksError.message.includes("deleted_at")
              ? tasksDeleteError
              : softTasksError,
          )}. Supabase'te fix_projects_delete_rls.sql migration'ını çalıştırın.`,
        };
      }
      console.warn(
        "[deleteProject] tasks soft-deleted (hard delete RLS/FK engelli)",
      );
    } else {
      console.info("[deleteProject] tasks deleted", {
        count: deletedTasks?.length ?? 0,
      });
    }

    // 3) Projeyi hard delete — etkilenen satırı doğrula
    const { data: deletedProjects, error: projectDeleteError } = await supabase
      .from("projects")
      .delete()
      .eq("id", id)
      .select("id");

    if (projectDeleteError) {
      console.error("[deleteProject] hard delete:", projectDeleteError);

      // Soft-delete fallback
      const deletedAt = new Date().toISOString();
      const { data: softRows, error: softError } = await supabase
        .from("projects")
        .update({ deleted_at: deletedAt })
        .eq("id", id)
        .select("id");

      if (softError?.message?.includes("deleted_at")) {
        return {
          success: false,
          error: `Proje silinemedi (RLS): ${toPlainErrorMessage(projectDeleteError)}. Supabase'te fix_projects_delete_rls.sql migration'ını çalıştırın.`,
        };
      }

      if (softError || !softRows?.length) {
        console.error("[deleteProject] soft delete:", softError, softRows);
        return {
          success: false,
          error: `Proje silinemedi: ${toPlainErrorMessage(
            softError ?? projectDeleteError ?? "RLS satırı engelledi (0 satır).",
          )}. Supabase'te fix_projects_delete_rls.sql migration'ını çalıştırın.`,
        };
      }

      console.warn("[deleteProject] project soft-deleted");
    } else if (!deletedProjects?.length) {
      console.error(
        "[deleteProject] hard delete 0 satır — RLS DELETE politikası eksik olabilir",
      );
      return {
        success: false,
        error:
          "Proje silinemedi: RLS DELETE izni yok (0 satır). Supabase'te fix_projects_delete_rls.sql migration'ını çalıştırın.",
      };
    } else {
      console.info("[deleteProject] project deleted", deletedProjects);
    }

    revalidatePath(`/project/${id}`);
    revalidatePath("/");
    revalidatePath("/projects");
    revalidatePath("/dashboard");

    return { success: true, projectId: id, workspaceId };
  } catch (error) {
    console.error("[deleteProject] catch:", toPlainErrorMessage(error));
    return { success: false, error: toPlainErrorMessage(error) };
  }
}
