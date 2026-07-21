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

/** Workspace sahibi veya workspace_members.role üzerinden rol çözümler. */
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
 * - projects.assigned_to / user_id == user
 * - veya üzerinde assignee_id / assigned_to == user olan görev bulunan projeler
 */
export async function getMemberVisibleProjectIds(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
): Promise<string[]> {
  const ids = new Set<string>();

  const { data: assignedProjects } = await supabase
    .from("projects")
    .select("id")
    .eq("workspace_id", workspaceId)
    .or(`assigned_to.eq.${userId},user_id.eq.${userId}`);

  for (const row of assignedProjects ?? []) {
    if (typeof row.id === "string") ids.add(row.id);
  }

  let tasksQuery = await supabase
    .from("tasks")
    .select("project_id")
    .eq("workspace_id", workspaceId)
    .or(`assignee_id.eq.${userId},assigned_to.eq.${userId}`);

  if (tasksQuery.error?.message?.includes("assigned_to")) {
    tasksQuery = await supabase
      .from("tasks")
      .select("project_id")
      .eq("workspace_id", workspaceId)
      .eq("assignee_id", userId);
  }

  if (tasksQuery.error?.message?.includes("assignee_id")) {
    tasksQuery = await supabase
      .from("tasks")
      .select("project_id")
      .eq("workspace_id", workspaceId)
      .eq("created_by", userId);
  }

  for (const row of tasksQuery.data ?? []) {
    if (typeof row.project_id === "string") ids.add(row.project_id);
  }

  return Array.from(ids);
}

export type WorkspaceMemberOption = {
  id: string;
  displayName: string;
  email: string | null;
  role: string | null;
};
