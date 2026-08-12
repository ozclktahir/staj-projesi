"use server";

import { revalidatePath } from "next/cache";
import { logActionError } from "@/lib/action-result";
import { cleanText, emailLocalPart, formatPersonName } from "@/lib/member-labels";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { resolveWorkspaceRole } from "@/lib/workspace-permissions";

export type TaskAssigneeOption = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

export type GetTaskAssigneesResult =
  | { success: true; assignees: TaskAssigneeOption[] }
  | { success: false; error: string; assignees: [] };

/** Görevin ek atananları (task_assignees) — birincil assignee_id'ye ek olarak. */
export async function getTaskAssignees(
  taskId: string,
): Promise<GetTaskAssigneesResult> {
  try {
    const id = taskId?.trim() ?? "";
    if (!id) return { success: false, error: "Görev kimliği zorunlu.", assignees: [] };

    const auth = await getAuthenticatedUser();
    if (!auth) return { success: false, error: "Oturum bulunamadı.", assignees: [] };

    const { supabase } = auth;
    const { data, error } = await supabase
      .from("task_assignees")
      .select("user_id, profiles:user_id(id, email, full_name, avatar_url, first_name, last_name)")
      .eq("task_id", id);

    if (error) {
      if (error.message.includes("task_assignees")) {
        // Migration henüz uygulanmamış — sessizce boş dön (özellik opsiyonel).
        return { success: true, assignees: [] };
      }
      return { success: false, error: error.message, assignees: [] };
    }

    const assignees: TaskAssigneeOption[] = (data ?? []).map((row) => {
      const profile = (Array.isArray(row.profiles) ? row.profiles[0] : row.profiles) as
        | Record<string, unknown>
        | null;
      const displayName =
        formatPersonName(profile, null) ||
        cleanText(profile?.email as string | null) ||
        emailLocalPart(profile?.email as string | null) ||
        String(row.user_id).slice(0, 8);
      return {
        id: String(row.user_id),
        displayName,
        avatarUrl:
          typeof profile?.avatar_url === "string" ? profile.avatar_url : null,
      };
    });

    return { success: true, assignees };
  } catch (error) {
    return {
      success: false,
      error: logActionError("getTaskAssignees", error, "Atananlar alınamadı."),
      assignees: [],
    };
  }
}

export type SetTaskAssigneesResult =
  | { success: true; assignees: TaskAssigneeOption[] }
  | { success: false; error: string };

/**
 * Görevin ek atanan listesini (userIds) tam olarak bu kümeyle değiştirir.
 * Yalnızca workspace admin/owner çağırabilir (RLS de aynı kuralı uygular).
 */
export async function setTaskAssignees(
  taskId: string,
  userIds: string[],
): Promise<SetTaskAssigneesResult> {
  try {
    const id = taskId?.trim() ?? "";
    if (!id) return { success: false, error: "Görev kimliği zorunlu." };

    const auth = await getAuthenticatedUser();
    if (!auth) return { success: false, error: "Oturum bulunamadı." };

    const { supabase, user } = auth;

    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id, workspace_id, project_id")
      .eq("id", id)
      .maybeSingle();

    if (taskError || !task) {
      return { success: false, error: "Görev bulunamadı." };
    }

    const workspaceId = task.workspace_id as string | null;
    if (workspaceId) {
      const roleCtx = await resolveWorkspaceRole(supabase, workspaceId, user.id);
      if (!roleCtx.isAdmin) {
        return {
          success: false,
          error: "Çoklu atama yalnızca yöneticiler tarafından düzenlenebilir.",
        };
      }
    }

    const uniqueIds = [...new Set(userIds.map((v) => v?.trim()).filter(Boolean))];

    const { error: deleteError } = await supabase
      .from("task_assignees")
      .delete()
      .eq("task_id", id);

    if (deleteError && !deleteError.message.includes("task_assignees")) {
      return { success: false, error: deleteError.message };
    }

    if (uniqueIds.length > 0) {
      const { error: insertError } = await supabase.from("task_assignees").insert(
        uniqueIds.map((userId) => ({
          task_id: id,
          user_id: userId,
          added_by: user.id,
        })),
      );

      if (insertError) {
        if (insertError.message.includes("task_assignees")) {
          return {
            success: false,
            error:
              "task_assignees tablosu yok. add_task_assignees_multi.sql migration'ını Supabase'te çalıştırın.",
          };
        }
        return { success: false, error: insertError.message };
      }
    }

    if (task.project_id) revalidatePath(`/project/${task.project_id}`);

    const result = await getTaskAssignees(id);
    return result.success
      ? { success: true, assignees: result.assignees }
      : { success: false, error: result.error };
  } catch (error) {
    return {
      success: false,
      error: logActionError("setTaskAssignees", error, "Atananlar güncellenemedi."),
    };
  }
}
