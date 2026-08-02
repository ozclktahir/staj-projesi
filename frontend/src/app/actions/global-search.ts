"use server";

import { getAuthenticatedUser } from "@/lib/supabase/server";
import { resolveWorkspaceRole } from "@/lib/workspace-permissions";

export type GlobalSearchHit = {
  id: string;
  type: "project" | "task" | "member";
  title: string;
  subtitle?: string | null;
  href: string;
};

export type GlobalSearchResult =
  | { success: true; hits: GlobalSearchHit[] }
  | { success: false; error: string; hits: [] };

export async function globalSearch(params: {
  workspaceId: string;
  query: string;
}): Promise<GlobalSearchResult> {
  try {
    const workspaceId = params.workspaceId?.trim() ?? "";
    const q = params.query?.trim() ?? "";
    if (!workspaceId) {
      return { success: false, error: "Workspace gerekli.", hits: [] };
    }
    if (q.length < 1) {
      return { success: true, hits: [] };
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return { success: false, error: "Oturum bulunamadı.", hits: [] };
    }

    const { supabase, user } = auth;
    const roleCtx = await resolveWorkspaceRole(supabase, workspaceId, user.id);
    if (!roleCtx.isAdmin && !roleCtx.role) {
      return { success: false, error: "Yetkisiz.", hits: [] };
    }

    const like = `%${q}%`;
    const hits: GlobalSearchHit[] = [];

    const [projectsRes, tasksRes, membersRes] = await Promise.all([
      supabase
        .from("projects")
        .select("id, name, description")
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .ilike("name", like)
        .limit(8),
      supabase
        .from("tasks")
        .select("id, title, project_id, status")
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .ilike("title", like)
        .limit(10),
      supabase
        .from("workspace_members")
        .select("user_id, role, profiles:user_id(id, email, full_name)")
        .eq("workspace_id", workspaceId)
        .limit(40),
    ]);

    for (const row of projectsRes.data ?? []) {
      hits.push({
        id: row.id as string,
        type: "project",
        title: String(row.name ?? "Proje"),
        subtitle: (row.description as string | null) ?? null,
        href: `/project/${row.id}`,
      });
    }

    for (const row of tasksRes.data ?? []) {
      const projectId = row.project_id as string | null;
      hits.push({
        id: row.id as string,
        type: "task",
        title: String(row.title ?? "Görev"),
        subtitle: String(row.status ?? ""),
        href: projectId
          ? `/project/${projectId}?taskId=${row.id}`
          : `/projects`,
      });
    }

    const qLower = q.toLowerCase();
    for (const row of membersRes.data ?? []) {
      const profile = row.profiles as
        | { id?: string; email?: string | null; full_name?: string | null }
        | { id?: string; email?: string | null; full_name?: string | null }[]
        | null;
      const p = Array.isArray(profile) ? profile[0] : profile;
      const name = (p?.full_name ?? p?.email ?? row.user_id ?? "").toString();
      const email = (p?.email ?? "").toString();
      if (
        !name.toLowerCase().includes(qLower) &&
        !email.toLowerCase().includes(qLower)
      ) {
        continue;
      }
      hits.push({
        id: String(row.user_id),
        type: "member",
        title: name || email || "Üye",
        subtitle: row.role ? String(row.role) : null,
        href: `/members`,
      });
      if (hits.filter((h) => h.type === "member").length >= 8) break;
    }

    return { success: true, hits };
  } catch (error) {
    console.error("[globalSearch]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Arama başarısız.",
      hits: [],
    };
  }
}
