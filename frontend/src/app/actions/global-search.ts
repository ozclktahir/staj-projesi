"use server";

import { loadProfilesByIds, resolveMemberDisplayFields } from "@/lib/member-labels";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { resolveWorkspaceRole } from "@/lib/workspace-permissions";

export type GlobalSearchHit = {
  id: string;
  type: "project" | "task" | "member" | "note" | "todo";
  title: string;
  subtitle?: string | null;
  href: string;
};

export type GlobalSearchResult =
  | { success: true; hits: GlobalSearchHit[] }
  | { success: false; error: string; hits: [] };

/** PostgREST `or=` filtresinde virgül/parantez ayırıcı olduğu için temizlenir. */
function sanitizeForOr(value: string): string {
  return value.replace(/[(),]/g, " ").trim();
}

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
    const orLike = `%${sanitizeForOr(q)}%`;
    const hits: GlobalSearchHit[] = [];

    const [
      projectsRes,
      tasksRes,
      memberRowsRes,
      ownerRes,
      notesRes,
      todosRes,
    ] = await Promise.all([
      // Proje: ad VE açıklama üzerinde ara
      supabase
        .from("projects")
        .select("id, name, description")
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .or(`name.ilike.${orLike},description.ilike.${orLike}`)
        .limit(8),
      // Görev: başlık VE açıklama üzerinde ara (RLS görünürlüğü sınırlar)
      supabase
        .from("tasks")
        .select("id, title, description, project_id, status")
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .or(`title.ilike.${orLike},description.ilike.${orLike}`)
        .limit(10),
      // NOT: `profiles:user_id(...)` embed'i şemada FK ilişkisi olmadığı için
      // PGRST200 ile HER ZAMAN hata veriyordu → üye araması hiç sonuç
      // döndürmüyordu. Profilleri ayrı sorguyla (loadProfilesByIds) çekiyoruz.
      supabase
        .from("workspace_members")
        .select("user_id, role")
        .eq("workspace_id", workspaceId)
        .limit(100),
      // Workspace sahibi workspace_members'ta olmayabilir — ayrıca ekle
      supabase
        .from("workspaces")
        .select("owner_id")
        .eq("id", workspaceId)
        .maybeSingle(),
      // Kişisel notlar (yalnızca kendi kayıtları — RLS zaten sınırlar)
      supabase
        .from("personal_notes")
        .select("id, title, content")
        .eq("user_id", user.id)
        .or(`title.ilike.${orLike},content.ilike.${orLike}`)
        .limit(6),
      // Kişisel görevler (todo)
      supabase
        .from("personal_todos")
        .select("id, task, is_completed")
        .eq("user_id", user.id)
        .ilike("task", like)
        .limit(6),
    ]);

    if (projectsRes.error) {
      console.warn("[globalSearch] projects:", projectsRes.error.message);
    }
    if (tasksRes.error) {
      console.warn("[globalSearch] tasks:", tasksRes.error.message);
    }

    for (const row of projectsRes.data ?? []) {
      hits.push({
        id: row.id as string,
        type: "project",
        title: String(row.name ?? "Proje"),
        subtitle: (row.description as string | null) ?? null,
        href: `/project/${row.id}?workspaceId=${encodeURIComponent(workspaceId)}`,
      });
    }

    for (const row of tasksRes.data ?? []) {
      const projectId = row.project_id as string | null;
      hits.push({
        id: row.id as string,
        type: "task",
        title: String(row.title ?? "Görev"),
        subtitle: String(row.status ?? ""),
        // taskId → proje panosu görev detay panelini otomatik açar
        href: projectId
          ? `/project/${projectId}?workspaceId=${encodeURIComponent(workspaceId)}&taskId=${row.id}`
          : `/projects?workspaceId=${encodeURIComponent(workspaceId)}`,
      });
    }

    // ── Üyeler ──
    const memberRows = memberRowsRes.data ?? [];
    const roleByUserId = new Map<string, string | null>();
    for (const row of memberRows) {
      if (typeof row.user_id === "string") {
        roleByUserId.set(row.user_id, (row.role as string | null) ?? null);
      }
    }
    const ownerId =
      typeof ownerRes.data?.owner_id === "string"
        ? ownerRes.data.owner_id
        : null;
    if (ownerId && !roleByUserId.has(ownerId)) {
      roleByUserId.set(ownerId, "OWNER");
    }

    if (memberRowsRes.error) {
      console.warn(
        "[globalSearch] workspace_members:",
        memberRowsRes.error.message,
      );
    }

    const memberIds = [...roleByUserId.keys()];
    if (memberIds.length > 0) {
      const profileById = await loadProfilesByIds(supabase, memberIds);
      const qLower = q.toLocaleLowerCase("tr-TR");
      let memberHits = 0;

      for (const uid of memberIds) {
        if (memberHits >= 8) break;
        const profile = profileById.get(uid) ?? null;
        const fields = resolveMemberDisplayFields(profile, null);
        const name = (fields.fullName || fields.displayName || "").toString();
        const email = (fields.email ?? "").toString();
        if (
          !name.toLocaleLowerCase("tr-TR").includes(qLower) &&
          !email.toLocaleLowerCase("tr-TR").includes(qLower)
        ) {
          continue;
        }
        hits.push({
          id: uid,
          type: "member",
          title: name || email || "Üye",
          subtitle: roleByUserId.get(uid) ?? null,
          href: `/members?workspaceId=${encodeURIComponent(workspaceId)}`,
        });
        memberHits++;
      }
    }

    // ── Kişisel notlar / görevler ──
    for (const row of notesRes.data ?? []) {
      const content = (row.content as string | null) ?? null;
      hits.push({
        id: String(row.id),
        type: "note",
        title: String(row.title ?? "Not"),
        subtitle: content ? content.slice(0, 60) : null,
        href: "/personal",
      });
    }

    for (const row of todosRes.data ?? []) {
      hits.push({
        id: String(row.id),
        type: "todo",
        title: String(row.task ?? "Görev"),
        subtitle: row.is_completed ? "Tamamlandı" : null,
        href: "/personal",
      });
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
