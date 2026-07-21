"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getWorkspaces } from "@/app/actions/workspaces";
import { withWorkspaceQuery } from "@/lib/active-workspace";
import { pickDefaultAdminWorkspace } from "@/lib/member-labels";

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
      return { href: "/login", workspaceId: null };
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
      .eq("status", "PENDING")
      .order("created_at", { ascending: false });

    if (query.error?.message?.includes("workspace_invitations")) {
      query = await supabase
        .from("invitations")
        .select("id, workspace_id, email, role, status, created_at")
        .ilike("email", email)
        .eq("status", "PENDING")
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

export type NotificationItem = {
  id: string;
  workspaceId: string | null;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string | null;
  metadata: Record<string, unknown> | null;
};

/** Kullanıcının okunmamış / son bildirimleri (invite uyumlu). */
export async function getMyNotifications(limit = 20): Promise<{
  success: boolean;
  notifications: NotificationItem[];
  error?: string;
}> {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return { success: false, notifications: [], error: "Oturum yok." };
    }

    const { data, error } = await auth.supabase
      .from("notifications")
      .select(
        "id, workspace_id, type, title, message, is_read, created_at, metadata",
      )
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      // Tablo yoksa sessizce boş dön
      if (
        error.message.includes("notifications") ||
        error.code === "42P01" ||
        error.code === "PGRST205"
      ) {
        return { success: true, notifications: [] };
      }
      return { success: false, notifications: [], error: error.message };
    }

    return {
      success: true,
      notifications: (data ?? []).map((row) => ({
        id: row.id as string,
        workspaceId: (row.workspace_id as string | null) ?? null,
        type: String(row.type ?? ""),
        title: String(row.title ?? ""),
        message: String(row.message ?? ""),
        isRead: Boolean(row.is_read),
        createdAt: (row.created_at as string | null) ?? null,
        metadata:
          row.metadata && typeof row.metadata === "object"
            ? (row.metadata as Record<string, unknown>)
            : null,
      })),
    };
  } catch (error) {
    return {
      success: false,
      notifications: [],
      error: error instanceof Error ? error.message : "Bildirimler alınamadı.",
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
}): Promise<void> {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) return;

    const { error } = await auth.supabase.from("notifications").insert({
      workspace_id: input.workspaceId,
      user_id: input.inviteeUserId,
      type: "WORKSPACE_INVITE",
      title: "Workspace daveti",
      message: `${input.invitedByName ?? "Bir yönetici"} sizi "${input.workspaceName}" çalışma alanına davet etti.`,
      metadata: {
        invitation_id: input.invitationId,
        workspace_id: input.workspaceId,
      },
      is_read: false,
    });

    if (error) {
      console.warn("[createInviteNotification]", error.message);
    }
  } catch (error) {
    console.warn("[createInviteNotification] catch", error);
  }
}

export async function markNotificationRead(
  notificationId: string,
): Promise<{ success: boolean }> {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) return { success: false };

    await auth.supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", auth.user.id);

    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: false };
  }
}
