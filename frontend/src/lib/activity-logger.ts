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
  projectId?: string | null;
  taskId?: string | null;
  userId: string;
  actionType: ActivityActionType | string;
  details?: Record<string, unknown>;
};

/**
 * activity_logs tablosuna kayıt yazar.
 * Hata ana akışı bozmaz (sessizce loglanır).
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

    const payload: Record<string, unknown> = {
      workspace_id: workspaceId,
      project_id: input.projectId?.trim() || null,
      task_id: input.taskId?.trim() || null,
      user_id: userId,
      action_type: actionType,
      details: input.details ?? {},
      // Nest uyumluluğu
      entity_type: input.taskId ? "task" : input.projectId ? "project" : "workspace",
      entity_id: input.taskId || input.projectId || workspaceId,
      action: actionType,
    };

    const { error } = await supabase.from("activity_logs").insert(payload);
    if (error) {
      console.warn("[logActivity]", error.message);
    }
  } catch (error) {
    console.warn("[logActivity] catch", error);
  }
}
