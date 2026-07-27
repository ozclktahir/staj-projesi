"use server";

import { revalidatePath } from "next/cache";
import { logActionError } from "@/lib/action-result";
import { logActivity } from "@/lib/activity-logger";
import { formatAuthUserLabel } from "@/lib/member-labels";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  normalizeTaskStatusInput,
  type TaskAssignmentStatus,
  type TaskDeletionStatus,
} from "@/lib/supabase/types";
import { resolveWorkspaceRole } from "@/lib/workspace-permissions";
import type { SupabaseClient } from "@supabase/supabase-js";

export type DeleteTaskWorkflowResult =
  | {
      success: true;
      taskId: string;
      projectId: string | null;
      mode: "deleted" | "approval_requested";
      deletionStatus?: TaskDeletionStatus;
      message: string;
    }
  | { success: false; error: string };

export type RespondResult =
  | { success: true; message: string }
  | { success: false; error: string };

function revalidateTaskPaths(projectId: string | null) {
  if (projectId) revalidatePath(`/project/${projectId}`);
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/my-tasks");
  revalidatePath("/personal");
}

async function getWorkspaceAdminIds(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<string[]> {
  const ids = new Set<string>();

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .maybeSingle();

  if (typeof workspace?.owner_id === "string") {
    ids.add(workspace.owner_id);
  }

  const { data: members } = await supabase
    .from("workspace_members")
    .select("user_id, role")
    .eq("workspace_id", workspaceId);

  for (const row of members ?? []) {
    const role = String(row.role ?? "").toLowerCase();
    if (
      (role === "admin" || role === "owner") &&
      typeof row.user_id === "string"
    ) {
      ids.add(row.user_id);
    }
  }

  return [...ids];
}

async function insertNotification(
  supabase: SupabaseClient,
  input: {
    workspaceId: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    link?: string | null;
    payload: Record<string, unknown>;
  },
): Promise<void> {
  const base = {
    workspace_id: input.workspaceId,
    user_id: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    metadata: input.payload,
    payload: input.payload,
    link: input.link ?? null,
    is_read: false,
  };

  const { error } = await supabase.from("notifications").insert(base);
  if (
    error &&
    (error.message.includes("payload") || error.message.includes("link"))
  ) {
    const { error: fallbackError } = await supabase
      .from("notifications")
      .insert({
        workspace_id: input.workspaceId,
        user_id: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        metadata: input.payload,
        is_read: false,
      });
    if (fallbackError) {
      console.error("[insertNotification]", fallbackError.message);
    }
    return;
  }
  if (error) {
    console.error("[insertNotification]", error.message);
  }
}

async function hardOrSoftDeleteTask(
  supabase: SupabaseClient,
  taskId: string,
): Promise<{ error: { message: string } | null }> {
  const deletedAt = new Date().toISOString();
  let { error } = await supabase
    .from("tasks")
    .update({
      deleted_at: deletedAt,
      deletion_status: "none",
      deletion_requested_by: null,
      deletion_requested_at: null,
    })
    .eq("id", taskId);

  if (error?.message?.includes("deleted_at")) {
    ({ error } = await supabase.from("tasks").delete().eq("id", taskId));
  } else if (
    error &&
    (error.message.includes("deletion_status") ||
      error.message.includes("deletion_requested"))
  ) {
    ({ error } = await supabase
      .from("tasks")
      .update({ deleted_at: deletedAt })
      .eq("id", taskId));
  }

  return { error };
}

async function taskHasProgress(
  supabase: SupabaseClient,
  taskId: string,
  status: string | null,
): Promise<boolean> {
  const canonical = normalizeTaskStatusInput(status);
  if (canonical && canonical !== "TODO") return true;

  const { count: commentCount } = await supabase
    .from("task_comments")
    .select("*", { count: "exact", head: true })
    .eq("task_id", taskId);

  if ((commentCount ?? 0) > 0) return true;

  const { count: attachmentCount } = await supabase
    .from("task_attachments")
    .select("*", { count: "exact", head: true })
    .eq("task_id", taskId);

  if ((attachmentCount ?? 0) > 0) return true;

  const { count: subtaskCount } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("parent_task_id", taskId);

  return (subtaskCount ?? 0) > 0;
}

/**
 * Silme iş akışı: doğrudan sil veya karşılıklı onay iste.
 */
export async function requestOrDeleteTask(
  taskId: string,
): Promise<DeleteTaskWorkflowResult> {
  try {
    const id = taskId?.trim() ?? "";
    if (!id) {
      return { success: false, error: "Görev kimliği zorunludur." };
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return { success: false, error: "Oturum bulunamadı." };
    }

    const { supabase, user } = auth;

    const { data: existing, error: fetchError } = await supabase
      .from("tasks")
      .select(
        "id, title, status, workspace_id, project_id, assignee_id, assigned_to, created_by, deletion_status",
      )
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !existing) {
      return { success: false, error: "Görev bulunamadı." };
    }

    const workspaceId =
      typeof existing.workspace_id === "string" ? existing.workspace_id : null;
    const projectId =
      typeof existing.project_id === "string" ? existing.project_id : null;
    const assignee =
      (typeof existing.assignee_id === "string" && existing.assignee_id) ||
      (typeof existing.assigned_to === "string" && existing.assigned_to) ||
      null;
    const title =
      typeof existing.title === "string" ? existing.title : "görev";

    let isAdmin = false;
    if (workspaceId) {
      const roleCtx = await resolveWorkspaceRole(
        supabase,
        workspaceId,
        user.id,
      );
      isAdmin = roleCtx.isAdmin;
      if (!isAdmin && assignee !== user.id && existing.created_by !== user.id) {
        return { success: false, error: "Bu görevi silme yetkiniz yok." };
      }
    }

    const currentDeletion = String(existing.deletion_status ?? "none");
    if (
      currentDeletion === "pending_admin_approval" ||
      currentDeletion === "pending_user_approval"
    ) {
      return {
        success: false,
        error: "Bu görev için zaten bir silme onayı bekleniyor.",
      };
    }

    const hasProgress = await taskHasProgress(
      supabase,
      id,
      typeof existing.status === "string" ? existing.status : null,
    );

    // İlerleme yok → doğrudan sil
    if (!hasProgress) {
      if (workspaceId) {
        await logActivity(supabase, {
          workspaceId,
          projectId,
          taskId: id,
          userId: user.id,
          actionType: "task_deleted",
          details: { task_title: title, mode: "direct" },
        });
      }

      const { error } = await hardOrSoftDeleteTask(supabase, id);
      if (error) {
        return { success: false, error: error.message };
      }

      revalidateTaskPaths(projectId);
      return {
        success: true,
        taskId: id,
        projectId,
        mode: "deleted",
        message: "Görev silindi.",
      };
    }

    if (!workspaceId) {
      return {
        success: false,
        error: "Workspace bilgisi olmadan onaylı silme yapılamaz.",
      };
    }

    const actorName =
      formatAuthUserLabel({
        email: user.email,
        user_metadata: user.user_metadata as {
          first_name?: string;
          last_name?: string;
          full_name?: string;
          display_name?: string;
        },
      }) || "Bir kullanıcı";

    const link = projectId
      ? `/project/${projectId}?workspaceId=${encodeURIComponent(workspaceId)}`
      : null;

    if (isAdmin) {
      // Admin → kullanıcı onayı
      if (!assignee) {
        // Atanan yoksa admin doğrudan silebilir
        await logActivity(supabase, {
          workspaceId,
          projectId,
          taskId: id,
          userId: user.id,
          actionType: "task_deleted",
          details: { task_title: title, mode: "admin_direct_no_assignee" },
        });
        const { error } = await hardOrSoftDeleteTask(supabase, id);
        if (error) return { success: false, error: error.message };
        revalidateTaskPaths(projectId);
        return {
          success: true,
          taskId: id,
          projectId,
          mode: "deleted",
          message: "Görev silindi.",
        };
      }

      const { error } = await supabase
        .from("tasks")
        .update({
          deletion_status: "pending_user_approval",
          deletion_requested_by: user.id,
          deletion_requested_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        // Sütun yoksa doğrudan sil (migration uygulanmamış olabilir)
        if (error.message.includes("deletion_status")) {
          const del = await hardOrSoftDeleteTask(supabase, id);
          if (del.error) return { success: false, error: del.error.message };
          revalidateTaskPaths(projectId);
          return {
            success: true,
            taskId: id,
            projectId,
            mode: "deleted",
            message: "Görev silindi.",
          };
        }
        return { success: false, error: error.message };
      }

      await insertNotification(supabase, {
        workspaceId,
        userId: assignee,
        type: "task_deletion_request",
        title: "Silme onayı gerekli",
        message: `${actorName} '${title}' görevini silmek/kapatmak istiyor. Onaylıyor musun?`,
        link,
        payload: {
          task_id: id,
          project_id: projectId,
          workspace_id: workspaceId,
          task_title: title,
          action: "deletion_user_approval",
        },
      });

      revalidateTaskPaths(projectId);
      return {
        success: true,
        taskId: id,
        projectId,
        mode: "approval_requested",
        deletionStatus: "pending_user_approval",
        message:
          "Silme isteği atanan kullanıcıya gönderildi. Onay bekleniyor.",
      };
    }

    // Üye → admin onayı
    const { error } = await supabase
      .from("tasks")
      .update({
        deletion_status: "pending_admin_approval",
        deletion_requested_by: user.id,
        deletion_requested_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      if (error.message.includes("deletion_status")) {
        return {
          success: false,
          error:
            "Silme onay sütunları henüz yok. add_task_approval_workflows.sql migration'ını çalıştırın.",
        };
      }
      return { success: false, error: error.message };
    }

    const adminIds = (await getWorkspaceAdminIds(supabase, workspaceId)).filter(
      (uid) => uid !== user.id,
    );

    await Promise.all(
      adminIds.map((adminId) =>
        insertNotification(supabase, {
          workspaceId,
          userId: adminId,
          type: "task_deletion_request",
          title: "Silme onayı gerekli",
          message: `${actorName} '${title}' görevini silmek istiyor. Onaylıyor musunuz?`,
          link,
          payload: {
            task_id: id,
            project_id: projectId,
            workspace_id: workspaceId,
            task_title: title,
            action: "deletion_admin_approval",
          },
        }),
      ),
    );

    revalidateTaskPaths(projectId);
    return {
      success: true,
      taskId: id,
      projectId,
      mode: "approval_requested",
      deletionStatus: "pending_admin_approval",
      message: "Silme isteği yöneticilere iletildi. Onay bekleniyor.",
    };
  } catch (error) {
    return {
      success: false,
      error: logActionError(
        "requestOrDeleteTask",
        error,
        "Silme işlemi sırasında bir hata oluştu.",
      ),
    };
  }
}

/** Geriye dönük alias */
export async function deleteTask(
  taskId: string,
): Promise<DeleteTaskWorkflowResult> {
  return requestOrDeleteTask(taskId);
}

export async function respondToTaskDeletion(
  notificationId: string,
  decision: "accept" | "decline",
): Promise<RespondResult> {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) return { success: false, error: "Oturum bulunamadı." };

    const { supabase, user } = auth;
    const notifId = notificationId?.trim();
    if (!notifId) return { success: false, error: "Bildirim kimliği zorunlu." };

    const { data: notif, error: notifError } = await supabase
      .from("notifications")
      .select("id, user_id, type, metadata, payload, workspace_id")
      .eq("id", notifId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (notifError || !notif) {
      return { success: false, error: "Bildirim bulunamadı." };
    }

    const meta =
      (notif.payload && typeof notif.payload === "object"
        ? (notif.payload as Record<string, unknown>)
        : null) ||
      (notif.metadata && typeof notif.metadata === "object"
        ? (notif.metadata as Record<string, unknown>)
        : null) ||
      {};

    const taskId = typeof meta.task_id === "string" ? meta.task_id : null;
    if (!taskId) {
      return { success: false, error: "Bildirimde görev bilgisi yok." };
    }

    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select(
        "id, title, project_id, workspace_id, assignee_id, assigned_to, deletion_status, deletion_requested_by",
      )
      .eq("id", taskId)
      .maybeSingle();

    if (taskError || !task) {
      return { success: false, error: "Görev bulunamadı veya silinmiş." };
    }

    const workspaceId =
      typeof task.workspace_id === "string" ? task.workspace_id : null;
    const projectId =
      typeof task.project_id === "string" ? task.project_id : null;
    const title = typeof task.title === "string" ? task.title : "görev";
    const deletionStatus = String(task.deletion_status ?? "none");

    if (workspaceId) {
      const roleCtx = await resolveWorkspaceRole(
        supabase,
        workspaceId,
        user.id,
      );
      const assignee =
        (typeof task.assignee_id === "string" && task.assignee_id) ||
        (typeof task.assigned_to === "string" && task.assigned_to) ||
        null;

      if (deletionStatus === "pending_admin_approval" && !roleCtx.isAdmin) {
        return { success: false, error: "Bu onay yalnızca yöneticilere açık." };
      }
      if (
        deletionStatus === "pending_user_approval" &&
        assignee !== user.id &&
        !roleCtx.isAdmin
      ) {
        return {
          success: false,
          error: "Bu onay yalnızca atanan kullanıcıya açık.",
        };
      }
    }

    if (decision === "decline") {
      await supabase
        .from("tasks")
        .update({
          deletion_status: "none",
          deletion_requested_by: null,
          deletion_requested_at: null,
        })
        .eq("id", taskId);

      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notifId);

      // İsteği yapan kişiye bilgi
      const requester =
        typeof task.deletion_requested_by === "string"
          ? task.deletion_requested_by
          : null;
      if (requester && workspaceId && requester !== user.id) {
        await insertNotification(supabase, {
          workspaceId,
          userId: requester,
          type: "task_deletion_rejected",
          title: "Silme isteği reddedildi",
          message: `'${title}' görevi için silme onayı reddedildi.`,
          link: projectId
            ? `/project/${projectId}?workspaceId=${encodeURIComponent(workspaceId)}`
            : null,
          payload: { task_id: taskId, project_id: projectId },
        });
      }

      revalidateTaskPaths(projectId);
      return { success: true, message: "Silme isteği reddedildi." };
    }

    // Accept → sil
    if (workspaceId) {
      await logActivity(supabase, {
        workspaceId,
        projectId,
        taskId,
        userId: user.id,
        actionType: "task_deleted",
        details: { task_title: title, mode: "approved_deletion" },
      });
    }

    const { error } = await hardOrSoftDeleteTask(supabase, taskId);
    if (error) return { success: false, error: error.message };

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notifId);

    revalidateTaskPaths(projectId);
    return { success: true, message: "Görev onaylandıktan sonra silindi." };
  } catch (error) {
    return {
      success: false,
      error: logActionError(
        "respondToTaskDeletion",
        error,
        "Silme onayı işlenirken hata oluştu.",
      ),
    };
  }
}

export async function respondToTaskClaim(
  notificationId: string,
  decision: "accept" | "decline",
): Promise<RespondResult> {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) return { success: false, error: "Oturum bulunamadı." };

    const { supabase, user } = auth;
    const notifId = notificationId?.trim();
    if (!notifId) return { success: false, error: "Bildirim kimliği zorunlu." };

    const { data: notif, error: notifError } = await supabase
      .from("notifications")
      .select("id, user_id, type, metadata, payload, workspace_id")
      .eq("id", notifId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (notifError || !notif) {
      return { success: false, error: "Bildirim bulunamadı." };
    }

    const meta =
      (notif.payload && typeof notif.payload === "object"
        ? (notif.payload as Record<string, unknown>)
        : null) ||
      (notif.metadata && typeof notif.metadata === "object"
        ? (notif.metadata as Record<string, unknown>)
        : null) ||
      {};

    const taskId = typeof meta.task_id === "string" ? meta.task_id : null;
    if (!taskId) {
      return { success: false, error: "Bildirimde görev bilgisi yok." };
    }

    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select(
        "id, title, project_id, workspace_id, assignee_id, assigned_to, assignment_status, created_by",
      )
      .eq("id", taskId)
      .maybeSingle();

    if (taskError || !task) {
      return { success: false, error: "Görev bulunamadı." };
    }

    const assignee =
      (typeof task.assignee_id === "string" && task.assignee_id) ||
      (typeof task.assigned_to === "string" && task.assigned_to) ||
      null;

    if (assignee !== user.id) {
      return {
        success: false,
        error: "Bu görevi yalnızca atanan kullanıcı kabul/reddedebilir.",
      };
    }

    const workspaceId =
      typeof task.workspace_id === "string" ? task.workspace_id : null;
    const projectId =
      typeof task.project_id === "string" ? task.project_id : null;
    const title = typeof task.title === "string" ? task.title : "görev";

    if (decision === "accept") {
      const { error } = await supabase
        .from("tasks")
        .update({
          assignment_status: "accepted" satisfies TaskAssignmentStatus,
          assignment_pending_at: null,
        })
        .eq("id", taskId);

      if (error) {
        if (error.message.includes("assignment_status")) {
          return {
            success: false,
            error:
              "assignment_status sütunu yok. add_task_approval_workflows.sql migration'ını çalıştırın.",
          };
        }
        return { success: false, error: error.message };
      }
    } else {
      // Red: önce rejected işaretle (audit), admin bildirimi, sonra görevi sistemden kaldır
      const { error: rejectError } = await supabase
        .from("tasks")
        .update({
          assignment_status: "rejected" satisfies TaskAssignmentStatus,
          assignment_pending_at: new Date().toISOString(),
        })
        .eq("id", taskId);

      if (
        rejectError &&
        !rejectError.message.includes("assignment_status") &&
        !rejectError.message.includes("assignment_pending_at")
      ) {
        return { success: false, error: rejectError.message };
      }
    }

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notifId);

    const actorName =
      formatAuthUserLabel({
        email: user.email,
        user_metadata: user.user_metadata as {
          first_name?: string;
          last_name?: string;
          full_name?: string;
          display_name?: string;
        },
      }) || "Kullanıcı";

    if (decision === "decline") {
      if (workspaceId) {
        const adminIds = await getWorkspaceAdminIds(supabase, workspaceId);
        await Promise.all(
          adminIds
            .filter((id) => id !== user.id)
            .map((adminId) =>
              insertNotification(supabase, {
                workspaceId,
                userId: adminId,
                type: "task_claim_rejected",
                title: "Görev reddedildi",
                message: `${actorName} '${title}' görevini reddetti.`,
                link: projectId
                  ? `/project/${projectId}?workspaceId=${encodeURIComponent(workspaceId)}`
                  : null,
                payload: {
                  task_id: taskId,
                  project_id: projectId,
                  task_title: title,
                },
              }),
            ),
        );
      }

      const { error: deleteError } = await hardOrSoftDeleteTask(
        supabase,
        taskId,
      );
      if (deleteError) {
        return {
          success: false,
          error:
            deleteError.message ||
            "Görev reddedildi ancak silinemedi. Lütfen tekrar deneyin.",
        };
      }
    }

    revalidateTaskPaths(projectId);
    return {
      success: true,
      message:
        decision === "accept"
          ? "Görev kabul edildi."
          : "Görev reddedildi ve iptal edildi. Yöneticiler bilgilendirildi.",
    };
  } catch (error) {
    return {
      success: false,
      error: logActionError(
        "respondToTaskClaim",
        error,
        "Görev sahiplenme yanıtı işlenirken hata oluştu.",
      ),
    };
  }
}
