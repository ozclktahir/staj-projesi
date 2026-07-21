"use server";

import { getAuthenticatedUser } from "@/lib/supabase/server";
import { acceptPendingInvitations } from "@/app/actions/invitations";

export type WorkspaceAccessResult = {
  hasAccess: boolean;
  workspaceCount: number;
  userId: string | null;
};

/**
 * Kullanıcının sahibi olduğu veya üye olduğu en az bir workspace var mı?
 * Önce bekleyen davetleri kabul eder.
 */
export async function ensureWorkspaceAccess(): Promise<WorkspaceAccessResult> {
  try {
    await acceptPendingInvitations();

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return { hasAccess: false, workspaceCount: 0, userId: null };
    }

    const { supabase, user } = auth;

    const [{ count: ownedCount }, { count: memberCount }] = await Promise.all([
      supabase
        .from("workspaces")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", user.id),
      supabase
        .from("workspace_members")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

    const workspaceCount = Math.max(
      ownedCount ?? 0,
      // üyelik + sahiplik örtüşebilir; hasAccess için > 0 yeter
      (ownedCount ?? 0) + (memberCount ?? 0) > 0
        ? Math.max(ownedCount ?? 0, memberCount ?? 0)
        : 0,
    );

    const hasAccess = (ownedCount ?? 0) > 0 || (memberCount ?? 0) > 0;

    return {
      hasAccess,
      workspaceCount: hasAccess ? Math.max(workspaceCount, 1) : 0,
      userId: user.id,
    };
  } catch (error) {
    console.error("[ensureWorkspaceAccess]", error);
    return { hasAccess: false, workspaceCount: 0, userId: null };
  }
}
