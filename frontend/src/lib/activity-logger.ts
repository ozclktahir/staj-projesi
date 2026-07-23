import type { SupabaseClient } from "@supabase/supabase-js";

export type ActivityActionType =
  | "task_created"
  | "task_deleted"
  | "status_changed"
  | "priority_changed"
  | "assignee_changed"
  | "comment_added"
  | "attachment_added"
  | "task_updated";

export type LogActivityInput = {
  workspaceId: string;
  /** Opsiyonel — görev/proje bağlamı yoksa null bırakılabilir */
  projectId?: string | null;
  taskId?: string | null;
  userId: string;
  actionType: ActivityActionType | string;
  details?: Record<string, unknown>;
};

/**
 * activity_logs tablosuna kayıt yazar.
 * Hata ana akışı bozmaz (sessizce loglanır).
 * project_id / task_id zorunlu değildir.
 */
export async function logActivity(
  supabase: SupabaseClient,
  input: LogActivityInput,
): Promise<void> {
  try {
    const workspaceId = input.workspaceId?.trim();
    const userId = input.userId?.trim();
    const actionType = input.actionType?.trim();
    if (!workspaceId || !userId || !actionType) return;

    const projectId = input.projectId?.trim() || null;
    const taskId = input.taskId?.trim() || null;

    const fullPayload: Record<string, unknown> = {
      workspace_id: workspaceId,
      user_id: userId,
      action_type: actionType,
      details: input.details ?? {},
      // Nest uyumluluğu
      entity_type: taskId ? "task" : projectId ? "project" : "workspace",
      entity_id: taskId || projectId || workspaceId,
      action: actionType,
    };

    if (projectId) fullPayload.project_id = projectId;
    if (taskId) fullPayload.task_id = taskId;

    let { error } = await supabase.from("activity_logs").insert(fullPayload);

    // Eski şema / eksik sütun: project_id, task_id, action_type olmadan dene
    if (
      error &&
      (error.message.includes("project_id") ||
        error.message.includes("task_id") ||
        error.message.includes("action_type") ||
        error.code === "PGRST204" ||
        error.code === "42703")
    ) {
      const legacyPayload: Record<string, unknown> = {
        workspace_id: workspaceId,
        user_id: userId,
        entity_type: taskId ? "task" : projectId ? "project" : "workspace",
        entity_id: taskId || projectId || workspaceId,
        action: actionType,
        details: {
          ...(input.details ?? {}),
          ...(projectId ? { project_id: projectId } : {}),
          ...(taskId ? { task_id: taskId } : {}),
          action_type: actionType,
        },
      };
      ({ error } = await supabase.from("activity_logs").insert(legacyPayload));
    }

    if (error) {
      console.warn("[logActivity]", error.message);
    }
  } catch (error) {
    console.warn("[logActivity] catch", error);
  }
}
