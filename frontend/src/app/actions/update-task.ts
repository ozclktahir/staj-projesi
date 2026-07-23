"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-logger";
import {
  formatPersonName,
  loadProfilesByIds,
  resolveMemberDisplayFields,
} from "@/lib/member-labels";
import { resolveWorkspaceRole } from "@/lib/workspace-permissions";
import {
  normalizeTaskStatusInput,
  TASK_PRIORITIES,
  type ProjectTask,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/supabase/types";

export type UpdateTaskInput = {
  taskId: string;
  title?: string;
  description?: string | null;
  due_date?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus | string;
  assigneeId?: string | null;
};

export type UpdateTaskResult =
  | { success: true; task: ProjectTask }
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
    return "Görev güncellenemedi.";
  }
}

function normalizePriority(value: unknown): TaskPriority | null {
  if (
    typeof value === "string" &&
    (TASK_PRIORITIES as string[]).includes(value.toUpperCase())
  ) {
    return value.toUpperCase() as TaskPriority;
  }
  return null;
}

export async function updateTask(
  input: UpdateTaskInput,
): Promise<UpdateTaskResult> {
  try {
    const taskId = input.taskId?.trim() ?? "";
    if (!taskId) {
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
      .select(
        "id, title, status, priority, project_id, workspace_id, assignee_id, assigned_to, created_by",
      )
      .eq("id", taskId)
      .maybeSingle();

    if (fetchError || !existing) {
      return {
        success: false,
        error: toPlainErrorMessage(fetchError ?? "Görev bulunamadı."),
      };
    }

    const workspaceId =
      typeof existing.workspace_id === "string" ? existing.workspace_id : null;

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
        if (assignee !== user.id) {
          return {
            success: false,
            error: "Yalnızca size atanan görevleri düzenleyebilirsiniz.",
          };
        }
      }
    }

    const patch: Record<string, unknown> = {};

    if (typeof input.title === "string") {
      const title = input.title.trim();
      if (!title) {
        return { success: false, error: "Başlık boş olamaz." };
      }
      patch.title = title;
    }

    if (input.description !== undefined) {
      patch.description =
        typeof input.description === "string"
          ? input.description.trim() || null
          : null;
    }

    if (input.due_date !== undefined) {
      patch.due_date = input.due_date?.trim() || null;
    }

    if (input.priority !== undefined) {
      const priority = normalizePriority(input.priority);
      if (!priority) {
        return { success: false, error: "Geçersiz öncelik." };
      }
      patch.priority = priority;
    }

    if (input.status !== undefined) {
      const status = normalizeTaskStatusInput(input.status);
      if (!status) {
        return { success: false, error: "Geçersiz durum." };
      }
      patch.status = status;
    }

    if (input.assigneeId !== undefined && workspaceId) {
      const roleCtx = await resolveWorkspaceRole(
        supabase,
        workspaceId,
        user.id,
      );
      let assigneeId =
        typeof input.assigneeId === "string" && input.assigneeId.trim()
          ? input.assigneeId.trim()
          : null;

      if (!roleCtx.isAdmin) {
        assigneeId = user.id;
      } else if (assigneeId) {
        const { data: member } = await supabase
          .from("workspace_members")
          .select("user_id")
          .eq("workspace_id", workspaceId)
          .eq("user_id", assigneeId)
          .maybeSingle();
        const { data: owner } = await supabase
          .from("workspaces")
          .select("id")
          .eq("id", workspaceId)
          .eq("owner_id", assigneeId)
          .maybeSingle();
        if (!member && !owner) {
          return {
            success: false,
            error: "Atanan kişi bu workspace üyesi olmalıdır.",
          };
        }
      }

      patch.assignee_id = assigneeId;
      patch.assigned_to = assigneeId;
    }

    if (Object.keys(patch).length === 0) {
      return { success: false, error: "Güncellenecek alan yok." };
    }

    console.log("[updateTask] patch", { taskId, patch });

    let { data, error } = await supabase
      .from("tasks")
      .update(patch)
      .eq("id", taskId)
      .select(
        "id, title, description, status, priority, project_id, workspace_id, due_date, parent_task_id, created_at, created_by, assignee_id, assigned_to",
      )
      .maybeSingle();

    if (
      error?.message?.includes("due_date") ||
      error?.message?.includes("assignee_id") ||
      error?.message?.includes("assigned_to")
    ) {
      const retryPatch = { ...patch };
      if (error.message.includes("due_date")) delete retryPatch.due_date;
      if (error.message.includes("assignee_id")) delete retryPatch.assignee_id;
      if (error.message.includes("assigned_to")) delete retryPatch.assigned_to;
      ({ data, error } = await supabase
        .from("tasks")
        .update(retryPatch)
        .eq("id", taskId)
        .select(
          "id, title, description, status, priority, project_id, workspace_id, created_at, created_by",
        )
        .maybeSingle());
    }

    if (error) {
      console.error("[updateTask]", error);
      return { success: false, error: toPlainErrorMessage(error) };
    }

    if (!data) {
      return {
        success: false,
        error: "Görev bulunamadı veya güncelleme yetkiniz yok.",
      };
    }

    const row = data as Record<string, unknown>;
    const projectId =
      typeof row.project_id === "string" ? row.project_id : null;
    const taskTitle =
      (typeof row.title === "string" && row.title) ||
      (typeof existing.title === "string" && existing.title) ||
      "görev";

    if (workspaceId) {
      const oldStatus = normalizeTaskStatusInput(existing.status);
      const newStatus = normalizeTaskStatusInput(row.status);
      if (
        patch.status !== undefined &&
        oldStatus &&
        newStatus &&
        oldStatus !== newStatus
      ) {
        await logActivity(supabase, {
          workspaceId,
          projectId,
          taskId,
          userId: user.id,
          actionType: "status_changed",
          details: {
            old_value: oldStatus,
            new_value: newStatus,
            task_title: taskTitle,
          },
        });
      }

      const oldPriority = normalizePriority(existing.priority);
      const newPriority = normalizePriority(row.priority);
      if (
        patch.priority !== undefined &&
        oldPriority &&
        newPriority &&
        oldPriority !== newPriority
      ) {
        await logActivity(supabase, {
          workspaceId,
          projectId,
          taskId,
          userId: user.id,
          actionType: "priority_changed",
          details: {
            old_value: oldPriority,
            new_value: newPriority,
            task_title: taskTitle,
          },
        });
      }

      if (patch.assignee_id !== undefined || patch.assigned_to !== undefined) {
        const oldAssignee =
          (typeof existing.assignee_id === "string" && existing.assignee_id) ||
          (typeof existing.assigned_to === "string" && existing.assigned_to) ||
          null;
        const newAssignee =
          (typeof row.assignee_id === "string" && row.assignee_id) ||
          (typeof row.assigned_to === "string" && row.assigned_to) ||
          (typeof patch.assignee_id === "string" ? patch.assignee_id : null);

        if (oldAssignee !== newAssignee) {
          let newAssigneeName: string | null = null;
          if (newAssignee) {
            const profile =
              (await loadProfilesByIds(supabase, [newAssignee])).get(
                newAssignee,
              ) ?? null;
            const fields = resolveMemberDisplayFields(profile, null);
            newAssigneeName =
              formatPersonName(profile, fields.email) || fields.displayName;
          }

          await logActivity(supabase, {
            workspaceId,
            projectId,
            taskId,
            userId: user.id,
            actionType: "assignee_changed",
            details: {
              old_value: oldAssignee,
              new_value: newAssignee,
              new_assignee_name: newAssigneeName || "Atanmamış",
              task_title: taskTitle,
            },
          });
        }
      }

      if (
        patch.title !== undefined ||
        patch.description !== undefined ||
        patch.due_date !== undefined
      ) {
        await logActivity(supabase, {
          workspaceId,
          projectId,
          taskId,
          userId: user.id,
          actionType: "task_updated",
          details: { task_title: taskTitle },
        });
      }
    }

    if (projectId) revalidatePath(`/project/${projectId}`);
    revalidatePath("/");
    revalidatePath("/dashboard");

    return {
      success: true,
      task: {
        id: row.id as string,
        title: (row.title as string) ?? "Adsız görev",
        description: (row.description as string | null) ?? null,
        status: (normalizeTaskStatusInput(row.status) ?? "TODO") as TaskStatus,
        priority: (normalizePriority(row.priority) ??
          "MEDIUM") as TaskPriority,
        project_id: (row.project_id as string | null) ?? null,
        workspace_id: (row.workspace_id as string | null) ?? null,
        due_date: (row.due_date as string | null) ?? null,
        parent_task_id: (row.parent_task_id as string | null) ?? null,
        assignee_id:
          (row.assignee_id as string | null | undefined) ??
          (row.assigned_to as string | null | undefined) ??
          null,
        created_at: (row.created_at as string | null) ?? null,
        created_by: (row.created_by as string | null) ?? null,
      },
    };
  } catch (error) {
    console.error("[updateTask] catch:", toPlainErrorMessage(error));
    return { success: false, error: toPlainErrorMessage(error) };
  }
}
