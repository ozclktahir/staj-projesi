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
  | { success: true; message: string; taskId?: string }
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

  const [{ count: commentCount }, { count: attachmentCount }, { count: subtaskCount }] =
    await Promise.all([
      supabase
        .from("task_comments")
        .select("id", { count: "exact", head: true })
        .eq("task_id", taskId),
      supabase
        .from("task_attachments")
        .select("id", { count: "exact", head: true })
        .eq("task_id", taskId),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("parent_task_id", taskId),
    ]);

  if ((commentCount ?? 0) > 0) return true;
  if ((attachmentCount ?? 0) > 0) return true;
  if ((subtaskCount ?? 0) > 0) return true;

  return false;
}

export type TaskDeletionPreview = {
  success: true;
  hasProgress: boolean;
  isAdmin: boolean;
  /** Her zaman true — silme ASLA onaysız gerçekleşmez (bkz. resolveDeletionApprover). */
  requiresApproval: true;
  approvalTarget: "admin" | "assignee" | null;
  message: string;
} | { success: false; error: string };

type DeletionApprover =
  | {
      ok: true;
      userIds: string[];
      target: "admin" | "assignee";
      deletionStatus: TaskDeletionStatus;
    }
  | { ok: false; error: string };

/**
 * Silme talebini kimin onaylayacağını belirler.
 *
 * Kural (16→17 Ağustos değişikliği): görevin durumu ne olursa olsun — hiç
 * dokunulmamış, hiç aktivitesi olmayan bir görev bile — silme HER ZAMAN ikinci
 * bir kişinin onayından geçer. Önceki davranışta "ilerleme yoksa doğrudan sil"
 * kestirmesi vardı ve bu, silme davranışını göreve göre tutarsız yapıyordu.
 *
 * Onaylayan zinciri:
 *  1. Atanan kullanıcı (talep eden değilse)
 *  2. Diğer admin/owner'lar (talep eden hariç)
 * Hiçbiri yoksa silme reddedilir — tek kişilik workspace'te görev silinemez,
 * bu bilinçli bir sonuçtur ("onaysız silme yok" kuralının doğal bedeli).
 */
async function resolveDeletionApprover(
  supabase: SupabaseClient,
  params: {
    workspaceId: string;
    requesterId: string;
    assignee: string | null;
  },
): Promise<DeletionApprover> {
  const { workspaceId, requesterId, assignee } = params;

  if (assignee && assignee !== requesterId) {
    return {
      ok: true,
      userIds: [assignee],
      target: "assignee",
      deletionStatus: "pending_user_approval",
    };
  }

  const adminIds = (await getWorkspaceAdminIds(supabase, workspaceId)).filter(
    (uid) => uid !== requesterId,
  );
  if (adminIds.length > 0) {
    return {
      ok: true,
      userIds: adminIds,
      target: "admin",
      deletionStatus: "pending_admin_approval",
    };
  }

  return {
    ok: false,
    error:
      "Silme işlemi onay gerektirir ancak bu çalışma alanında onaylayabilecek başka kimse yok. Önce görevi bir üyeye atayın veya ikinci bir yönetici ekleyin.",
  };
}

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

    const assignee =
      (typeof existing.assignee_id === "string" && existing.assignee_id) ||
      (typeof existing.assigned_to === "string" && existing.assigned_to) ||
      null;

    let approvalTarget: "admin" | "assignee" | null = null;
    let message =
      "Silme işlemi onay gerektirir; görev onaylanana kadar silinmez.";

    if (workspaceId) {
      const approver = await resolveDeletionApprover(supabase, {
        workspaceId,
        requesterId: user.id,
        assignee,
      });
      if (approver.ok) {
        approvalTarget = approver.target;
        message =
          approver.target === "assignee"
            ? "Silme talebi göreve atanan kullanıcıya iletilecek. Onaylanana kadar görev silinmez."
            : "Silme talebi yöneticilere iletilecek. Onaylanana kadar görev silinmez.";
      } else {
        message = approver.error;
      }
    }

    return {
      success: true,
      hasProgress,
      isAdmin,
      requiresApproval: true,
      approvalTarget,
      message,
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
 * Silme iş akışı — TEK KURAL: onaysız silme yoktur.
 *
 * Görevin durumu (dokunulmamış / ilerlemiş), talep edenin rolü ya da başka
 * hiçbir koşul bu kuralı esnetmez. Talep her zaman `deletion_status`
 * (pending_user_approval | pending_admin_approval) olarak işaretlenir ve
 * onaylayana bildirim gider; gerçek silme yalnızca
 * `respondToTaskDeletion(..., "accept")` içinde gerçekleşir.
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

    // Onaylayacak kişiyi belirle — bulunamazsa hiçbir şey değiştirmeden dur.
    const approver = await resolveDeletionApprover(supabase, {
      workspaceId,
      requesterId: currentUserId,
      assignee,
    });
    if (!approver.ok) {
      return { success: false, error: approver.error };
    }

    const actorName = await resolveActorDisplayName(supabase, user);
    const link = projectId
      ? `/project/${projectId}?workspaceId=${encodeURIComponent(workspaceId)}`
      : null;
    const requestedAt = new Date().toISOString();

    const { error } = await supabase
      .from("tasks")
      .update({
        deletion_status: approver.deletionStatus,
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

    const requesterLabel = isAdmin ? `${actorName} (Admin)` : actorName;
    await Promise.all(
      approver.userIds.map((userId) =>
        insertNotification(supabase, {
          workspaceId,
          userId,
          type: "task_deletion_request",
          title: "Silme onayı gerekli",
          message: `${requesterLabel}, '${title}' görevini silmek istiyor. Onaylıyor musun?`,
          link,
          payload: {
            task_id: id,
            project_id: projectId,
            workspace_id: workspaceId,
            task_title: title,
            action:
              approver.target === "assignee"
                ? "deletion_user_approval"
                : "deletion_admin_approval",
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
      deletionStatus: approver.deletionStatus,
      message:
        approver.target === "assignee"
          ? "Silme isteği atanan kullanıcıya gönderildi. Onay bekleniyor — görev silinmedi."
          : "Silme isteği yöneticilere iletildi. Onay bekleniyor — görev silinmedi.",
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

// Silme onay/red: `@/app/actions/task-deletion-approval` — client doğrudan oradan import etmeli.

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
      const { data: updated, error } = await supabase
        .from("tasks")
        .update({
          assignment_status: "accepted" satisfies TaskAssignmentStatus,
          assignment_pending_at: null,
        })
        .eq("id", taskId)
        .select("id")
        .maybeSingle();

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
      // RLS satırı sessizce engellemiş olabilir (error=null, data=null) — bunu
      // açık bir hata olarak yüzeye çıkar, aksi hâlde UI yanlışlıkla "kabul
      // edildi" der ama görev DB'de hâlâ "pending" kalır.
      if (!updated) {
        return {
          success: false,
          error:
            "Görev güncellenemedi (yetki/RLS engeli olabilir). Lütfen tekrar deneyin veya yöneticinize bildirin.",
        };
      }
    } else {
      // Red: görevi silme — arşivle (rejected) ve adminleri bilgilendir
      const { data: rejected, error: rejectError } = await supabase
        .from("tasks")
        .update({
          assignment_status: "rejected" satisfies TaskAssignmentStatus,
          assignment_pending_at: null,
        })
        .eq("id", taskId)
        .select("id")
        .maybeSingle();

      if (rejectError) {
        if (rejectError.message.includes("assignment_status")) {
          return {
            success: false,
            error:
              "assignment_status sütunu yok. add_task_approval_workflows.sql migration'ını çalıştırın.",
          };
        }
        return { success: false, error: rejectError.message };
      }
      if (!rejected) {
        return {
          success: false,
          error:
            "Görev güncellenemedi (yetki/RLS engeli olabilir). Lütfen tekrar deneyin veya yöneticinize bildirin.",
        };
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
                message: `${actorName}, '${title}' görevini reddetti. Yeniden atamak için Yeni Görev penceresini kullanabilirsiniz.`,
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
    }

    revalidateTaskPaths(projectId);
    return {
      success: true,
      taskId,
      message:
        decision === "accept"
          ? "Görev kabul edildi."
          : "Görev reddedildi. Yöneticiler bilgilendirildi; görev arşivlendi.",
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
