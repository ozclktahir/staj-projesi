"use server";

import { revalidateTag } from "next/cache";
import { getCachedWorkspaceMembers } from "@/lib/data-cache";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { resolveWorkspaceRole } from "@/lib/workspace-permissions";
import type { WorkspaceMemberOption } from "@/lib/member-labels";

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

    const { supabase, user, accessToken } = auth;
    const roleCtx = await resolveWorkspaceRole(supabase, wsId, user.id);

    if (!roleCtx.isAdmin && !roleCtx.role) {
      return {
        success: false,
        error: "Bu workspace üyesi değilsiniz.",
        members: [],
        isAdmin: false,
      };
    }

    const cached = await getCachedWorkspaceMembers(
      wsId,
      user.id,
      accessToken,
      roleCtx.isAdmin,
      roleCtx.isOwner,
      roleCtx.role,
    );

    return {
      success: true,
      isAdmin: cached.isAdmin,
      members: cached.members,
    };
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

/** Üye listesi cache'ini invalid et (davet kabul / rol değişimi sonrası). */
export async function invalidateWorkspaceMembersCache(workspaceId: string) {
  const id = workspaceId?.trim();
  if (!id) return;
  revalidateTag(`workspace-members-${id}`, "max");
}
