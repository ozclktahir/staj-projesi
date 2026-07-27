"use server";

import { revalidatePath } from "next/cache";
import { createTaskAssignedNotification } from "@/app/actions/notifications";
import { logActionError } from "@/lib/action-result";
import { logActivity } from "@/lib/activity-logger";
import {
  formatPersonName,
  loadProfilesByIds,
  resolveActorDisplayName,
  resolveMemberDisplayFields,
} from "@/lib/member-labels";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import type { TaskPriority } from "@/lib/supabase/types";
import { resolveWorkspaceRole } from "@/lib/workspace-permissions";

export type RejectedTaskItem = {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority | string | null;
  due_date: string | null;
  rejected_by_id: string | null;
  rejected_by_name: string;
};

function revalidatePaths(projectId: string) {
  revalidatePath(`/project/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/my-tasks");
  revalidatePath("/personal");
  revalidatePath("/");
}

/** Projeye ait reddedilmiş (arşiv) görevler */
export async function getRejectedTasks(
  projectId: string,
): Promise<
  | { success: true; tasks: RejectedTaskItem[] }
  | { success: false; error: string; tasks: [] }
> {
  try {
    const id = projectId?.trim();
    if (!id) {
      return { success: false, error: "Proje kimliği zorunlu.", tasks: [] };
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return { success: false, error: "Oturum bulunamadı.", tasks: [] };
    }

    const { supabase } = auth;

    const { data, error } = await supabase
      .from("tasks")
      .select(
        "id, title, description, priority, due_date, assignee_id, assigned_to, assignment_status, deleted_at, parent_task_id",
      )
      .eq("project_id", id)
      .eq("assignment_status", "rejected")
      .is("deleted_at", null)
      .is("parent_task_id", null)
      .order("updated_at", { ascending: false });

    let rows = (data as Record<string, unknown>[] | null) ?? [];

    if (error) {
      if (
        error.message.includes("assignment_status") ||
        error.message.includes("deleted_at") ||
        error.message.includes("updated_at")
      ) {
        const fb = await supabase
          .from("tasks")
          .select(
            "id, title, description, priority, due_date, assignee_id, assigned_to, assignment_status",
          )
          .eq("project_id", id)
          .order("created_at", { ascending: false });

        if (fb.error) {
          return { success: false, error: fb.error.message, tasks: [] };
        }
        rows = ((fb.data as Record<string, unknown>[] | null) ?? []).filter(
          (r) =>
            String(r.assignment_status ?? "").toLowerCase() === "rejected",
        );
      } else {
        return { success: false, error: error.message, tasks: [] };
      }
    }

    const rejectorIds = [
      ...new Set(
        rows
          .map(
            (r) =>
              (typeof r.assignee_id === "string" && r.assignee_id) ||
              (typeof r.assigned_to === "string" && r.assigned_to) ||
              null,
          )
          .filter((x): x is string => Boolean(x)),
      ),
    ];

    const profiles = await loadProfilesByIds(supabase, rejectorIds);

    const tasks: RejectedTaskItem[] = rows.map((row) => {
      const rejectorId =
        (typeof row.assignee_id === "string" && row.assignee_id) ||
        (typeof row.assigned_to === "string" && row.assigned_to) ||
        null;
      const profile = rejectorId ? profiles.get(rejectorId) ?? null : null;
      const fields = resolveMemberDisplayFields(profile, null);
      const name =
        formatPersonName(profile, fields.email) ||
        fields.displayName ||
        "bir kullanıcı";

      return {
        id: String(row.id),
        title: (typeof row.title === "string" && row.title) || "Adsız görev",
        description:
          typeof row.description === "string" ? row.description : null,
        priority:
          typeof row.priority === "string" ? row.priority.toUpperCase() : null,
        due_date: typeof row.due_date === "string" ? row.due_date : null,
        rejected_by_id: rejectorId,
        rejected_by_name: name,
      };
    });

    return { success: true, tasks };
  } catch (error) {
    return {
      success: false,
      error: logActionError(
        "getRejectedTasks",
        error,
        "Reddedilen görevler alınamadı.",
      ),
      tasks: [],
    };
  }
}

export type ReassignRejectedTaskInput = {
  taskId: string;
  projectId: string;
  assigneeId: string;
  dueDate?: string | null;
};

/**
 * Reddedilmiş görevi yeni kişiye yeniden atar (assignment_status → pending).
 */
export async function reassignRejectedTask(
  input: ReassignRejectedTaskInput,
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const taskId = input.taskId?.trim();
    const projectId = input.projectId?.trim();
    const assigneeId = input.assigneeId?.trim();
    if (!taskId || !projectId || !assigneeId) {
      return {
        success: false,
        error: "Görev, proje ve yeni atanan kişi zorunludur.",
      };
    }

    const auth = await getAuthenticatedUser();
    if (!auth) return { success: false, error: "Oturum bulunamadı." };

    const { supabase, user } = auth;

    const { data: task, error: fetchError } = await supabase
      .from("tasks")
      .select(
        "id, title, project_id, workspace_id, assignment_status, assignee_id, assigned_to",
      )
      .eq("id", taskId)
      .eq("project_id", projectId)
      .maybeSingle();

    if (fetchError || !task) {
      return { success: false, error: "Görev bulunamadı." };
    }

    const status = String(task.assignment_status ?? "").toLowerCase();
    if (status !== "rejected") {
      return {
        success: false,
        error: "Yalnızca reddedilmiş görevler yeniden atanabilir.",
      };
    }

    const workspaceId =
      typeof task.workspace_id === "string" ? task.workspace_id : null;
    if (!workspaceId) {
      return { success: false, error: "Workspace bilgisi eksik." };
    }

    const roleCtx = await resolveWorkspaceRole(supabase, workspaceId, user.id);
    if (!roleCtx.isAdmin) {
      return {
        success: false,
        error: "Yeniden atama yalnızca yöneticiler içindir.",
      };
    }

    const dueDate =
      typeof input.dueDate === "string" && input.dueDate.trim()
        ? input.dueDate.trim()
        : null;

    const patch: Record<string, unknown> = {
      assignee_id: assigneeId,
      assigned_to: assigneeId,
      assignment_status: "pending",
      assignment_pending_at: new Date().toISOString(),
    };
    if (dueDate !== undefined) {
      patch.due_date = dueDate;
    }

    const { error: updateError } = await supabase
      .from("tasks")
      .update(patch)
      .eq("id", taskId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    const actorName = await resolveActorDisplayName(supabase, user);
    const title = typeof task.title === "string" ? task.title : "görev";

    const assigneeProfile =
      (await loadProfilesByIds(supabase, [assigneeId])).get(assigneeId) ??
      null;
    const assigneeFields = resolveMemberDisplayFields(assigneeProfile, null);
    const newAssigneeName =
      formatPersonName(assigneeProfile, assigneeFields.email) ||
      assigneeFields.displayName ||
      "kullanıcı";

    await createTaskAssignedNotification({
      workspaceId,
      projectId,
      taskId,
      taskTitle: title,
      assigneeUserId: assigneeId,
      actorName,
      message: `${actorName} size '${title}' görevini yeniden atadı. Kabul ediyor musunuz?`,
    });

    await logActivity(supabase, {
      workspaceId,
      projectId,
      taskId,
      userId: user.id,
      actionType: "task_reassigned",
      actorName,
      details: {
        task_title: title,
        new_assignee_id: assigneeId,
        new_assignee_name: newAssigneeName,
        message: `${actorName}, reddedilen '${title}' görevini ${newAssigneeName}'na yeniden atadı.`,
      },
    });

    revalidatePaths(projectId);
    return {
      success: true,
      message: "Görev yeniden atandı. Onay bekleniyor.",
    };
  } catch (error) {
    return {
      success: false,
      error: logActionError(
        "reassignRejectedTask",
        error,
        "Yeniden atama sırasında hata oluştu.",
      ),
    };
  }
}
