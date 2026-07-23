"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  formatPersonName,
  loadProfilesByIds,
  resolveMemberDisplayFields,
} from "@/lib/member-labels";

export type ActivityLogItem = {
  id: string;
  workspaceId: string;
  projectId: string | null;
  taskId: string | null;
  userId: string;
  actionType: string;
  details: Record<string, unknown>;
  createdAt: string | null;
  actorName: string;
  actorAvatarUrl: string | null;
};

function mapRow(
  row: Record<string, unknown>,
  actorName: string,
  actorAvatarUrl: string | null,
): ActivityLogItem {
  const details =
    row.details && typeof row.details === "object"
      ? (row.details as Record<string, unknown>)
      : {};

  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    projectId: (row.project_id as string | null) ?? null,
    taskId: (row.task_id as string | null) ?? null,
    userId: row.user_id as string,
    actionType: String(row.action_type ?? row.action ?? ""),
    details,
    createdAt: (row.created_at as string | null) ?? null,
    actorName,
    actorAvatarUrl,
  };
}

async function enrich(
  supabase: SupabaseClient,
  rows: Record<string, unknown>[],
): Promise<ActivityLogItem[]> {
  const userIds = [
    ...new Set(
      rows
        .map((r) => r.user_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  ];
  const profiles = await loadProfilesByIds(supabase, userIds);

  return rows.map((row) => {
    const uid = typeof row.user_id === "string" ? row.user_id : "";
    const profile = profiles.get(uid) ?? null;
    const fields = resolveMemberDisplayFields(profile, null);
    const name = formatPersonName(profile, fields.email) || fields.displayName;
    return mapRow(row, name || "Kullanıcı", fields.avatarUrl);
  });
}

export async function getTaskActivityLogs(
  taskId: string,
  limit = 50,
): Promise<{ success: boolean; logs: ActivityLogItem[]; error?: string }> {
  try {
    const id = taskId?.trim() ?? "";
    if (!id) return { success: false, logs: [], error: "Görev kimliği zorunlu." };

    const auth = await getAuthenticatedUser();
    if (!auth) return { success: false, logs: [], error: "Oturum yok." };

    const { data, error } = await auth.supabase
      .from("activity_logs")
      .select(
        "id, workspace_id, project_id, task_id, user_id, action_type, details, created_at, action",
      )
      .eq("task_id", id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      if (
        error.message.includes("activity_logs") ||
        error.code === "42P01" ||
        error.code === "PGRST205"
      ) {
        return { success: true, logs: [] };
      }
      return { success: false, logs: [], error: error.message };
    }

    return {
      success: true,
      logs: await enrich(
        auth.supabase,
        (data ?? []) as Record<string, unknown>[],
      ),
    };
  } catch (error) {
    return {
      success: false,
      logs: [],
      error: error instanceof Error ? error.message : "Loglar alınamadı.",
    };
  }
}

export async function getProjectActivityLogs(
  projectId: string,
  limit = 80,
): Promise<{ success: boolean; logs: ActivityLogItem[]; error?: string }> {
  try {
    const id = projectId?.trim() ?? "";
    if (!id) return { success: false, logs: [], error: "Proje kimliği zorunlu." };

    const auth = await getAuthenticatedUser();
    if (!auth) return { success: false, logs: [], error: "Oturum yok." };

    const { data, error } = await auth.supabase
      .from("activity_logs")
      .select(
        "id, workspace_id, project_id, task_id, user_id, action_type, details, created_at, action",
      )
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      if (
        error.message.includes("activity_logs") ||
        error.code === "42P01" ||
        error.code === "PGRST205"
      ) {
        return { success: true, logs: [] };
      }
      return { success: false, logs: [], error: error.message };
    }

    return {
      success: true,
      logs: await enrich(
        auth.supabase,
        (data ?? []) as Record<string, unknown>[],
      ),
    };
  } catch (error) {
    return {
      success: false,
      logs: [],
      error: error instanceof Error ? error.message : "Loglar alınamadı.",
    };
  }
}

export async function getWorkspaceActivityLogs(
  workspaceId: string,
  limit = 8,
): Promise<{ success: boolean; logs: ActivityLogItem[]; error?: string }> {
  try {
    const id = workspaceId?.trim() ?? "";
    if (!id) {
      return { success: false, logs: [], error: "Workspace kimliği zorunlu." };
    }

    const auth = await getAuthenticatedUser();
    if (!auth) return { success: false, logs: [], error: "Oturum yok." };

    const { data, error } = await auth.supabase
      .from("activity_logs")
      .select(
        "id, workspace_id, project_id, task_id, user_id, action_type, details, created_at, action",
      )
      .eq("workspace_id", id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      if (
        error.message.includes("activity_logs") ||
        error.code === "42P01" ||
        error.code === "PGRST205"
      ) {
        return { success: true, logs: [] };
      }
      return { success: false, logs: [], error: error.message };
    }

    return {
      success: true,
      logs: await enrich(
        auth.supabase,
        (data ?? []) as Record<string, unknown>[],
      ),
    };
  } catch (error) {
    return {
      success: false,
      logs: [],
      error: error instanceof Error ? error.message : "Loglar alınamadı.",
    };
  }
}
