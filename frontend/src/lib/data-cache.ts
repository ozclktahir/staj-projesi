import { unstable_cache } from "next/cache";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { WorkspaceMemberOption } from "@/lib/member-labels";
import {
  loadProfilesByIds,
  resolveMemberDisplayFields,
} from "@/lib/member-labels";
import type { DashboardProject } from "@/lib/supabase/types";

function createTokenClient(accessToken: string): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon || !accessToken) return null;
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type CachedMembersPayload = {
  members: WorkspaceMemberOption[];
  isAdmin: boolean;
  role: string | null;
  isOwner: boolean;
};

/**
 * Workspace üyelerini DOĞRUDAN (cache'siz) okur. Rol değişikliği gibi
 * "yazdığını hemen gör" gereken ekranlar bunu kullanır.
 */
export async function readWorkspaceMembers(
  workspaceId: string,
  userId: string,
  accessToken: string,
  isAdmin: boolean,
  isOwner: boolean,
  role: string | null,
): Promise<CachedMembersPayload> {
  const supabase = createTokenClient(accessToken);
  if (!supabase) {
    return { members: [], isAdmin, role, isOwner };
  }

  const { data: rows, error } = await supabase
    .from("workspace_members")
    .select("user_id, role")
    .eq("workspace_id", workspaceId);

  if (error) {
    console.error("[readWorkspaceMembers]", error.message);
    return { members: [], isAdmin, role, isOwner };
  }

  const memberRows = [...(rows ?? [])];
  const userIds = memberRows.map((r) => r.user_id as string).filter(Boolean);

  if (isOwner && !userIds.includes(userId)) {
    memberRows.push({ user_id: userId, role: "OWNER" });
    userIds.push(userId);
  }

  const profileById = await loadProfilesByIds(supabase, userIds);

  const members: WorkspaceMemberOption[] = memberRows.map((row) => {
    const uid = row.user_id as string;
    const profile = profileById.get(uid) ?? null;
    const fields = resolveMemberDisplayFields(profile, null);
    return {
      id: uid,
      email: fields.email,
      role: (row.role as string | null) ?? null,
      fullName: fields.fullName,
      avatarUrl: fields.avatarUrl,
      displayName: fields.displayName,
    };
  });

  // Görüntüleme herkese açık (view-only); rol değiştirme/çıkarma gibi
  // düzenleme işlemleri istemci tarafında (MembersTable) `isAdmin`
  // ile ayrıca kısıtlanır — bkz. members-table.tsx.

  return { members, isAdmin, role, isOwner };
}

/**
 * Workspace üyeleri — sık okunan, seyrek değişen veri (5 dk cache).
 * Tag: `workspace-members-{workspaceId}`
 */
export function getCachedWorkspaceMembers(
  workspaceId: string,
  userId: string,
  accessToken: string,
  isAdmin: boolean,
  isOwner: boolean,
  role: string | null,
): Promise<CachedMembersPayload> {
  return unstable_cache(
    () =>
      readWorkspaceMembers(
        workspaceId,
        userId,
        accessToken,
        isAdmin,
        isOwner,
        role,
      ),
    [`workspace-members`, workspaceId, userId, isAdmin ? "admin" : "member"],
    {
      revalidate: 300,
      tags: [`workspace-members-${workspaceId}`, `user-members-${userId}`],
    },
  )();
}

type CachedProjectsPayload = {
  projects: DashboardProject[];
};

/**
 * Workspace proje listesi — 5 dk cache.
 * Tag: `user-projects:{userId}`
 */
export function getCachedWorkspaceProjects(
  workspaceId: string,
  userId: string,
  accessToken: string,
  isAdmin: boolean,
): Promise<CachedProjectsPayload> {
  return unstable_cache(
    async (): Promise<CachedProjectsPayload> => {
      const supabase = createTokenClient(accessToken);
      if (!supabase) return { projects: [] };

      let query = supabase
        .from("projects")
        .select(
          "id, name, description, created_at, updated_at, workspace_id, user_id, created_by",
        )
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(60);

      if (!isAdmin) {
        // MEMBER: görünür projeler (atanmış görevlerin proje id'leri)
        const { data: taskRows } = await supabase
          .from("tasks")
          .select("project_id")
          .eq("assignee_id", userId)
          .eq("workspace_id", workspaceId)
          .limit(200);
        const ids = [
          ...new Set(
            (taskRows ?? [])
              .map((r) => r.project_id as string | null)
              .filter((id): id is string => Boolean(id)),
          ),
        ];
        if (ids.length === 0) return { projects: [] };
        query = supabase
          .from("projects")
          .select(
            "id, name, description, created_at, updated_at, workspace_id, user_id, created_by",
          )
          .in("id", ids)
          .order("created_at", { ascending: false })
          .limit(60);
      }

      const { data, error } = await query;
      if (error) {
        console.error("[getCachedWorkspaceProjects]", error.message);
        return { projects: [] };
      }

      return {
        projects: (data ?? []).map((row) => ({
          id: row.id as string,
          name: (row.name as string) ?? "Adsız proje",
          description: (row.description as string | null) ?? null,
          created_at: (row.created_at as string | null) ?? null,
          updated_at:
            "updated_at" in row
              ? ((row.updated_at as string | null) ?? null)
              : null,
          workspace_id: (row.workspace_id as string | null) ?? null,
          user_id:
            "user_id" in row ? ((row.user_id as string | null) ?? null) : null,
          created_by:
            "created_by" in row
              ? ((row.created_by as string | null) ?? null)
              : null,
        })),
      };
    },
    [`user-projects`, workspaceId, userId, isAdmin ? "admin" : "member"],
    {
      revalidate: 300,
      tags: [`user-projects-${userId}`, `workspace-projects-${workspaceId}`],
    },
  )();
}
