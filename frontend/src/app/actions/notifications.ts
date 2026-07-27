"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getWorkspaces } from "@/app/actions/workspaces";
import { withWorkspaceQuery } from "@/lib/active-workspace";
import { logActionError } from "@/lib/action-result";
import {
  pickDefaultAdminWorkspace,
  resolveActorDisplayName,
} from "@/lib/member-labels";
import type { NotificationItem } from "@/lib/notification-utils";

export type { NotificationItem } from "@/lib/notification-utils";

/**
 * Giriş sonrası yönlendirme:
 * - Workspace yoksa → /onboarding
 * - Varsa Admin olduğu varsayılan workspace → /?workspaceId=...
 */
export async function resolvePostLoginRedirect(): Promise<{
  href: string;
  workspaceId: string | null;
}> {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      // Cookie henüz Server Action'a yansımamış olabilir — login'e geri atma
      return { href: "/", workspaceId: null };
    }

    const result = await getWorkspaces();
    if (!result.success || result.workspaces.length === 0) {
      return { href: "/onboarding", workspaceId: null };
    }

    const preferred = pickDefaultAdminWorkspace(result.workspaces);
    const workspaceId = preferred?.id ?? result.workspaces[0]?.id ?? null;
    if (!workspaceId) {
      return { href: "/onboarding", workspaceId: null };
    }

    return {
      href: withWorkspaceQuery("/", workspaceId),
      workspaceId,
    };
  } catch (error) {
    console.error("[resolvePostLoginRedirect]", error);
    return { href: "/", workspaceId: null };
  }
}

export type PendingInvitationItem = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  role: string | null;
  email: string;
  createdAt: string | null;
};

export type GetPendingInvitationsResult =
  | { success: true; invitations: PendingInvitationItem[] }
  | { success: false; error: string; invitations: [] };

/** Kullanıcının e-postasına gelen bekleyen workspace davetleri. */
export async function getMyPendingInvitations(): Promise<GetPendingInvitationsResult> {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return { success: false, error: "Oturum bulunamadı.", invitations: [] };
    }

    const { supabase, user } = auth;
    const email = user.email?.toLowerCase().trim();
    if (!email) {
      return { success: true, invitations: [] };
    }

    let query = await supabase
      .from("workspace_invitations")
      .select("id, workspace_id, email, role, status, created_at")
      .ilike("email", email)
      .in("status", ["PENDING", "pending"])
      .order("created_at", { ascending: false });

    if (query.error?.message?.includes("workspace_invitations")) {
      query = await supabase
        .from("invitations")
        .select("id, workspace_id, email, role, status, created_at")
        .ilike("email", email)
        .in("status", ["PENDING", "pending"])
        .order("created_at", { ascending: false });
    }

    if (query.error) {
      return {
        success: false,
        error: query.error.message,
        invitations: [],
      };
    }

    const rows = query.data ?? [];
    const workspaceIds = [
      ...new Set(
        rows
          .map((r) => r.workspace_id as string)
          .filter(Boolean),
      ),
    ];

    const nameById = new Map<string, string>();
    if (workspaceIds.length > 0) {
      const { data: workspaces } = await supabase
        .from("workspaces")
        .select("id, name")
        .in("id", workspaceIds);
      for (const ws of workspaces ?? []) {
        nameById.set(String(ws.id), String(ws.name ?? "Workspace"));
      }
    }

    const invitations: PendingInvitationItem[] = rows.map((row) => {
      const workspaceId = row.workspace_id as string;
      return {
        id: row.id as string,
        workspaceId,
        workspaceName: nameById.get(workspaceId) ?? "Workspace",
        role: (row.role as string | null) ?? "Member",
        email: String(row.email ?? email),
        createdAt: (row.created_at as string | null) ?? null,
      };
    });

    return { success: true, invitations };
  } catch (error) {
    console.error("[getMyPendingInvitations]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Davetler alınamadı.",
      invitations: [],
    };
  }
}

function mapNotificationRow(row: Record<string, unknown>): NotificationItem {
  const metadata =
    row.metadata && typeof row.metadata === "object"
      ? (row.metadata as Record<string, unknown>)
      : null;
  const payload =
    row.payload && typeof row.payload === "object"
      ? (row.payload as Record<string, unknown>)
      : metadata;

  return {
    id: row.id as string,
    workspaceId: (row.workspace_id as string | null) ?? null,
    type: String(row.type ?? ""),
    title: String(row.title ?? ""),
    message: String(row.message ?? ""),
    isRead: Boolean(row.is_read),
    createdAt: (row.created_at as string | null) ?? null,
    link: (row.link as string | null) ?? null,
    metadata,
    payload,
  };
}

/** Kullanıcının okunmamış / son bildirimleri (invite uyumlu). */
export async function getMyNotifications(limit = 20): Promise<{
  success: boolean;
  notifications: NotificationItem[];
  unreadCount: number;
  error?: string;
}> {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return {
        success: false,
        notifications: [],
        unreadCount: 0,
        error: "Oturum yok.",
      };
    }

    let query = await auth.supabase
      .from("notifications")
      .select(
        "id, workspace_id, type, title, message, is_read, created_at, metadata, payload, link",
      )
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (
      query.error?.message?.includes("payload") ||
      query.error?.message?.includes("link")
    ) {
      query = (await auth.supabase
        .from("notifications")
        .select(
          "id, workspace_id, type, title, message, is_read, created_at, metadata",
        )
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(limit)) as typeof query;
    }

    const { data, error } = query;

    if (error) {
      if (
        error.message.includes("notifications") ||
        error.code === "42P01" ||
        error.code === "PGRST205"
      ) {
        return { success: true, notifications: [], unreadCount: 0 };
      }
      return {
        success: false,
        notifications: [],
        unreadCount: 0,
        error: error.message,
      };
    }

    const notifications = (data ?? []).map((row) =>
      mapNotificationRow(row as Record<string, unknown>),
    );

    return {
      success: true,
      notifications,
      unreadCount: notifications.filter((n) => !n.isRead).length,
    };
  } catch (error) {
    return {
      success: false,
      notifications: [],
      unreadCount: 0,
      error: logActionError(
        "getMyNotifications",
        error,
        "Bildirimler getirilirken bir hata oluştu.",
      ),
    };
  }
}

/** Invite sonrası bildirim kaydı (invitee profiles'da varsa). */
export async function createInviteNotification(input: {
  workspaceId: string;
  workspaceName: string;
  inviteeUserId: string;
  invitationId: string;
  invitedByName?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return { success: false, error: "Oturum bulunamadı." };
    }

    const message = `${input.invitedByName ?? "Bir yönetici"} sizi "${input.workspaceName}" çalışma alanına davet etti.`;
    const payload = {
      invitation_id: input.invitationId,
      invite_id: input.invitationId,
      workspace_id: input.workspaceId,
      workspace_name: input.workspaceName,
    };

    const { error } = await auth.supabase.from("notifications").insert({
      workspace_id: input.workspaceId,
      user_id: input.inviteeUserId,
      type: "workspace_invite",
      title: "Workspace daveti",
      message,
      metadata: payload,
      payload,
      link: `/?workspaceId=${encodeURIComponent(input.workspaceId)}`,
      is_read: false,
    });

    if (error) {
      // Eski şema: payload/link yoksa metadata ile dene
      if (
        error.message.includes("payload") ||
        error.message.includes("link")
      ) {
        const fallback = await auth.supabase.from("notifications").insert({
          workspace_id: input.workspaceId,
          user_id: input.inviteeUserId,
          type: "WORKSPACE_INVITE",
          title: "Workspace daveti",
          message,
          metadata: payload,
          is_read: false,
        });
        if (fallback.error) {
          console.error(
            "[createInviteNotification]",
            fallback.error.message,
          );
          return { success: false, error: fallback.error.message };
        }
        return { success: true };
      }
      console.error("[createInviteNotification]", error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: logActionError(
        "createInviteNotification",
        error,
        "Davet bildirimi oluşturulamadı.",
      ),
    };
  }
}

/**
 * Görev atandığında assignee'ye bildirim yazar.
 * Kendine atamada çağrılmamalı (caller kontrol eder).
 */
export async function createTaskAssignedNotification(input: {
  workspaceId: string;
  projectId: string;
  taskId: string;
  taskTitle: string;
  assigneeUserId: string;
  actorName?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const assigneeId = input.assigneeUserId?.trim();
    const workspaceId = input.workspaceId?.trim();
    const projectId = input.projectId?.trim();
    const taskId = input.taskId?.trim();
    if (!assigneeId || !workspaceId || !projectId || !taskId) {
      return { success: false, error: "Bildirim için gerekli alanlar eksik." };
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return { success: false, error: "Oturum bulunamadı." };
    }

    // Kendine atama → bildirim yok
    if (assigneeId === auth.user.id) {
      return { success: true };
    }

    const actor =
      input.actorName?.trim() ||
      (await resolveActorDisplayName(auth.supabase, auth.user));

    const taskTitle = input.taskTitle?.trim() || "görev";
    const message = `${actor} sana '${taskTitle}' görevini atadı. Kabul ediyor musunuz?`;
    const link = `/project/${projectId}?workspaceId=${encodeURIComponent(workspaceId)}`;
    const payload = {
      project_id: projectId,
      task_id: taskId,
      task_title: taskTitle,
      workspace_id: workspaceId,
      assigned_by: auth.user.id,
      action: "task_claim",
    };

    const { error } = await auth.supabase.from("notifications").insert({
      workspace_id: workspaceId,
      user_id: assigneeId,
      type: "task_claim_request",
      title: "Görev ataması — onayınız gerekli",
      message,
      metadata: payload,
      payload,
      link,
      is_read: false,
    });

    if (error) {
      if (
        error.message.includes("payload") ||
        error.message.includes("link")
      ) {
        const fallback = await auth.supabase.from("notifications").insert({
          workspace_id: workspaceId,
          user_id: assigneeId,
          type: "task_claim_request",
          title: "Görev ataması — onayınız gerekli",
          message,
          metadata: payload,
          is_read: false,
        });
        if (fallback.error) {
          console.error(
            "[createTaskAssignedNotification]",
            fallback.error.message,
          );
          return { success: false, error: fallback.error.message };
        }
        return { success: true };
      }
      console.error("[createTaskAssignedNotification]", error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: logActionError(
        "createTaskAssignedNotification",
        error,
        "Görev atama bildirimi oluşturulamadı.",
      ),
    };
  }
}

export async function markNotificationRead(
  notificationId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return { success: false, error: "Oturum bulunamadı." };
    }

    const id = notificationId?.trim();
    if (!id) {
      return { success: false, error: "Bildirim kimliği zorunludur." };
    }

    const { error } = await auth.supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("user_id", auth.user.id);

    if (error) {
      console.error("[markNotificationRead]", error.message);
      return { success: false, error: error.message };
    }

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: logActionError(
        "markNotificationRead",
        error,
        "Bildirim okundu olarak işaretlenemedi.",
      ),
    };
  }
}

export async function markAllNotificationsRead(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return { success: false, error: "Oturum yok." };
    }

    const { error } = await auth.supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", auth.user.id)
      .eq("is_read", false);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: logActionError(
        "markAllNotificationsRead",
        error,
        "Bildirimler okundu olarak işaretlenemedi.",
      ),
    };
  }
}

/** Alias: getNotifications */
export const getNotifications = getMyNotifications;

/** Alias: markNotificationAsRead */
export const markNotificationAsRead = markNotificationRead;

/** Alias: markAllNotificationsAsRead */
export const markAllNotificationsAsRead = markAllNotificationsRead;

/**
 * Workspace davetine kabul/ret — invitations aksiyonlarını sarmalar.
 */
export async function respondToWorkspaceInvite(
  inviteId: string,
  action: "accept" | "decline",
): Promise<{ success: boolean; error?: string; workspaceId?: string }> {
  try {
    const { acceptInvitation, declineInvitation } = await import(
      "@/app/actions/invitations"
    );

    if (action === "accept") {
      const result = await acceptInvitation(inviteId);
      if (!result.success) {
        return { success: false, error: result.error };
      }
      return {
        success: true,
        workspaceId: result.workspaceIds[0],
      };
    }

    const result = await declineInvitation(inviteId);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: logActionError(
        "respondToWorkspaceInvite",
        error,
        "Davet yanıtlanırken bir hata oluştu.",
      ),
    };
  }
}
