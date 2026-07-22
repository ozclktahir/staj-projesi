import { cookies } from "next/headers";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type {
  DashboardProject,
  DashboardTaskStats,
  ProjectTask,
  TaskAssignee,
  TaskPriority,
  TaskStatus,
} from "@/lib/supabase/types";
import {
  formatPersonName,
  formatUserCompact,
  PROFILE_SELECT_FIELDS,
  PROFILE_SELECT_FIELDS_FALLBACK,
} from "@/lib/member-labels";
import {
  getMemberVisibleProjectIds,
  resolveWorkspaceRole,
} from "@/lib/workspace-permissions";
import { normalizeTaskStatusInput } from "@/lib/supabase/types";

export type {
  DashboardProject,
  DashboardTaskStats,
  ProjectTask,
} from "@/lib/supabase/types";

const ACCESS_TOKEN_COOKIE = "sb_access_token";
const REFRESH_TOKEN_COOKIE = "sb_refresh_token";

function getSupabaseEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.error(
      "[supabase] NEXT_PUBLIC_SUPABASE_URL veya NEXT_PUBLIC_SUPABASE_ANON_KEY tanımlı değil.",
    );
    return null;
  }

  return { url, anonKey };
}

function createAuthedClient(accessToken?: string | null): SupabaseClient | null {
  const env = getSupabaseEnv();
  if (!env) {
    return null;
  }

  return createClient(env.url, env.anonKey, {
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Cookie'den access token oku ve kullanıcıyı doğrula.
 * @supabase/ssr cookie chunk'larına dokunmuyoruz (Internal Server Error kaynağı olabiliyor).
 */
export async function getAuthenticatedUser(): Promise<{
  supabase: SupabaseClient;
  user: User;
  accessToken: string;
} | null> {
  try {
    const cookieStore = await cookies();
    const accessToken =
      cookieStore.get(ACCESS_TOKEN_COOKIE)?.value?.trim() ||
      cookieStore.get("access_token")?.value?.trim() ||
      null;

    if (!accessToken) {
      return null;
    }

    const supabase = createAuthedClient(accessToken);
    if (!supabase) {
      return null;
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      console.error(
        "[getAuthenticatedUser] getUser failed:",
        error?.message ?? "user null",
      );
      return null;
    }

    return { supabase, user, accessToken };
  } catch (error) {
    console.error("[getAuthenticatedUser] unexpected:", error);
    return null;
  }
}

/** Geriye dönük uyumluluk — SSR cookie client kullanmadan Bearer client döner. */
export async function createSupabaseServerClient(): Promise<SupabaseClient | null> {
  const auth = await getAuthenticatedUser();
  if (auth) {
    return auth.supabase;
  }
  return createAuthedClient();
}

function resolveUserName(user: User, profile?: Record<string, unknown> | null): string {
  const meta = user.user_metadata as
    | {
        first_name?: string;
        last_name?: string;
        full_name?: string;
        display_name?: string;
      }
    | undefined;

  // Profil boşsa auth metadata ile doldur (eski test hesapları)
  const merged: Record<string, unknown> = {
    ...(profile ?? {}),
    full_name:
      (typeof profile?.full_name === "string" && profile.full_name.trim()) ||
      meta?.full_name ||
      null,
    display_name:
      (typeof profile?.display_name === "string" && profile.display_name.trim()) ||
      meta?.display_name ||
      null,
    first_name:
      (typeof profile?.first_name === "string" && profile.first_name.trim()) ||
      meta?.first_name ||
      null,
    last_name:
      (typeof profile?.last_name === "string" && profile.last_name.trim()) ||
      meta?.last_name ||
      null,
    email:
      (typeof profile?.email === "string" && profile.email.trim()) ||
      user.email ||
      null,
  };

  return formatUserCompact(merged, user.email);
}

export async function getCurrentUserProjects(
  workspaceId?: string | null,
): Promise<{
  userName: string;
  projects: DashboardProject[];
}> {
  try {
    const auth = await getAuthenticatedUser();

    if (!auth) {
      return { userName: "", projects: [] };
    }

    const { supabase, user } = auth;

    let profile: Record<string, unknown> | null = null;
    {
      const { data } = await supabase
        .from("profiles")
        .select(PROFILE_SELECT_FIELDS)
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        profile = data as Record<string, unknown>;
      } else {
        const { data: fallback } = await supabase
          .from("profiles")
          .select(PROFILE_SELECT_FIELDS_FALLBACK)
          .eq("id", user.id)
          .maybeSingle();
        profile = (fallback as Record<string, unknown> | null) ?? null;
      }
    }

    const userName = resolveUserName(user, profile);

    // full_name boşsa metadata'dan profiles'a geri yaz (eski test kullanıcıları)
    try {
      const meta = user.user_metadata as
        | { full_name?: string; first_name?: string; last_name?: string }
        | undefined;
      const profileFull =
        typeof profile?.full_name === "string" ? profile.full_name.trim() : "";
      const metaFull =
        meta?.full_name?.trim() ||
        `${meta?.first_name ?? ""} ${meta?.last_name ?? ""}`.trim();
      if (!profileFull && metaFull) {
        await supabase.from("profiles").upsert({
          id: user.id,
          email: user.email ?? null,
          full_name: metaFull,
          first_name: meta?.first_name?.trim() || null,
          last_name: meta?.last_name?.trim() || null,
        });
      } else if (!profileFull && user.email) {
        const local = user.email.split("@")[0]?.trim();
        if (local) {
          await supabase.from("profiles").upsert({
            id: user.id,
            email: user.email,
            full_name: local,
          });
        }
      }
    } catch (syncError) {
      console.warn("[getCurrentUserProjects] profile sync:", syncError);
    }

    const cookieStore = await cookies();
    const activeWorkspaceId =
      workspaceId?.trim() ||
      cookieStore.get("active_workspace_id")?.value?.trim() ||
      null;

    if (!activeWorkspaceId) {
      return { userName, projects: [] };
    }

    // Sahipsiz (workspace_id NULL) eski projeleri varsayılan/ilk workspace'e bağla
    try {
      const { data: memberships } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .limit(20);

      const memberIds = (memberships ?? [])
        .map((row) => row.workspace_id as string | undefined)
        .filter((id): id is string => Boolean(id));
      const defaultWorkspaceId = memberIds[0] ?? activeWorkspaceId;

      if (defaultWorkspaceId) {
        await supabase
          .from("projects")
          .update({ workspace_id: defaultWorkspaceId })
          .is("workspace_id", null)
          .or(`created_by.eq.${user.id},user_id.eq.${user.id}`);
      }
    } catch (backfillError) {
      console.warn("[getCurrentUserProjects] orphan backfill:", backfillError);
    }

    // SADECE aktif workspace_id ile filtrele (RLS ek erişim kontrolü sağlar)
    const selectCols =
      "id, name, description, created_at, updated_at, workspace_id, user_id, created_by";

    let { data, error } = await supabase
      .from("projects")
      .select(selectCols)
      .eq("workspace_id", activeWorkspaceId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error?.message?.includes("deleted_at")) {
      ({ data, error } = await supabase
        .from("projects")
        .select(selectCols)
        .eq("workspace_id", activeWorkspaceId)
        .order("created_at", { ascending: false }));
    }

    if (error?.message?.includes("updated_at")) {
      ({ data, error } = await supabase
        .from("projects")
        .select(
          "id, name, description, created_at, workspace_id, user_id, created_by",
        )
        .eq("workspace_id", activeWorkspaceId)
        .order("created_at", { ascending: false }));
    }

    if (error) {
      console.error("[getCurrentUserProjects] query:", error.message);
      return { userName, projects: [] };
    }

    // Fallback: bu workspace'te kayıt yoksa, sahipsiz kalanları da göster
    let rows = data ?? [];
    if (rows.length === 0) {
      const orphans = await supabase
        .from("projects")
        .select(
          "id, name, description, created_at, updated_at, workspace_id, user_id, created_by",
        )
        .is("workspace_id", null)
        .or(`created_by.eq.${user.id},user_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (!orphans.error && orphans.data?.length) {
        rows = orphans.data;
      }
    }

    // MEMBER: atanmış görevlerin projeleri + assigned_to projeleri
    const roleCtx = await resolveWorkspaceRole(
      supabase,
      activeWorkspaceId,
      user.id,
    );
    if (!roleCtx.isAdmin) {
      const visibleIds = await getMemberVisibleProjectIds(
        supabase,
        activeWorkspaceId,
        user.id,
      );

      if (visibleIds.length === 0) {
        console.warn(
          "[getCurrentUserProjects] member has no visible project ids",
          { userId: user.id, workspaceId: activeWorkspaceId },
        );
        return { userName, projects: [] };
      }

      const visible = new Set(visibleIds);
      let filtered = rows.filter((row) => visible.has(row.id as string));

      // RLS veya workspace filtresi yüzünden satır kaçtıysa ID ile yeniden çek
      const missing = visibleIds.filter(
        (id) => !filtered.some((row) => row.id === id),
      );
      if (missing.length > 0) {
        const byIds = await supabase
          .from("projects")
          .select(
            "id, name, description, created_at, updated_at, workspace_id, user_id, created_by",
          )
          .in("id", missing);
        if (!byIds.error && byIds.data?.length) {
          filtered = [...filtered, ...byIds.data];
        } else if (byIds.error) {
          console.warn(
            "[getCurrentUserProjects] member project fallback:",
            byIds.error.message,
          );
        }
      }

      rows = filtered;
      console.log("[getCurrentUserProjects] member filtered", {
        visibleCount: visibleIds.length,
        returned: rows.length,
      });
    }

    return {
      userName,
      projects: rows.map((row) => ({
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
  } catch (error) {
    console.error("[getCurrentUserProjects]", error);
    return { userName: "", projects: [] };
  }
}

export async function getDashboardTaskStats(
  projectIds: string[],
): Promise<DashboardTaskStats> {
  const empty = { total: 0, inProgress: 0, done: 0 };
  try {
    if (!projectIds.length) {
      return empty;
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return empty;
    }

    let { data, error } = await auth.supabase
      .from("tasks")
      .select("id, status, project_id")
      .in("project_id", projectIds)
      .is("deleted_at", null);

    if (error?.message?.includes("deleted_at")) {
      ({ data, error } = await auth.supabase
        .from("tasks")
        .select("id, status, project_id")
        .in("project_id", projectIds));
    }

    if (error || !data) {
      console.error("[getDashboardTaskStats]", error?.message);
      return empty;
    }

    let inProgress = 0;
    let done = 0;
    for (const row of data) {
      if (row.status === "IN_PROGRESS") inProgress += 1;
      if (row.status === "DONE") done += 1;
    }

    return { total: data.length, inProgress, done };
  } catch (error) {
    console.error("[getDashboardTaskStats]", error);
    return empty;
  }
}

export async function getProjectById(
  projectId: string,
): Promise<DashboardProject | null> {
  try {
    if (!projectId?.trim()) {
      return null;
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return null;
    }

    const { supabase, user } = auth;

    // projects sahiplik sütunu: user_id (owner_id değil)
    let { data, error } = await supabase
      .from("projects")
      .select(
        "id, name, description, created_at, created_by, user_id, workspace_id",
      )
      .eq("id", projectId)
      .is("deleted_at", null)
      .maybeSingle();

    if (
      error?.message?.includes("user_id") ||
      error?.message?.includes("workspace_id") ||
      error?.message?.includes("deleted_at")
    ) {
      ({ data, error } = await supabase
        .from("projects")
        .select("id, name, description, created_at, created_by, user_id, workspace_id")
        .eq("id", projectId)
        .maybeSingle());
    }

    if (error || !data) {
      return null;
    }

    const ownedByUser =
      ("user_id" in data && data.user_id === user.id) ||
      data.created_by === user.id;

    const workspaceId =
      "workspace_id" in data
        ? ((data.workspace_id as string | null) ?? null)
        : null;

    // Admin / owner: her zaman erişim
    // Member: workspace üyesi VE (proje sahibi VEYA atanmış görevi var VEYA project.assigned_to)
    let allowed = ownedByUser;
    if (!allowed && workspaceId) {
      const roleCtx = await resolveWorkspaceRole(
        supabase,
        workspaceId,
        user.id,
      );
      if (roleCtx.isAdmin) {
        allowed = true;
      } else if (roleCtx.role) {
        const visibleIds = await getMemberVisibleProjectIds(
          supabase,
          workspaceId,
          user.id,
        );
        allowed = visibleIds.includes(data.id as string);
      }
    }

    if (!allowed) {
      console.warn("[getProjectById] access denied", {
        projectId,
        userId: user.id,
      });
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      created_at: data.created_at,
      workspace_id: workspaceId,
    };
  } catch (error) {
    console.error("[getProjectById]", error);
    return null;
  }
}

function mapProfileToAssignee(
  id: string,
  profile: Record<string, unknown> | null | undefined,
): TaskAssignee {
  const email =
    (profile && typeof profile.email === "string" && profile.email.trim()) ||
    null;

  // Kartta gerçek ad: "Ali" / "Ali Yılmaz"
  const displayName = formatPersonName(profile, email) || formatUserCompact(profile, email);

  const parts = displayName.split(/\s+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase()
      : displayName.slice(0, 2).toUpperCase() || "?";

  const avatarUrl =
    (profile && typeof profile.avatar_url === "string" && profile.avatar_url) ||
    (profile && typeof profile.avatar === "string" && profile.avatar) ||
    null;

  return { id, displayName, email, avatarUrl, initials };
}

async function enrichTasksWithAssignees(
  supabase: SupabaseClient,
  tasks: ProjectTask[],
): Promise<ProjectTask[]> {
  const assigneeIds = [
    ...new Set(
      tasks
        .map((t) => t.assignee_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  if (assigneeIds.length === 0) {
    return tasks.map((t) => ({ ...t, assignee: null }));
  }

  const profileById = new Map<string, Record<string, unknown>>();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT_FIELDS)
    .in("id", assigneeIds);

  if (error) {
    console.warn("[enrichTasksWithAssignees] profiles:", error.message);
    const { data: fallback } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT_FIELDS_FALLBACK)
      .in("id", assigneeIds);
    for (const p of fallback ?? []) {
      if (p && typeof p === "object" && "id" in p) {
        profileById.set(
          String((p as { id: string }).id),
          p as Record<string, unknown>,
        );
      }
    }
  } else {
    for (const p of profiles ?? []) {
      if (p && typeof p === "object" && "id" in p) {
        profileById.set(
          String((p as { id: string }).id),
          p as Record<string, unknown>,
        );
      }
    }
  }

  console.info("[enrichTasksWithAssignees]", {
    assigneeIds,
    found: Array.from(profileById.keys()),
    names: Array.from(profileById.entries()).map(([id, p]) => ({
      id,
      name: formatPersonName(p, null),
    })),
  });

  return tasks.map((task) => {
    if (!task.assignee_id) {
      return { ...task, assignee: null };
    }
    return {
      ...task,
      assignee: mapProfileToAssignee(
        task.assignee_id,
        profileById.get(task.assignee_id) ?? null,
      ),
    };
  });
}

function normalizeTaskStatus(status: unknown): TaskStatus {
  if (typeof status !== "string") return "TODO";
  const s = status.toUpperCase();
  if (s === "IN_PROGRESS" || s === "INPROGRESS" || s === "DEVAM_EDIYOR") {
    return "IN_PROGRESS";
  }
  if (s === "DONE" || s === "COMPLETED" || s === "TAMAMLANDI") return "DONE";
  return "TODO";
}

function normalizeTaskPriority(priority: unknown): TaskPriority {
  if (typeof priority !== "string") return "MEDIUM";
  const p = priority.toUpperCase();
  if (p === "HIGH" || p === "YUKSEK") return "HIGH";
  if (p === "LOW" || p === "DUSUK") return "LOW";
  return "MEDIUM";
}

export async function getProjectTasks(
  projectId: string,
  workspaceId?: string | null,
): Promise<ProjectTask[]> {
  try {
    if (!projectId?.trim()) {
      return [];
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return [];
    }

    const { supabase, user } = auth;
    const activeWorkspaceId = workspaceId?.trim() || null;

    let isAdmin = false;
    if (activeWorkspaceId) {
      const roleCtx = await resolveWorkspaceRole(
        supabase,
        activeWorkspaceId,
        user.id,
      );
      isAdmin = roleCtx.isAdmin;
    } else {
      // workspaceId yoksa proje üzerinden çöz
      const { data: proj } = await supabase
        .from("projects")
        .select("workspace_id")
        .eq("id", projectId)
        .maybeSingle();
      if (typeof proj?.workspace_id === "string") {
        const roleCtx = await resolveWorkspaceRole(
          supabase,
          proj.workspace_id,
          user.id,
        );
        isAdmin = roleCtx.isAdmin;
      }
    }

    const selectFull =
      "id, title, description, status, priority, project_id, workspace_id, due_date, parent_task_id, created_at, created_by, assignee_id, assigned_to, assignee:profiles!assignee_id(*)";
    const selectFullNoJoin =
      "id, title, description, status, priority, project_id, workspace_id, due_date, parent_task_id, created_at, created_by, assignee_id, assigned_to";

    async function fetchTasks(opts: {
      withWorkspace: boolean;
      assigneeOnly: boolean;
      columns: string;
    }) {
      let q = supabase
        .from("tasks")
        .select(opts.columns)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (opts.withWorkspace && activeWorkspaceId) {
        q = q.eq("workspace_id", activeWorkspaceId);
      }
      if (opts.assigneeOnly) {
        q = q.eq("assignee_id", user.id);
      }
      return q;
    }

    let rows: Record<string, unknown>[] | null = null;
    let error: { message: string } | null = null;

    if (isAdmin) {
      const primary = await supabase
        .from("tasks")
        .select(selectFull)
        .eq("project_id", projectId)
        .is("deleted_at", null)
        .is("parent_task_id", null)
        .order("created_at", { ascending: false });
      rows = (primary.data as Record<string, unknown>[] | null) ?? null;
      error = primary.error;
      if (
        error?.message?.includes("profiles") ||
        error?.message?.includes("assignee") ||
        error?.message?.includes("relationship") ||
        error?.message?.includes("deleted_at") ||
        error?.message?.includes("parent_task_id") ||
        error?.message?.includes("due_date")
      ) {
        const fb = await supabase
          .from("tasks")
          .select(selectFullNoJoin)
          .eq("project_id", projectId)
          .order("created_at", { ascending: false });
        rows = (fb.data as Record<string, unknown>[] | null) ?? null;
        error = fb.error;
      }
    } else {
      // MEMBER: assignee_id == user.id
      const attempts = [
        () =>
          supabase
            .from("tasks")
            .select(selectFull)
            .eq("project_id", projectId)
            .eq("assignee_id", user.id)
            .order("created_at", { ascending: false }),
        () =>
          supabase
            .from("tasks")
            .select(selectFullNoJoin)
            .eq("project_id", projectId)
            .eq("assignee_id", user.id)
            .order("created_at", { ascending: false }),
        () =>
          supabase
            .from("tasks")
            .select(selectFullNoJoin)
            .eq("project_id", projectId)
            .eq("assigned_to", user.id)
            .order("created_at", { ascending: false }),
      ];

      for (const attempt of attempts) {
        const result = await attempt();
        if (result.error) {
          console.warn("[getProjectTasks] member attempt:", result.error.message);
          error = result.error;
          continue;
        }
        rows = (result.data as Record<string, unknown>[] | null) ?? null;
        error = null;
        if (rows && rows.length > 0) break;
      }
    }

    if (error && (!rows || rows.length === 0)) {
      console.error("[getProjectTasks]", error.message);
      return [];
    }

    let topLevel = (rows ?? []).filter((row) => {
      if (!("parent_task_id" in row)) return true;
      return row.parent_task_id == null;
    });

    // MEMBER güvenlik ağı
    if (!isAdmin) {
      topLevel = topLevel.filter((row) => {
        const assignee =
          (typeof row.assignee_id === "string" && row.assignee_id) ||
          (typeof row.assigned_to === "string" && row.assigned_to) ||
          null;
        return assignee === user.id;
      });
    }

    console.log("[getProjectTasks]", {
      projectId,
      isAdmin,
      count: topLevel.length,
      userId: user.id,
    });

    const tasks: ProjectTask[] = topLevel.map((row) => {
      const assigneeId =
        "assignee_id" in row
          ? ((row.assignee_id as string | null) ?? null)
          : "assigned_to" in row
            ? ((row.assigned_to as string | null) ?? null)
            : null;

      let assignee: TaskAssignee | null = null;
      const joined = row.assignee;
      if (assigneeId && joined && typeof joined === "object" && !Array.isArray(joined)) {
        assignee = mapProfileToAssignee(
          assigneeId,
          joined as Record<string, unknown>,
        );
      } else if (
        assigneeId &&
        Array.isArray(joined) &&
        joined[0] &&
        typeof joined[0] === "object"
      ) {
        assignee = mapProfileToAssignee(
          assigneeId,
          joined[0] as Record<string, unknown>,
        );
      }

      return {
        id: row.id as string,
        title: (row.title as string) ?? "Adsız görev",
        description: (row.description as string | null) ?? null,
        status: normalizeTaskStatus(row.status),
        priority: normalizeTaskPriority(row.priority),
        project_id: (row.project_id as string | null) ?? null,
        workspace_id: (row.workspace_id as string | null) ?? null,
        due_date:
          "due_date" in row ? ((row.due_date as string | null) ?? null) : null,
        parent_task_id:
          "parent_task_id" in row
            ? ((row.parent_task_id as string | null) ?? null)
            : null,
        assignee_id: assigneeId,
        assignee,
        created_at: (row.created_at as string | null) ?? null,
        created_by: (row.created_by as string | null) ?? null,
        subtask_done: 0,
        subtask_total: 0,
      };
    });

    // Her zaman profiles'tan atanan kişi adını zenginleştir (Ali / Ali Yılmaz)
    const enriched = await enrichTasksWithAssignees(supabase, tasks);

    const parentIds = enriched.map((t) => t.id);
    if (parentIds.length === 0) return enriched;

    const { data: children, error: childError } = await supabase
      .from("tasks")
      .select("parent_task_id, status")
      .in("parent_task_id", parentIds)
      .is("deleted_at", null);

    if (childError?.message?.includes("deleted_at")) {
      const fallbackChildren = await supabase
        .from("tasks")
        .select("parent_task_id, status")
        .in("parent_task_id", parentIds);
      if (!fallbackChildren.error && fallbackChildren.data) {
        applySubtaskCounts(enriched, fallbackChildren.data);
      }
    } else if (!childError && children) {
      applySubtaskCounts(enriched, children);
    }

    return enriched;
  } catch (error) {
    console.error("[getProjectTasks]", error);
    return [];
  }
}

function applySubtaskCounts(
  tasks: ProjectTask[],
  children: { parent_task_id: unknown; status: unknown }[],
) {
  const totals = new Map<string, { done: number; total: number }>();
  for (const child of children) {
    const pid =
      typeof child.parent_task_id === "string" ? child.parent_task_id : null;
    if (!pid) continue;
    const entry = totals.get(pid) ?? { done: 0, total: 0 };
    entry.total += 1;
    if (normalizeTaskStatus(child.status) === "DONE") entry.done += 1;
    totals.set(pid, entry);
  }
  for (const task of tasks) {
    const entry = totals.get(task.id);
    if (entry) {
      task.subtask_done = entry.done;
      task.subtask_total = entry.total;
    }
  }
}

export { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE };
