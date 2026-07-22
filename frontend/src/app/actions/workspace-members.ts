"use server";

import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  loadProfilesByIds,
  resolveMemberDisplayFields,
} from "@/lib/member-labels";
import {
  resolveWorkspaceRole,
  type WorkspaceMemberOption,
} from "@/lib/workspace-permissions";

export type GetWorkspaceMembersResult =
  | { success: true; members: WorkspaceMemberOption[]; isAdmin: boolean }
  | { success: false; error: string; members: []; isAdmin: false };

export async function getWorkspaceMembers(
  workspaceId: string | null | undefined,
): Promise<GetWorkspaceMembersResult> {
  try {
    const wsId = workspaceId?.trim() ?? "";
    if (!wsId) {
      return {
        success: false,
        error: "Workspace kimliği zorunludur.",
        members: [],
        isAdmin: false,
      };
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return {
        success: false,
        error: "Oturum bulunamadı.",
        members: [],
        isAdmin: false,
      };
    }

    const { supabase, user } = auth;
    const roleCtx = await resolveWorkspaceRole(supabase, wsId, user.id);

    if (!roleCtx.isAdmin && !roleCtx.role) {
      return {
        success: false,
        error: "Bu workspace üyesi değilsiniz.",
        members: [],
        isAdmin: false,
      };
    }

    const { data: rows, error } = await supabase
      .from("workspace_members")
      .select("user_id, role")
      .eq("workspace_id", wsId);

    if (error) {
      console.error("[getWorkspaceMembers]", error);
      return {
        success: false,
        error: error.message,
        members: [],
        isAdmin: false,
      };
    }

    const memberRows = [...(rows ?? [])];
    const userIds = memberRows
      .map((r) => r.user_id as string)
      .filter(Boolean);

    if (roleCtx.isOwner && !userIds.includes(user.id)) {
      memberRows.push({ user_id: user.id, role: "OWNER" });
      userIds.push(user.id);
    }

    const profileById = await loadProfilesByIds(supabase, userIds);

    const members: WorkspaceMemberOption[] = memberRows.map((row) => {
      const uid = row.user_id as string;
      const profile = profileById.get(uid) ?? null;
      const emailHint = uid === user.id ? (user.email ?? null) : null;
      const fields = resolveMemberDisplayFields(profile, emailHint);

      return {
        id: uid,
        email: fields.email,
        role: (row.role as string | null) ?? null,
        fullName: fields.fullName,
        avatarUrl: fields.avatarUrl,
        displayName: fields.displayName,
      };
    });

    console.info("[getWorkspaceMembers]", {
      wsId,
      count: members.length,
      labels: members.map((m) => ({
        id: m.id,
        displayName: m.displayName,
        email: m.email,
      })),
    });

    if (!roleCtx.isAdmin) {
      return {
        success: true,
        isAdmin: false,
        members: members.filter((m) => m.id === user.id),
      };
    }

    return { success: true, isAdmin: true, members };
  } catch (error) {
    console.error("[getWorkspaceMembers] catch:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Üyeler alınamadı.",
      members: [],
      isAdmin: false,
    };
  }
}
