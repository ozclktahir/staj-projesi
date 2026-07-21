"use server";

import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  resolveWorkspaceRole,
  type WorkspaceMemberOption,
} from "@/lib/workspace-permissions";

export type GetWorkspaceMembersResult =
  | { success: true; members: WorkspaceMemberOption[]; isAdmin: boolean }
  | { success: false; error: string; members: []; isAdmin: false };

function displayName(
  profile: Record<string, unknown> | null | undefined,
  email: string | null,
  fallback: string,
): string {
  if (profile) {
    const name =
      (typeof profile.full_name === "string" && profile.full_name) ||
      (typeof profile.name === "string" && profile.name) ||
      (typeof profile.username === "string" && profile.username);
    if (name) return name;
  }
  if (email) return email.split("@")[0] ?? email;
  return fallback;
}

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
        isAdmin: roleCtx.isAdmin,
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

    const profileById = new Map<string, Record<string, unknown>>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds);
      for (const p of profiles ?? []) {
        if (p && typeof p === "object" && "id" in p) {
          profileById.set(
            String((p as { id: string }).id),
            p as Record<string, unknown>,
          );
        }
      }
    }

    const members: WorkspaceMemberOption[] = memberRows.map((row) => {
      const uid = row.user_id as string;
      const profile = profileById.get(uid) ?? null;
      const email =
        (profile && typeof profile.email === "string" && profile.email) ||
        (uid === user.id ? (user.email ?? null) : null);
      return {
        id: uid,
        email,
        role: (row.role as string | null) ?? null,
        displayName: displayName(profile, email, "Üye"),
      };
    });

    // Member ise yalnızca kendini döndür (assignee kısıtı UI)
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
