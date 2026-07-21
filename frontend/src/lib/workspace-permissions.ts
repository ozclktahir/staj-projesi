"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isAdminRole } from "@/lib/rbac";

export type WorkspaceRoleContext = {
  workspaceId: string;
  userId: string;
  role: string | null;
  isOwner: boolean;
  isAdmin: boolean;
};

/** Workspace sahibi veya workspace_members.role üzerinden rol çözümler (workspace-scoped RBAC). */
export async function resolveWorkspaceRole(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
): Promise<WorkspaceRoleContext> {
  const wsId = workspaceId.trim();
  const uid = userId.trim();

  const { data: owned } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", wsId)
    .eq("owner_id", uid)
    .maybeSingle();

  if (owned?.id) {
    return {
      workspaceId: wsId,
      userId: uid,
      role: "OWNER",
      isOwner: true,
      isAdmin: true,
    };
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", wsId)
    .eq("user_id", uid)
    .maybeSingle();

  const role = (membership?.role as string | null) ?? null;

  return {
    workspaceId: wsId,
    userId: uid,
    role,
    isOwner: false,
    isAdmin: isAdminRole(role),
  };
}

/**
 * MEMBER için görünür proje ID'leri:
 * 1) projects.assigned_to / user_id == user
 * 2) tasks.assignee_id / assigned_to == user → project_id
 *
 * workspace_id eşleşmesi opsiyonel (görevde NULL olabilir).
 */
export async function getMemberVisibleProjectIds(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
): Promise<string[]> {
  const ids = new Set<string>();
  const wsId = workspaceId.trim();
  const uid = userId.trim();

  // 1) Doğrudan projeye atanmış
  const projectAttempts = [
    () =>
      supabase
        .from("projects")
        .select("id")
        .eq("workspace_id", wsId)
        .eq("assigned_to", uid),
    () =>
      supabase
        .from("projects")
        .select("id")
        .eq("workspace_id", wsId)
        .or(`assigned_to.eq.${uid},user_id.eq.${uid}`),
  ];

  for (const attempt of projectAttempts) {
    const { data, error } = await attempt();
    if (error) {
      console.warn(
        "[getMemberVisibleProjectIds] projects attempt:",
        error.message,
      );
      continue;
    }
    for (const row of data ?? []) {
      if (typeof row.id === "string") ids.add(row.id);
    }
    break;
  }

  // 2) Kullanıcıya atanmış görevlerin project_id'leri
  //    Önce assignee_id, sonra assigned_to; workspace filtresi esnek
  const taskAttempts: Array<() => Promise<{ data: unknown; error: { message: string } | null }>> = [
    async () =>
      supabase
        .from("tasks")
        .select("project_id, workspace_id")
        .eq("assignee_id", uid),
    async () =>
      supabase
        .from("tasks")
        .select("project_id, workspace_id")
        .eq("assigned_to", uid),
    async () =>
      supabase
        .from("tasks")
        .select("project_id")
        .eq("workspace_id", wsId)
        .eq("assignee_id", uid),
    async () =>
      supabase
        .from("tasks")
        .select("project_id")
        .eq("workspace_id", wsId)
        .eq("assigned_to", uid),
  ];

  for (const attempt of taskAttempts) {
    const { data, error } = await attempt();
    if (error) {
      console.warn(
        "[getMemberVisibleProjectIds] tasks attempt:",
        error.message,
      );
      continue;
    }
    for (const row of (data as { project_id?: string; workspace_id?: string | null }[]) ?? []) {
      if (typeof row.project_id !== "string") continue;
      // workspace filtresi: eşleşen veya NULL (eski kayıtlar)
      if (
        row.workspace_id == null ||
        row.workspace_id === wsId ||
        !("workspace_id" in row)
      ) {
        ids.add(row.project_id);
      }
    }
  }

  console.log("[getMemberVisibleProjectIds]", {
    workspaceId: wsId,
    userId: uid,
    count: ids.size,
    ids: Array.from(ids),
  });

  return Array.from(ids);
}

export type WorkspaceMemberOption = {
  id: string;
  displayName: string;
  email: string | null;
  role: string | null;
};
