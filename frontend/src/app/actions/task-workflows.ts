"use server";

import { revalidatePath } from "next/cache";
import { logActionError } from "@/lib/action-result";
import { logActivity } from "@/lib/activity-logger";
import { resolveActorDisplayName } from "@/lib/member-labels";
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
  // TODO dışındaki her durum = ilerleme
  if (canonical && canonical !== "TODO") return true;
  // Tanınmayan ama boş/"todo" olmayan status de ilerleme sayılır
  if (
    typeof status === "string" &&
    status.trim() &&
    !canonical &&
    status.trim().toLowerCase() !== "todo"
  ) {
    return true;
  }

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

  if ((subtaskCount ?? 0) > 0) return true;

  return false;
}

export type TaskDeletionPreview = {
  success: true;
  hasProgress: boolean;
  isAdmin: boolean;
  requiresApproval: boolean;
  approvalTarget: "admin" | "assignee" | null;
  message: string;
} | { success: false; error: string };

/** Silme modalı için önizleme — UI uyarı metni */
export async function getTaskDeletionPreview(
  taskId: string,
): Promise<TaskDeletionPreview> {
  try {
    const id = taskId?.trim() ?? "";
    if (!id) return { success: false, error: "Görev kimliği zorunludur." };

    const auth = await getAuthenticatedUser();
    if (!auth) return { success: false, error: "Oturum bulunamadı." };

    const { supabase, user } = auth;
    const { data: existing, error } = await supabase
      .from("tasks")
      .select("id, status, workspace_id, assignee_id, assigned_to, deletion_status")
      .eq("id", id)
      .maybeSingle();

    if (error || !existing) {
      return { success: false, error: "Görev bulunamadı." };
    }

    const workspaceId =
      typeof existing.workspace_id === "string" ? existing.workspace_id : null;
    let isAdmin = false;
    if (workspaceId) {
      const roleCtx = await resolveWorkspaceRole(
        supabase,
        workspaceId,
        user.id,
      );
      isAdmin = roleCtx.isAdmin;
    }

    const hasProgress = await taskHasProgress(
      supabase,
      id,
      typeof existing.status === "string" ? existing.status : null,
    );

    if (!hasProgress) {
      return {
        success: true,
        hasProgress: false,
        isAdmin,
        requiresApproval: false,
        approvalTarget: null,
        message: "Bu görevde ilerleme yok; silme işlemi doğrudan gerçekleşir.",
      };
    }

    return {
      success: true,
      hasProgress: true,
      isAdmin,
      requiresApproval: true,
      approvalTarget: isAdmin ? "assignee" : "admin",
      message: isAdmin
        ? "Bu görevde ilerleme olduğu için silme talebi atanan kullanıcıya iletilecektir."
        : "Bu görevde ilerleme olduğu için silme talebi yöneticiye iletilecektir.",
    };
  } catch (error) {
    return {
      success: false,
      error: logActionError(
        "getTaskDeletionPreview",
        error,
        "Silme önizlemesi alınamadı.",
      ),
    };
  }
}

/**
 * Silme iş akışı (kurşun geçirmez):
 * - İlerleme yok → doğrudan sil
 * - İlerleme + üye → pending_admin_approval + admin bildirimi (ASLA silme)
 * - İlerleme + admin → pending_user_approval + atanan bildirimi (ASLA silme)
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
    const currentUserId = user.id;

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

    if (!workspaceId) {
      return {
        success: false,
        error: "Workspace bilgisi olmayan görev silinemez.",
      };
    }

    const roleCtx = await resolveWorkspaceRole(
      supabase,
      workspaceId,
      currentUserId,
    );
    const isAdmin = roleCtx.isAdmin;

    if (
      !isAdmin &&
      assignee !== currentUserId &&
      existing.created_by !== currentUserId
    ) {
      return { success: false, error: "Bu görevi silme yetkiniz yok." };
    }

    const currentDeletion = String(existing.deletion_status ?? "none").toLowerCase();
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

    // ── Durum A: İlerleme yok → doğrudan sil ──
    if (!hasProgress) {
      const actorName = await resolveActorDisplayName(supabase, user);
      await logActivity(supabase, {
        workspaceId,
        projectId,
        taskId: id,
        userId: currentUserId,
        actionType: "task_deleted",
        actorName,
        details: { task_title: title, mode: "direct_no_progress" },
      });

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

    // ── Durum B: İlerleme var → ASLA doğrudan silme ──
    const actorName = await resolveActorDisplayName(supabase, user);
    const link = projectId
      ? `/project/${projectId}?workspaceId=${encodeURIComponent(workspaceId)}`
      : null;
    const requestedAt = new Date().toISOString();

    if (isAdmin) {
      // Admin → kullanıcı onayı zorunlu
      if (!assignee) {
        return {
          success: false,
          error:
            "Bu görevde ilerleme var ancak atanan kullanıcı yok. Onaylı silme için önce bir kullanıcı atayın.",
        };
      }

      const { error } = await supabase
        .from("tasks")
        .update({
          deletion_status: "pending_user_approval" satisfies TaskDeletionStatus,
          deletion_requested_by: currentUserId,
          deletion_requested_at: requestedAt,
        })
        .eq("id", id);

      if (error) {
        if (
          error.message.includes("deletion_status") ||
          error.message.includes("deletion_requested")
        ) {
          return {
            success: false,
            error:
              "Silme onay sütunları henüz yok. add_task_approval_workflows.sql migration'ını Supabase'te çalıştırın.",
          };
        }
        return { success: false, error: error.message };
      }

      await insertNotification(supabase, {
        workspaceId,
        userId: assignee,
        type: "task_deletion_request",
        title: "Silme onayı gerekli",
        message: `${actorName} (Admin), '${title}' görevini silmek istiyor. Onaylıyor musun?`,
        link,
        payload: {
          task_id: id,
          project_id: projectId,
          workspace_id: workspaceId,
          task_title: title,
          action: "deletion_user_approval",
          requested_by: currentUserId,
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
          "Silme isteği atanan kullanıcıya gönderildi. Onay bekleniyor — görev silinmedi.",
      };
    }

    // Üye → admin onayı zorunlu (görev SİLİNMEZ)
    const { error } = await supabase
      .from("tasks")
      .update({
        deletion_status: "pending_admin_approval" satisfies TaskDeletionStatus,
        deletion_requested_by: currentUserId,
        deletion_requested_at: requestedAt,
      })
      .eq("id", id);

    if (error) {
      if (
        error.message.includes("deletion_status") ||
        error.message.includes("deletion_requested")
      ) {
        return {
          success: false,
          error:
            "Silme onay sütunları henüz yok. add_task_approval_workflows.sql migration'ını Supabase'te çalıştırın.",
        };
      }
      return { success: false, error: error.message };
    }

    const adminIds = (await getWorkspaceAdminIds(supabase, workspaceId)).filter(
      (uid) => uid !== currentUserId,
    );

    if (adminIds.length === 0) {
      // Rollback pending status — onaylayacak admin yok
      await supabase
        .from("tasks")
        .update({
          deletion_status: "none",
          deletion_requested_by: null,
          deletion_requested_at: null,
        })
        .eq("id", id);

      return {
        success: false,
        error:
          "Onaylayacak yönetici bulunamadı. Silme isteği oluşturulamadı; görev silinmedi.",
      };
    }

    await Promise.all(
      adminIds.map((adminId) =>
        insertNotification(supabase, {
          workspaceId,
          userId: adminId,
          type: "task_deletion_request",
          title: "Silme onayı gerekli",
          message: `${actorName}, '${title}' görevini silmek için onay istiyor.`,
          link,
          payload: {
            task_id: id,
            project_id: projectId,
            workspace_id: workspaceId,
            task_title: title,
            action: "deletion_admin_approval",
            requested_by: currentUserId,
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
      message:
        "Silme isteği yöneticilere iletildi. Onay bekleniyor — görev silinmedi.",
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

    const notifType = String(notif.type ?? "").toLowerCase();
    if (
      notifType &&
      !notifType.includes("deletion") &&
      notifType !== "task_deletion_request"
    ) {
      // Tip boş olabilir; metadata ile devam et
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
      assignee !== user.id
    ) {
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
        .eq("id", taskId);

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
          payload: { task_id: taskId, project_id: projectId },
        });
      }

      revalidateTaskPaths(projectId);
      return { success: true, message: "Silme isteği reddedildi. Görev duruyor." };
    }

    // Accept → sil
    const actorName = await resolveActorDisplayName(supabase, user);
    await logActivity(supabase, {
      workspaceId,
      projectId,
      taskId,
      userId: user.id,
      actionType: "task_deleted",
      actorName,
      details: {
        task_title: title,
        mode: "approved_deletion",
        message: `${actorName}, '${title}' görevinin silinmesini onayladı.`,
      },
    });

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

/** Açık API: silme onayını kabul et */
export async function approveTaskDeletion(
  taskId: string,
  notificationId: string,
): Promise<RespondResult> {
  void taskId;
  return respondToTaskDeletion(notificationId, "accept");
}

/** Açık API: silme onayını reddet */
export async function rejectTaskDeletion(
  taskId: string,
  notificationId: string,
): Promise<RespondResult> {
  void taskId;
  return respondToTaskDeletion(notificationId, "decline");
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

    const actorName = await resolveActorDisplayName(supabase, user);

    if (decision === "accept") {
      if (workspaceId) {
        try {
          await logActivity(supabase, {
            workspaceId,
            projectId,
            taskId,
            userId: user.id,
            actionType: "task_claim_accepted",
            actorName,
            details: {
              task_title: title,
              message: `${actorName}, '${title}' görevini kabul etti ve üzerinde çalışmaya başladı.`,
            },
          });
        } catch (logError) {
          console.warn("[respondToTaskClaim] accept activity log:", logError);
        }
      }
    } else {
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
                message: `${actorName}, '${title}' görevini reddetti.`,
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

        // Görev silinmeden önce proje/görev ilişkili log yaz
        try {
          await logActivity(supabase, {
            workspaceId,
            projectId,
            taskId,
            userId: user.id,
            actionType: "task_claim_rejected",
            actorName,
            details: {
              task_title: title,
              message: `${actorName}, kendisine atanan '${title}' görevini reddetti.`,
            },
          });
        } catch (logError) {
          console.warn("[respondToTaskClaim] reject activity log:", logError);
        }
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
