"use server";

import { revalidatePath } from "next/cache";
import { logActionError } from "@/lib/action-result";
import { logActivity } from "@/lib/activity-logger";
import { resolveActorDisplayName } from "@/lib/member-labels";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { purgeAndDeleteTask } from "@/lib/task-delete";
import { resolveWorkspaceRole } from "@/lib/workspace-permissions";
import type { SupabaseClient } from "@supabase/supabase-js";

export type TaskDeletionRespondResult =
  | { success: true; message: string; deletedTaskId?: string | null }
  | { success: false; error: string };

function revalidateTaskPaths(projectId: string | null) {
  if (projectId) {
    revalidatePath(`/project/${projectId}`);
    revalidatePath(`/projects/${projectId}`);
  }
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/workspace");
  revalidatePath("/my-tasks");
  revalidatePath("/personal");
  revalidatePath("/dashboard");
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

/**
 * Bildirim üzerinden silme onayını kabul/reddet.
 * Client bileşenleri bu dosyadan doğrudan import etmeli.
 */
export async function respondToTaskDeletion(
  notificationId: string,
  decision: "accept" | "decline",
): Promise<TaskDeletionRespondResult> {
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

    const taskIdFromMeta =
      typeof meta.task_id === "string" ? meta.task_id.trim() : "";
    if (!taskIdFromMeta) {
      return { success: false, error: "Bildirimde görev bilgisi yok." };
    }

    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select(
        "id, title, project_id, workspace_id, assignee_id, assigned_to, deletion_status, deletion_requested_by",
      )
      .eq("id", taskIdFromMeta)
      .maybeSingle();

    if (taskError || !task) {
      return { success: false, error: "Görev bulunamadı veya silinmiş." };
    }

    const workspaceId =
      typeof task.workspace_id === "string" ? task.workspace_id : null;
    const projectId =
      typeof task.project_id === "string" ? task.project_id : null;
    const title = typeof task.title === "string" ? task.title : "görev";
    const deletionStatus = String(task.deletion_status ?? "none").toLowerCase();

    if (
      deletionStatus !== "pending_admin_approval" &&
      deletionStatus !== "pending_user_approval"
    ) {
      return {
        success: false,
        error: "Bu görev için bekleyen bir silme onayı yok.",
      };
    }

    if (!workspaceId) {
      return { success: false, error: "Workspace bilgisi eksik." };
    }

    const roleCtx = await resolveWorkspaceRole(supabase, workspaceId, user.id);
    const assignee =
      (typeof task.assignee_id === "string" && task.assignee_id) ||
      (typeof task.assigned_to === "string" && task.assigned_to) ||
      null;

    if (deletionStatus === "pending_admin_approval" && !roleCtx.isAdmin) {
      return { success: false, error: "Bu onay yalnızca yöneticilere açık." };
    }
    if (deletionStatus === "pending_user_approval" && assignee !== user.id) {
      return {
        success: false,
        error: "Bu onay yalnızca atanan kullanıcıya açık.",
      };
    }

    if (decision === "decline") {
      const { error: resetError } = await supabase
        .from("tasks")
        .update({
          deletion_status: "none",
          deletion_requested_by: null,
          deletion_requested_at: null,
        })
        .eq("id", taskIdFromMeta);

      if (resetError) {
        return { success: false, error: resetError.message };
      }

      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notifId);

      const requester =
        typeof task.deletion_requested_by === "string"
          ? task.deletion_requested_by
          : null;
      if (requester && requester !== user.id) {
        const rejectorName = await resolveActorDisplayName(supabase, user);
        await insertNotification(supabase, {
          workspaceId,
          userId: requester,
          type: "task_deletion_rejected",
          title: "Silme isteği reddedildi",
          message: `${rejectorName}, '${title}' görevi için silme onayını reddetti.`,
          link: projectId
            ? `/project/${projectId}?workspaceId=${encodeURIComponent(workspaceId)}`
            : null,
          payload: { task_id: taskIdFromMeta, project_id: projectId },
        });
      }

      revalidateTaskPaths(projectId);
      return {
        success: true,
        message: "Silme isteği reddedildi. Görev duruyor.",
      };
    }

    // ── Onay: önce log (görev hâlâ var), sonra cascade + sil ──
    const actorName = await resolveActorDisplayName(supabase, user);
    try {
      await logActivity(supabase, {
        workspaceId,
        projectId,
        taskId: taskIdFromMeta,
        userId: user.id,
        actionType: "task_deleted",
        actorName,
        details: {
          task_title: title,
          mode: "approved_deletion",
          message: `${actorName}, '${title}' görevinin silinmesini onayladı.`,
        },
      });
    } catch (logError) {
      console.warn("[respondToTaskDeletion] activity log:", logError);
    }

    const { error: deleteError } = await purgeAndDeleteTask(
      supabase,
      taskIdFromMeta,
    );
    if (deleteError) {
      console.error(
        "Görev silinirken veritabanı hatası oluştu:",
        deleteError,
      );
      return {
        success: false,
        error:
          deleteError.message ||
          "Silme işlemi veritabanı engeli nedeniyle başarısız oldu",
      };
    }

    // Bildirimi okundu yap (purge silmemişse)
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notifId);

    revalidateTaskPaths(projectId);
    return {
      success: true,
      message: "Görev onaylandıktan sonra silindi.",
      deletedTaskId: taskIdFromMeta,
    };
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

/** Silme talebini onayla — bildirim menüsünden doğrudan import edilir */
export async function approveTaskDeletion(
  taskId: string,
  notificationId: string,
): Promise<TaskDeletionRespondResult> {
  const notifId = notificationId?.trim() ?? "";
  if (!notifId) {
    return { success: false, error: "Bildirim kimliği zorunlu." };
  }
  void taskId;
  return respondToTaskDeletion(notifId, "accept");
}

/** Silme talebini reddet — bildirim menüsünden doğrudan import edilir */
export async function rejectTaskDeletion(
  taskId: string,
  notificationId: string,
): Promise<TaskDeletionRespondResult> {
  const notifId = notificationId?.trim() ?? "";
  if (!notifId) {
    return { success: false, error: "Bildirim kimliği zorunlu." };
  }
  void taskId;
  return respondToTaskDeletion(notifId, "decline");
}
